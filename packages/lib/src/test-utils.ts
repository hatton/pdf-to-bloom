/**
 * Helper function to normalize markdown strings for reliable comparison.
 * It removes excessive whitespace, normalizes line endings, and trims
 * to focus on content rather than exact formatting.
 */
export function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\n{3,}/g, "\n\n") // Reduce multiple blank lines to at most 2
    .replace(/[ \t]+$/gm, "") // Remove trailing spaces on each line
    .replace(/^[ \t]+/gm, (match) => match.replace(/\t/g, "  ")) // Normalize tabs to spaces
    .trim(); // Trim leading/trailing whitespace from the whole string
}
