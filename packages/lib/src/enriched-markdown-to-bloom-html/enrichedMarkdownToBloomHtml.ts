import { logger, LogEntry } from "../logger";
import { MarkdownToBloomHtml } from "./md-to-bloom.js";
import { HtmlGenerator } from "./html-generator.js";

export interface MakeBloomHtmlOptions {
  logCallback?: (log: LogEntry) => void;
  // HTML generation specific options
  customStyles?: string;
  outputFormat?: "standard" | "enhanced";
  validateImages?: boolean;
}

/**
 * Converts enriched markdown to Bloom-compatible HTML format
 * @param enrichedMarkdown - Input enriched markdown string
 * @param options - Optional configuration options
 * @returns Promise resolving to HTML string formatted for Bloom
 */
export async function enrichedMarkdownToBloomHtml(
  enrichedMarkdown: string,
  options?: MakeBloomHtmlOptions
): Promise<string> {
  const { logCallback, customStyles, outputFormat, validateImages } =
    options || {};

  if (logCallback) {
    logger.subscribe(logCallback);
  }

  try {
    logger.info("Starting markdown to Bloom HTML conversion");

    // Parse the markdown into a book object
    logger.verbose("Parsing markdown content...");
    const parser = new MarkdownToBloomHtml(undefined, {
      validateImages: validateImages ?? false,
    });
    const book = parser.parseMarkdownIntoABookObject(enrichedMarkdown);

    // Log any warnings or errors from parsing
    const errors = parser.getErrors();
    errors.forEach((error) => {
      if (error.type === "error") {
        logger.error(error.message);
      } else {
        // Use error method for warnings since warn doesn't exist
        logger.error(`Warning: ${error.message}`);
      }
    });

    // Generate HTML from the book object
    logger.verbose("Generating Bloom HTML...");
    const htmlGenerator = new HtmlGenerator();
    let htmlContent = htmlGenerator.generateHtmlDocument(book);

    // Apply custom styles if provided
    if (customStyles) {
      // Insert custom styles into the head section
      htmlContent = htmlContent.replace(
        "</head>",
        `    <style>\n${customStyles}\n    </style>\n  </head>`
      );
    }

    // Apply output format variations if needed
    if (outputFormat === "enhanced") {
      // Add enhanced classes or modifications here if needed
      logger.verbose("Applying enhanced output format...");
    }

    logger.info(
      `Bloom HTML conversion completed successfully. Generated ${book.pages.length} pages.`
    );

    return htmlContent;
  } finally {
    if (logCallback) {
      logger.unsubscribe(logCallback);
    }
  }
}
