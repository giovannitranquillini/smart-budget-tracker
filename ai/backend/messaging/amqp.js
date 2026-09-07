import amqp from "amqplib";

const connectionUrl = process.env.RABBITMQ_URL;

if(!connectionUrl) {
  throw new Error("RABBITMQ_URL environment variable is not set");
}

const connection = await amqp.connect(connectionUrl);

// create the channel over which we will send the message
const channel = await connection.createChannel();

/**
 * @param {string} queue
 * @param {string | Buffer} message
 */
function sendMessage(queue, message) {
  channel.assertQueue(queue, {
    durable: true
  });

  channel.sendToQueue(queue, Buffer.from(message));
  console.log(" [x] Sent %s", message);
}

/**
 * @param {string} queue
 * @param {(message: string) => void} callback
 */
function readMessage(queue, callback) {
  channel.assertQueue(queue, {
    durable: true
  });

  channel.consume(queue, (msg) => {
    if (msg !== null) {
      callback(msg.content.toString());
      channel.ack(msg);
    }
  });
}

export { sendMessage, readMessage };