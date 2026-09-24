import { sendMessage, readMessage } from '../messaging/amqp.js'

console.log('Starting message processing service...');

// Keep in sync with the BudgetCategory seed in backend/src/prisma/migrations
const CATEGORIES = [
  'Groceries',
  'Transportation',
  'Housing & Utilities',
  'Entertainment',
  'Health & Wellness',
];

function buildPrompt(text: string, categories: string[]): string {
  return [
    'You are an assistant that extracts budget records from transcribed speech.',
    '',
    'Return ONLY a valid JSON object (no markdown, no extra text) with exactly these keys:',
    '- "amount": the amount spent, as a number (e.g. 12.5). Use a dot as decimal separator, no currency symbols, no thousands separators, no quotes. Convert amounts written in words to digits (e.g. "twelve euros and fifty" -> 12.5). Add a negative sign in case of outcome, none in case of income.',
    '- "category": exactly one of the allowed categories below, copied verbatim. Pick the one that best fits the expense.',
    '- "description": a short description of the expense (max 10 words), in the same language as the text.',
    '',
    'Allowed categories:',
    ...categories.map((c) => `- ${c}`),
    '',
    'If a value cannot be determined from the text, set that key to null. Never use a category outside the list.',
    '',
    'Example output:',
    '{"amount": 12.5, "category": "Groceries", "description": "Weekly supermarket shopping"}',
    '',
    `Text: "${text}"`,
  ].join('\n');
}

readMessage('audio_processing_queue', (msg: any) => {
  console.log(`1. Received audio filepath to process: ${msg}`);

  sendMessage('speech_to_text', msg);
});

readMessage('transcriptions', (msg: any) => {
  console.log(`2. Received transcription: ${msg}`);

  const json = JSON.parse(msg);

  const text = json.text.join(" ");

  const jsonPayload = {
    jobId: json.jobId,
    text,
    prompt: buildPrompt(text, CATEGORIES)
  };

  sendMessage('llm_to_budgeting', JSON.stringify(jsonPayload));
});

readMessage('llm_processed', (msg: any) => {
  console.log(`3. Received processed LLM output: ${msg}`);

  sendMessage('budget_record', msg);
});