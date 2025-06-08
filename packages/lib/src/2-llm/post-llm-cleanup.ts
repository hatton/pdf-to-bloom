// filepath: c:\dev\pdf-to-bloom\packages\lib\src\3-process-tagged-markdown\post-llm-cleanup.ts

import { logger } from "../logger";

/**
 * Clean up and validate markdown content returned from the LLM
 */
export function attemptCleanup(content: string): {
  cleaned: string;
  valid: boolean;
} {
  // Strip code block wrapper if present
  content = content.replace(/^```\w*\s*\n([\s\S]*?)\n```\s*$/g, "$1");

  // Remove standalone "yaml" lines that AI models sometimes add
  content = content.replace(/yaml/, "");

  // Fix malformed YAML frontmatter if it's missing the opening delimiter
  // Check if content starts with YAML-like content but is missing the opening ---
  if (!content.startsWith("---") && content.includes("languages:")) {
    const lines = content.split("\n");
    let yamlEndIndex = -1;

    // Find where the YAML ends (look for the first line that starts with #, !, [, or <!-- after YAML-like content)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (
        line.startsWith("#") ||
        line.startsWith("!") ||
        line.startsWith("[") ||
        line.startsWith("<!--")
      ) {
        yamlEndIndex = i;
        break;
      }
    }

    if (yamlEndIndex > 0) {
      // Insert --- at the beginning and replace the separator
      const yamlContent = lines.slice(0, yamlEndIndex).join("\n");
      const markdownContent = lines.slice(yamlEndIndex).join("\n");
      content = `---\n${yamlContent.trim()}\n---\n${markdownContent}`;
      content = content.replace(/---\n---/g, "---\n"); // remove any double dashes that might have been created
      logger.verbose(
        "Fixed malformed YAML frontmatter by adding missing delimiters"
      );
    }

    // remove any other ``` (I've seen it after the YAML frontmatter)
    content = content.replace(/```/g, "");
  }
  // Sometimes in the markdown, the LLM will have 2 lines like this:
  //
  // <!-- text lang=id -->
  // ![img-0.jpeg](img-0.jpeg){width=150}
  // etc...
  //
  // But we need that comment to come after the img statement, not before it.

  // Match and swap the order of language comment followed by image statement
  const langCommentFollowedImmediatelyByImageRegex =
    /(<!--\s*text\s+lang=(?:"?\w+"?)\s*-->)\n\s*(!\[.*?\](?:\(.*?\)|\[.*?\])(\{.*?\})?)/g;
  content = content.replace(
    langCommentFollowedImmediatelyByImageRegex,
    (_match, langComment, imageStatement) => {
      logger.warn(
        `Reordered language comment to follow image statement in markdown: ${langComment} ${imageStatement}`
      );
      return `${imageStatement}\n${langComment}\n`;
    }
  );

  // do a final check and return null if we fail the check.
  // we must have a) no code block wrapper, b) a YAML frontmatter bounded by ---, at least one comment with "lang=", and the required frontmatter fields (allTitles, l1, and languages).
  // Check each of these problems individually so that if any fail, log a specific error and return null.
  if (content.includes("```")) {
    logger.error("Code block wrapper is present.");
    // log the first 3 lines
    const firstThreeLines = content.split("\n").slice(0, 3).join("\n");
    logger.error(`First 3 lines of content:\n${firstThreeLines}`);
    return { cleaned: content, valid: false };
  }

  if (!content.startsWith("---") || !content.includes("---", 3)) {
    logger.error("YAML frontmatter does not start and end with ---");

    const firstThreeLines = content.split("\n").slice(0, 3).join("\n");
    logger.error(`First 3 lines of content:\n${firstThreeLines}`);
    return { cleaned: content, valid: false };
  }

  if (!content.includes("lang=")) {
    logger.error("No languages identified in the markdown.");
    return { cleaned: content, valid: false };
  }

  const requiredFields = ["allTitles", "l1", "languages"];
  for (const field of requiredFields) {
    if (!content.includes(`${field}:`)) {
      logger.error(`Missing required frontmatter field: ${field}`);
      return { cleaned: content, valid: false };
    }
  }

  return { cleaned: content, valid: true };
}
