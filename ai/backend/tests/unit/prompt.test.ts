import { describe, expect, it } from 'vitest'
import { buildPromptForOcr, buildPromptForTranscription } from '@core/lib/prompt.js';

const TEST_CATEGORIES = ['general', 'finance', 'legal', 'medical', 'technical'];
const TEST_PROMPT = 'This is a test prompt';

describe.each([
  { name: 'buildPromptForTranscription', build: buildPromptForTranscription },
  { name: 'buildPromptForOcr', build: buildPromptForOcr },
])('$name', ({ build }) => {
    
   it('returns a string', () => {
        const prompt = build(TEST_PROMPT, TEST_CATEGORIES);
        expect(typeof prompt).toBe('string');
    });

    it('contains all the categories', () => {
        const prompt = build(TEST_PROMPT, TEST_CATEGORIES);

        for (const category of TEST_CATEGORIES) {
            expect(prompt).toContain(category);
        }
    });

    it('contains the input text', () => {
        const prompt = build(TEST_PROMPT, TEST_CATEGORIES);
        expect(prompt).toContain(TEST_PROMPT);
    });
});
