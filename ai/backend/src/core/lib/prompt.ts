function buildPromptForTranscription(text: string, categories: string[]): string {
  return [
    'You are an assistant that extracts budget records from transcribed speech.',
    '',
    'Return ONLY a valid JSON object (no markdown, no extra text) with exactly these keys:',
    '- "type": "outcome" if the money was spent or paid out, "income" if it was received (e.g. salary, refund, gift received). If unclear, use "outcome".',
    '- "amount": the amount of money, as a positive number (e.g. 12.5). Never add a sign: whether it is an expense or an income goes in "type". Use a dot as decimal separator, no currency symbols, no thousands separators, no quotes. Convert amounts written in words to digits (e.g. "twelve euros and fifty" -> 12.5).',
    '- "category": exactly one of the allowed categories below, copied verbatim. Pick the one that best fits the transaction.',
    '- "description": a short description of the transaction (max 10 words), in the same language as the text.',
    '',
    'Allowed categories:',
    ...categories.map((c) => `- ${c}`),
    '',
    'If a value cannot be determined from the text, set that key to null. Never use a category outside the list.',
    '',
    'Example output:',
    '{"type": "outcome", "amount": 12.5, "category": "Groceries", "description": "Weekly supermarket shopping"}',
    '',
    `Text: "${text}"`,
  ].join('\n');
}

function buildPromptForOcr(text: string, categories: string[]): string {
  return [
    'You are an assistant that extracts budget records from OCR text extracted from a receipt.',
    'From all the text, extract whether it is an expense or an income, the amount, the category of the transaction, and a short description of the transaction (max 10 words).',
    '',
    'Return ONLY a valid JSON object (no markdown, no extra text) with exactly these keys:',
    '- "type": "outcome" if the money was spent or paid out, "income" if it was received (e.g. salary, refund, gift received). If unclear, use "outcome".',
    '- "amount": the amount of money, as a positive number (e.g. 12.5). Never add a sign: whether it is an expense or an income goes in "type". Use a dot as decimal separator, no currency symbols, no thousands separators, no quotes. Convert amounts written in words to digits (e.g. "twelve euros and fifty" -> 12.5).',
    '- "category": exactly one of the allowed categories below, copied verbatim. Pick the one that best fits the transaction.',
    '- "description": a short description of the transaction (max 10 words), in the same language as the text.',
    '',
    'Allowed categories:',
    ...categories.map((c) => `- ${c}`),
    '',
    'If a value cannot be determined from the text, set that key to null. Never use a category outside the list.',
    '',
    'Example output:',
    '{"type": "outcome", "amount": 12.5, "category": "Groceries", "description": "Weekly supermarket shopping"}',
    '',
    `Text: "${text}"`,
  ].join('\n');
}

export { buildPromptForTranscription, buildPromptForOcr };
