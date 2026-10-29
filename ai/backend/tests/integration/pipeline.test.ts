import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import amqp, { type Channel, type ChannelModel } from 'amqplib';
import { RabbitMQContainer, type StartedRabbitMQContainer } from '@testcontainers/rabbitmq';
import { close, connect } from '@core/messaging/amqp.js';
import { registerConsumers } from '@core/messaging/consumers/index.js';

// BACKEND_URL and LOG_LEVEL are read when the modules are imported, so they must be set before the imports
vi.hoisted(() => {
  process.env.BACKEND_URL = 'http://backend';
  process.env.LOG_LEVEL = 'silent';
});

const PIPELINE_EXCHANGE = 'pipeline';
const FAILED_QUEUE = 'test.failed'; // collects every *.failed event, like the backend does

// queues used by the pipeline, with the binding ai/backend uses for the ones fed by the exchange
const QUEUES: { queue: string; binding?: string }[] = [
  { queue: 'audio.processing' },
  { queue: 'speech_to_text.processing' },
  { queue: 'audio.processed', binding: 'audio.processed' },
  { queue: 'image.processing' },
  { queue: 'ocr.processing' },
  { queue: 'ocr.processed', binding: 'ocr.processed' },
  { queue: 'llm.processing' },
  { queue: 'llm.processed', binding: 'llm.processed' },
  { queue: 'budget_record.processed' },
  { queue: FAILED_QUEUE, binding: '*.failed' },
];

let container: StartedRabbitMQContainer;
let testConnection: ChannelModel;
let testChannel: Channel;

// resolves with the first message that arrives on the queue
function waitForMessage(queue: string, timeoutMs = 4_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No message on "${queue}" within ${timeoutMs}ms`)), timeoutMs);

    void testChannel.consume(queue, (msg) => {
      if (!msg) return;
      clearTimeout(timer);
      testChannel.ack(msg);
      // stop consuming before resolving, so no pending cancel is left when the connection closes
      testChannel.cancel(msg.fields.consumerTag).then(() => resolve(msg.content.toString()), reject);
    });
  });
}

// fake Python service: answers each request on `queue` by publishing `text` with `routingKey`, like
// speech-to-text and ocr do, without loading any model
async function fakeService(queue: string, routingKey: string, text: string | string[]) {
  await testChannel.consume(queue, (msg) => {
    if (!msg) return;
    const { jobId } = JSON.parse(msg.content.toString()) as { jobId: string; filePath: string };
    testChannel.publish(PIPELINE_EXCHANGE, routingKey, Buffer.from(JSON.stringify({ jobId, text })), {
      persistent: true,
      contentType: 'application/json',
    });
    testChannel.ack(msg);
  });
}

// sends a request to ai/backend, like the backend does
function requestProcessing(queue: string, jobId: string, filePath: string) {
  testChannel.sendToQueue(queue, Buffer.from(JSON.stringify({ jobId, filePath })), { persistent: true });
}

beforeAll(async () => {
  container = await new RabbitMQContainer('rabbitmq:4-management').start();
  process.env.RABBITMQ_URL = container.getAmqpUrl();

  testConnection = await amqp.connect(container.getAmqpUrl());
  testChannel = await testConnection.createChannel();
  await testChannel.prefetch(1);

  // declare queues and bindings up front, so no message is published before they exist
  await testChannel.assertExchange(PIPELINE_EXCHANGE, 'topic', { durable: true });
  for (const { queue, binding } of QUEUES) {
    await testChannel.assertQueue(queue, { durable: true });
    if (binding) await testChannel.bindQueue(queue, PIPELINE_EXCHANGE, binding);
  }

  // start ai/backend server
  await connect();
  registerConsumers();

  // mock AI service listening for new requests
  await fakeService('speech_to_text.processing', 'audio.processed', ['I spent', 'twelve euros']);
  await fakeService('ocr.processing', 'ocr.processed', 'TOTAL 12.50');

}, 120_000); // pulling and starting a container takes longer than the default 10s

beforeEach(async () => {
  for (const { queue } of QUEUES) {
    await testChannel.purgeQueue(queue);
  }
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(Response.json([{ name: 'Groceries' }])));
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await testConnection?.close();
  await close();
  await container?.stop();
}, 30_000);

describe('audio pipeline', () => {
  it('turns an audio request into an LLM prompt', async () => {
    const result = waitForMessage('llm.processing');

    requestProcessing('audio.processing', 'job-audio', '/audio_files/a.wav');

    const body = JSON.parse(await result) as { jobId: string; text: string; prompt: string };
    expect(body.jobId).toBe('job-audio');
    expect(body.text).toBe('I spent twelve euros');
    expect(body.prompt).toContain('Groceries');
  });

  it('publishes prompt.failed on the pipeline exchange when categories cannot be fetched', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(new Response(null, { status: 500 })));
    const failure = waitForMessage(FAILED_QUEUE);

    requestProcessing('audio.processing', 'job-audio-failed', '/audio_files/a.wav');

    const body = JSON.parse(await failure) as { jobId: string; error: string };
    expect(body.jobId).toBe('job-audio-failed');
    expect(body.error).toContain('HTTP 500');
  });
});

describe('image pipeline', () => {
  it('turns an image request into an LLM prompt', async () => {
    const result = waitForMessage('llm.processing');

    requestProcessing('image.processing', 'job-image', '/image_files/a.jpg');

    const body = JSON.parse(await result) as { jobId: string; text: string; prompt: string };
    expect(body.jobId).toBe('job-image');
    expect(body.text).toBe('TOTAL 12.50');
    expect(body.prompt).toContain('Groceries');
  });

  it('publishes prompt.failed on the pipeline exchange when categories cannot be fetched', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(new Response(null, { status: 500 })));
    const failure = waitForMessage(FAILED_QUEUE);

    requestProcessing('image.processing', 'job-image-failed', '/image_files/a.jpg');

    const body = JSON.parse(await failure) as { jobId: string; error: string };
    expect(body.jobId).toBe('job-image-failed');
    expect(body.error).toContain('HTTP 500');
  });
});

describe('llm pipeline', () => {
  it('forwards the LLM output to budget_record.processed', async () => {
    const result = waitForMessage('budget_record.processed');
    const llmOutput = {
      jobId: 'job-llm',
      jsonLlmOutput: { type: 'outcome', amount: 12, category: 'Groceries', description: 'Supermarket' },
    };

    // plays the Python LLM service, which publishes its output on the pipeline exchange
    testChannel.publish(PIPELINE_EXCHANGE, 'llm.processed', Buffer.from(JSON.stringify(llmOutput)), {
      persistent: true,
      contentType: 'application/json',
    });

    // the backend expects the LLM output under "budgetRecord"
    expect(JSON.parse(await result)).toEqual({ jobId: 'job-llm', budgetRecord: llmOutput.jsonLlmOutput });
  });
});
