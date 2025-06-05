// Re-export all functions from their individual modules
export {
  pdfToMarkdownAndImageFiles,
  pdfToMarkdownAndImageFiles as makeMarkdownFromPDF,
} from "./1-pdf-to-markdown-and-images/pdfToMarkdownAndImageFiles";
export { llmMarkdown } from "./2-llm-markdown/llmMarkdown";
export { enrichMarkdown } from "./2-llm-markdown/enrichMarkdown";

// Export additional types and classes for advanced usage
export { Parser } from "./4-parse-markdown/parseMarkdown";
export { HtmlGenerator } from "./5-generate-html/html-generator";
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
