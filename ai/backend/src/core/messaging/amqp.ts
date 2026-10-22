import logger from "@core/lib/logger.js";
import amqp, { type Channel, type ChannelModel } from "amqplib";

const PIPELINE_EXCHANGE = 'pipeline';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

/**
 * Opens a connection to the RabbitMQ server and creates a channel.
 * If a connection is already open, it does nothing.
 */
async function connect() {
  if (channel) return; // already connected

  const connectionUrl = process.env.RABBITMQ_URL;
  if (!connectionUrl) {
    throw new Error("RABBITMQ_URL environment variable is not defined");
  }

  connection = await amqp.connect(connectionUrl);
  channel = await connection.createChannel();
  await channel.assertExchange(PIPELINE_EXCHANGE, 'topic', { durable: true });
  logger.info("[AMQP] Connected");
}

/**
 * Closes the connection to the RabbitMQ server and the channel.
 */
async function close() {
  await channel?.close();
  await connection?.close();
  channel = null;
  connection = null;
  logger.info("[AMQP] Connection closed");
}

/**
 * Returns the AMQP channel.
 * @returns The AMQP channel.
 */
function getChannel(): Channel {
  if (!channel) throw new Error("[AMQP] Not connected: call connect() first");
  return channel;
}

/**
 * Publishes an event on the pipeline exchange.
 * @param routingKey The routing key of the event (e.g. "prompt.failed").
 * @param message The message to publish.
 */
function publishMessage(routingKey: string, message: string) {
  const channel = getChannel();
  channel.publish(PIPELINE_EXCHANGE, routingKey, Buffer.from(message), { persistent: true, contentType: 'application/json' });
}

/**
 * Sends a message to the specified queue.
 * @param queue The name of the queue to send the message to.
 * @param message The message to send.
 */
function sendMessage(queue: string, message: string) {
  const channel = getChannel();
  channel.assertQueue(queue, { durable: true }); // assert the queue exists, if not it will be created
  channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
}

/**
 * Reads a message from the specified queue.
 * @param settings.queue The name of the queue to read from.
 * @param settings.exchange The exchange to bind the queue to.
 * @param settings.binding The binding key used to bind the queue to the exchange.
 * @param callback The function to call when a message is received. It also receives the routing key
 * the message was published with (e.g. "audio.processed"), useful when the binding uses wildcards.
 */
function readMessage(
  settings: { queue: string; exchange?: string; binding?: string },
  callback: (msg: string, routingKey: string) => Promise<void> | void
) {

  const { queue, exchange, binding } = settings;

  const channel = getChannel();
  channel.assertQueue(queue, { durable: true }); // assert the queue exists, if not it will be created

  if(exchange && binding) {
    channel.assertExchange(exchange, 'topic', { durable: true }); // assert the exchange exists, if not it will be created
    channel.bindQueue(queue, exchange, binding); // bind the queue to the exchange
  }

  channel.consume(queue, async (msg) => {
    if(msg === null) return; // no message received, just return

    try {
      await callback(msg.content.toString(), msg.fields.routingKey);
      channel.ack(msg);
    } catch (error) {
      logger.error(`[AMQP] Error handling message from "${queue}": ${error}`);
      channel.nack(msg, false, false); // no requeue: a message that always fails would loop forever
    }
  });
}

export { connect, close, publishMessage, sendMessage, readMessage };
