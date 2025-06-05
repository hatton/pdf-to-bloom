// Re-export all functions from their individual modules
export {
  pdfToMarkdownAndImageFiles,
  pdfToMarkdownAndImageFiles as makeMarkdownFromPDF,
} from "./1-pdf-to-markdown-and-images/pdfToMarkdownAndImageFiles";
export { llmMarkdown } from "./2-llm-markdown/llmMarkdown";
export { enrichMarkdown } from "./2-llm-markdown/enrichMarkdown";
export {
  enrichedMarkdownToBloomHtml as makeBloomHtml,
  type MakeBloomHtmlOptions,
} from "./4-make-bloom-html/makeBloomHtml";

// Export additional types and classes for advanced usage
export { MarkdownToBloomHtml } from "./4-make-bloom-html/md-to-bloom";
export { HtmlGenerator } from "./4-make-bloom-html/html-generator";
export type {
  Book,
  BookMetadata,
  PageContent,
  PageElement,
  TextBlockElement,
  ImageElement,
  Layout,
  ValidationError,
  ConversionStats,
} from "./types";

// Export logger utilities for callers to access log messages
export { logger } from "./logger";

//export Language type
export type { Language } from "./types";
