import amqp from "amqplib";

const connectionUrl = process.env.RABBITMQ_URL;

if(!connectionUrl) {
  throw new Error("RABBITMQ_URL environment variable is not defined");
}

const connection = await amqp.connect(connectionUrl);
const channel = await connection.createChannel();

/**
 * Sends a message to the specified queue.
 * @param queue The name of the queue to send the message to.
 * @param message The message to send.
 */
function sendMessage(queue: string, message: string) {

  channel.assertQueue(queue, { durable: true }); // assert the queue exists, if not it will be created
  channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
}

/**
 * Reads a message from the specified queue.
 * @param queue The name of the queue to read from.
 * @param callback The function to call when a message is received.
 */
function readMessage(queue: string, callback: (msg: string) => void) {
  
  channel.assertQueue(queue, { durable: true }); // assert the queue exists, if not it will be created

  channel.consume(queue, (msg) => {
    if (msg !== null) {
      callback(msg.content.toString());
      channel.ack(msg);
    }
  });
}

export { sendMessage, readMessage };