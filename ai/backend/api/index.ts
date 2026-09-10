import { sendMessage, readMessage } from '../messaging/amqp.js'

readMessage('audio_processing_queue', (msg: any) => {
  console.log(`Received message from queue: ${msg}`);

  sendMessage('speech_to_text', msg);
});

readMessage('transcriptions', (msg: any) => {
  console.log(`Received message from queue: ${msg}`);
});