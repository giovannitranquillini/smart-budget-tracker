import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import amqp, { type ChannelModel, type ConsumeMessage } from 'amqplib';
import { close, connect, publishMessage, readMessage, sendMessage } from '@core/messaging/amqp.js';

vi.mock('amqplib', () => ({ default: { connect: vi.fn() } }));
vi.mock('@core/lib/logger.js', () => ({ default: { info: vi.fn(), error: vi.fn() } }));

// fake channel and connection: they only record how they are called
const channel = {
  assertExchange: vi.fn(),
  assertQueue: vi.fn(),
  bindQueue: vi.fn(),
  publish: vi.fn(),
  sendToQueue: vi.fn(),
  consume: vi.fn<(queue: string, onMessage: (msg: ConsumeMessage | null) => Promise<void>) => void>(),
  ack: vi.fn(),
  nack: vi.fn(),
  close: vi.fn(),
};
const connection = { createChannel: vi.fn().mockResolvedValue(channel), close: vi.fn() };

// builds a message like the ones RabbitMQ delivers to channel.consume
const fakeMessage = (content: string) =>
  ({ content: Buffer.from(content), fields: { routingKey: 'audio.processed' } }) as unknown as ConsumeMessage;

describe('amqp', () => {
  beforeEach(() => {
    vi.stubEnv('RABBITMQ_URL', 'amqp://test');
    vi.mocked(amqp.connect).mockResolvedValue(connection as unknown as ChannelModel);
  });

  afterEach(async () => {
    await close(); // channel and connection are module variables: reset them between tests
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('throws if RABBITMQ_URL is not defined', async () => {
    vi.stubEnv('RABBITMQ_URL', undefined);

    await expect(connect()).rejects.toThrow('RABBITMQ_URL');
  });

  it('connects only once', async () => {
    await connect();
    await connect();

    expect(amqp.connect).toHaveBeenCalledTimes(1);
  });

  it('throws if a message is sent before connecting', () => {
    expect(() => sendMessage('some.queue', 'hello')).toThrow('Not connected');
  });

  it('sends a persistent message to the queue', async () => {
    await connect();
    sendMessage('some.queue', 'hello');

    expect(channel.sendToQueue).toHaveBeenCalledWith('some.queue', Buffer.from('hello'), { persistent: true });
  });

  it('publishes on the pipeline exchange', async () => {
    await connect();
    publishMessage('prompt.failed', '{}');

    expect(channel.publish).toHaveBeenCalledWith('pipeline', 'prompt.failed', Buffer.from('{}'), {
      persistent: true,
      contentType: 'application/json',
    });
  });

  it('binds the queue only when exchange and binding are given', async () => {
    await connect();
    readMessage({ queue: 'a' }, vi.fn());
    readMessage({ queue: 'b', exchange: 'pipeline', binding: 'b.done' }, vi.fn());

    expect(channel.bindQueue).toHaveBeenCalledTimes(1);
    expect(channel.bindQueue).toHaveBeenCalledWith('b', 'pipeline', 'b.done');
  });

  it('acks the message when the callback succeeds', async () => {
    await connect();
    const callback = vi.fn();
    readMessage({ queue: 'a' }, callback);

    const onMessage = channel.consume.mock.calls[0][1];
    const msg = fakeMessage('hello');
    await onMessage(msg);

    expect(callback).toHaveBeenCalledWith('hello', 'audio.processed');
    expect(channel.ack).toHaveBeenCalledWith(msg);
  });

  it('nacks the message without requeue when the callback throws', async () => {
    await connect();
    readMessage({ queue: 'a' }, () => {
      throw new Error('boom');
    });

    const onMessage = channel.consume.mock.calls[0][1];
    const msg = fakeMessage('hello');
    await onMessage(msg);

    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
  });
});
