import { describe, it, expect } from 'vitest';
import { getModelAliases } from '../1-ocr/pdfToMarkdownAndImageFiles-OpenRouter';

describe('OpenRouter Model Aliases', () => {
  it('should have correct model aliases', () => {
    const aliases = getModelAliases();
    
    expect(aliases).toEqual({
      "gemini": "google/gemini-2.0-flash-exp",
      "4o": "openai/gpt-4o"
    });
  });

  it('should include gemini alias', () => {
    const aliases = getModelAliases();
    expect(aliases.gemini).toBe("google/gemini-2.0-flash-exp");
  });

  it('should include 4o alias', () => {
    const aliases = getModelAliases();
    expect(aliases["4o"]).toBe("openai/gpt-4o");
  });
});
