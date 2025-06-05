import { BookMetadata } from "./3-add-bloom-plan/bloomMetadata";

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
  | "text-image"
  | "text-only"
  | "image-only"
  | "text-image-text"
  | "bilingual-text-image-text";

export interface PageContent {
  layout: Layout;
  appearsToBeBilingualPage: boolean;
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
export type Language = {
  tag: string; // BCP-47 language tag, e.g., "en", "uz-CYRL"
  name: string;
};
