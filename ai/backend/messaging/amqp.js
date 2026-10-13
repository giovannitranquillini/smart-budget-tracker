import amqp from "amqplib";

const connectionUrl = process.env.RABBITMQ_URL;

if(!connectionUrl) {
  throw new Error("RABBITMQ_URL environment variable is not set");
}

const connection = await amqp.connect(connectionUrl);

// create the channel over which we will send the message
const channel = await connection.createChannel();

await channel.assertExchange('pipeline', 'topic', { durable: true });

/**
 * Publishes an event on the pipeline exchange.
 * @param {string} routingKey
 * @param {string} message
 */
function publishMessage(routingKey, message) {
  channel.publish('pipeline', routingKey, Buffer.from(message), { persistent: true, contentType: 'application/json' });
}

/**
 * @param {string} queue
 * @param {string | Buffer} message
 */
function sendMessage(queue, message) {
  channel.assertQueue(queue, {
    durable: true
  });

  channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
  console.log(" [x] Sent %s", message);
}

/**
 * @param {{ queue: string, exchange?: string, binding?: string }} settings
 * @param {(message: string, routingKey: string) => Promise<void> | void} callback
 */
function readMessage(settings, callback) {
  const { queue, exchange, binding } = settings;

  channel.assertQueue(queue, {
    durable: true
  });

  if(exchange && binding) {
    channel.assertExchange(exchange, 'topic', { durable: true });
    channel.bindQueue(queue, exchange, binding);
  }

  channel.consume(queue, async (msg) => {
    if(msg === null) return; // no message received, just return

    try {
      await callback(msg.content.toString(), msg.fields.routingKey);
      channel.ack(msg);
    } catch (error) {
      console.error(`[AMQP] Error handling message from "${queue}": ${error}`);
      channel.nack(msg, false, false); // no requeue: a message that always fails would loop forever
    }
  });
}

export { sendMessage, readMessage, publishMessage };