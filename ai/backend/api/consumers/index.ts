import { sendMessage, readMessage } from '../../messaging/amqp.js'
import { buildPromptForTranscription } from '../prompt.js'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * Get current categories.
 */
async function fetchCategories(): Promise<string[]> {
  const res = await fetch(`${BACKEND_URL}/budget/category`);
  if (!res.ok) throw new Error(`Failed to fetch categories: HTTP ${res.status}`);

  const categories: { name: string }[] = await res.json();
  return categories.map((c) => c.name);
}

/**
 * The registerConsumers function sets up the necessary consumers on the RabbitMQ message broker.
 */
const registerConsumers = () => {

  /**
   * Consumer for the 'audio.processing' queue. 
   * 
   * It listens for messages containing audio file paths 
   * to process and forwards them to the 'speech_to_text.processing' queue.
   */
  readMessage({ queue: 'audio.processing' }, (msg: any) => {
    console.log(`1. Received audio filepath to process: ${msg}`);

    sendMessage('speech_to_text.processing', msg);
  });

  /**
   * Consumer for the 'audio.processed' queue.
   * 
   * It listens for messages containing transcribed text from audio files, 
   * builds a prompt for the LLM, and forwards it to the 'llm.processing' queue.
   */
  readMessage({ queue: 'audio.processed', exchange: 'pipeline', binding: 'audio.processed' }, async (msg: any) => {
    console.log(`2. Received transcription: ${msg}`);

    try {
      const json = JSON.parse(msg);

      const jsonPayload = {
        jobId: json.jobId,
        text: json.text.join(" "),
        prompt: buildPromptForTranscription(json.text.join(" "), await fetchCategories())
      };

      sendMessage('llm.processing', JSON.stringify(jsonPayload));
    } catch (error) {
      console.error(`Error processing transcription: ${error}`);
    }
  });

  /**
   * Consumer for the 'llm.processed' queue.
   * 
   * It listens for messages containing processed output from the LLM 
   * and forwards them to the 'budget_record.processed' queue on the domain logic backend
   */
  readMessage({ queue: 'llm.processed', exchange: 'pipeline', binding: 'llm.processed' }, (msg: any) => {
    console.log(`3. Received processed LLM output: ${msg}`);

    sendMessage('budget_record.processed', msg);
  });
}

export { registerConsumers };
