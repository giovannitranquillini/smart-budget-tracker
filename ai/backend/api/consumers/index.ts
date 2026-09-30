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
   * Consumer for the 'audio_processing' queue. 
   * 
   * It listens for messages containing audio file paths 
   * to process and forwards them to the 'speech_to_text' queue.
   */
  readMessage('audio_processing', (msg: any) => {
    console.log(`1. Received audio filepath to process: ${msg}`);

    sendMessage('speech_to_text', msg);
  });

  /**
   * Consumer for the 'transcriptions' queue.
   * 
   * It listens for messages containing transcribed text from audio files, 
   * builds a prompt for the LLM, and forwards it to the 'llm_to_budgeting' queue.
   */
  readMessage('transcriptions', async (msg: any) => {
    console.log(`2. Received transcription: ${msg}`);

    try {
      const json = JSON.parse(msg);

      const jsonPayload = {
        jobId: json.jobId,
        text: json.text.join(" "),
        prompt: buildPromptForTranscription(json.text.join(" "), await fetchCategories())
      };

      sendMessage('llm_to_budgeting', JSON.stringify(jsonPayload));
    } catch (error) {
      console.error(`Error processing transcription: ${error}`);
    }
  });

  /**
   * Consumer for the 'llm_processed' queue.
   * 
   * It listens for messages containing processed output from the LLM 
   * and forwards them to the 'budget_record' queue on the domain logic backend
   */
  readMessage('llm_processed', (msg: any) => {
    console.log(`3. Received processed LLM output: ${msg}`);

    sendMessage('budget_record', msg);
  });
}

export { registerConsumers };
