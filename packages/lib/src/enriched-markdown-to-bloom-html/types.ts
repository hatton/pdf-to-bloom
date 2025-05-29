export interface BookMetadata {
  allTitles: Record<string, string>;
  languages: Record<string, string>;
  l1: string; // primary language
  l2?: string; // secondary language
  coverImage?: string;
  isbn?: string;
  license?: string;
  copyright?: string;
}

export interface ImageElement {
  type: "image";
  src: string;
}

export interface TextBlockElement {
  type: "text";
  content: Record<string, string>; // lang -> text
}

export type PageElement = ImageElement | TextBlockElement;

export type Layout =
  | "image-top-text-bottom"
  | "text-top-image-bottom"
  | "text-only"
  | "image-only"
  | "text-image-text"
  | "bilingual-text-image-text";

export interface PageContent {
  layout: Layout;
  elements: PageElement[];
}

export interface Book {
  metadata: BookMetadata;
  pages: PageContent[];
}

export interface ConversionStats {
  pages: number;
  languages: string[];
  images: number;
  layouts: Record<string, number>;
}

export interface ValidationError {
  type: "error" | "warning";
  message: string;
  line?: number;
}
