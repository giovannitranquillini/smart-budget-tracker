import amqp from "amqplib";

const connectionUrl = process.env.RABBITMQ_URL;

if(!connectionUrl) {
  throw new Error("RABBITMQ_URL environment variable is not defined");
}

const connection = await amqp.connect(connectionUrl);

// create the channel over which we will send the message
const channel = await connection.createChannel();

function sendMessage(queue: string, message: string) {
  // assert the queue exists, if not it will be created
  channel.assertQueue(queue, { durable: true });

  // send the message to the queue
  channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
}

function readMessage(queue: string, callback: (msg: string) => void) {
  // assert the queue exists, if not it will be created
  channel.assertQueue(queue, { durable: true });

  // consume messages from the queue
  channel.consume(queue, (msg) => {
    if (msg !== null) {
      callback(msg.content.toString());
      channel.ack(msg);
    }
  });
}

export { sendMessage, readMessage };