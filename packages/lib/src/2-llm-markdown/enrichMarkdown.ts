import { llmMarkdown, type EnrichMarkdownOptions } from "./llmMarkdown";

/**
 * Enriches markdown content with additional processing and returns the cleaned result
 * This is a convenience wrapper around llmMarkdown that returns only the cleanedUpMarkdown string
 */
export async function enrichMarkdown(
  markdown: string,
  openRouterApiKey: string,
  options?: EnrichMarkdownOptions
): Promise<string> {
  const result = await llmMarkdown(markdown, openRouterApiKey, options);
  return result.cleanedUpMarkdown;
}
