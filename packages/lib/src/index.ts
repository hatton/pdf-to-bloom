// Re-export all functions from their individual modules
export {
  pdfToMarkdownAndImageFiles,
  pdfToMarkdownAndImageFiles as makeMarkdownFromPDF,
} from "./pdf-to-markdown-and-images/pdfToMarkdownAndImageFiles";
export { enrichMarkdown } from "./enrich-markdown/enrichMarkdown";
export {
  enrichedMarkdownToBloomHtml as makeBloomHtml,
  type MakeBloomHtmlOptions,
} from "./enriched-markdown-to-bloom-html/enrichedMarkdownToBloomHtml";
export { pdfToBloomFolder } from "./pdf-all-the-way-to-bloom-html/pdfToBloom";

// Export additional types and classes for advanced usage
export { MarkdownToBloomHtml } from "./enriched-markdown-to-bloom-html/md-to-bloom";
export { HtmlGenerator } from "./enriched-markdown-to-bloom-html/html-generator";
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
