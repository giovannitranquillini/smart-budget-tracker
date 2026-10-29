import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { publishMessage, readMessage, sendMessage } from '@core/messaging/amqp.js';
import { registerConsumers } from '@core/messaging/consumers/index.js';

// BACKEND_URL is read when the module is imported, so it must be set before the imports
vi.hoisted(() => {
  process.env.BACKEND_URL = 'http://backend';
});

vi.mock('@core/messaging/amqp.js', () => ({
  readMessage: vi.fn(),
  sendMessage: vi.fn(),
  publishMessage: vi.fn(),
}));

// calls the callback that registerConsumers attached to the given queue
const handle = async (queue: string, msg: string) => {
  const call = vi.mocked(readMessage).mock.calls.find(([settings]) => settings.queue === queue);
  if (!call) throw new Error(`No consumer registered for ${queue}`);
  await call[1](msg, queue);
};

// returns the message sent to the given queue, parsed as JSON
const sentTo = (queue: string) => {
  const call = vi.mocked(sendMessage).mock.calls.find(([q]) => q === queue);
  if (!call) throw new Error(`Nothing sent to ${queue}`);
  return JSON.parse(call[1]) as { jobId: string; text: string; prompt: string };
};

describe('registerConsumers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerConsumers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards audio file paths to speech_to_text.processing', async () => {
    await handle('audio.processing', '/audio_files/a.wav');

    expect(sendMessage).toHaveBeenCalledWith('speech_to_text.processing', '/audio_files/a.wav');
  });

  it('forwards image file paths to ocr.processing', async () => {
    await handle('image.processing', '/image_files/a.jpg');

    expect(sendMessage).toHaveBeenCalledWith('ocr.processing', '/image_files/a.jpg');
  });

  it('builds the LLM prompt from the transcription', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([{ name: 'Groceries' }]));

    await handle('audio.processed', JSON.stringify({ jobId: 'job-1', text: ['spent', 'ten euros'] }));

    expect(fetchSpy).toHaveBeenCalledWith('http://backend/budget/category');
    const body = sentTo('llm.processing');
    expect(body.jobId).toBe('job-1');
    expect(body.text).toBe('spent ten euros');
    expect(body.prompt).toContain('Groceries');
  });

  it('builds the LLM prompt from the OCR text', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([{ name: 'Groceries' }]));

    await handle('ocr.processed', JSON.stringify({ jobId: 'job-2', text: 'TOTAL 12.50' }));

    const body = sentTo('llm.processing');
    expect(body.jobId).toBe('job-2');
    expect(body.text).toBe('TOTAL 12.50');
    expect(body.prompt).toContain('Groceries');
  });

  it('publishes prompt.failed when categories cannot be fetched', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

    await handle('audio.processed', JSON.stringify({ jobId: 'job-1', text: ['x'] }));

    expect(sendMessage).not.toHaveBeenCalled();
    expect(publishMessage).toHaveBeenCalledWith('prompt.failed', expect.stringContaining('HTTP 500'));
  });

  it('forwards the LLM output to budget_record.processed', async () => {
    await handle('llm.processed', '{"jobId":"job-1"}');

    expect(sendMessage).toHaveBeenCalledWith('budget_record.processed', '{"jobId":"job-1"}');
  });
});
