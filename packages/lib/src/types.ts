import { BookMetadata } from "./3-add-bloom-plan/bloomMetadata";

export interface ImageElement {
  type: "image";
  src: string;
  alt?: string; // Alt text from ![alt](src)
  attributes?: string; // Attributes like {width=993}
}

/*     l1: "bo" # the primary language
    l2: "en" # often a major language used for metadata, but may also be used in bilingual pages
    isbn: "968-31-0276-X"
    license: "CC-BY-NC"
    licenseNotes: "Ask us before you translate this"
    copyright: "Copyright © 1993, Instituto Lingüístico de Verano, A.C."
    credits: "the authors, the illustrator"
    acknowledgements-original-version: "may thank funders, editors, etc."
    acknowledgements-localized-version: "often the translator"
    other-credits-on-cover: ""
    funding-info: "funded by a grant from the Foo dept of literacy"
    tags:
      topic: "Folktale"
    country: "Mexico"
    province: "Oaxaca"
    district: "Santa María Zacatepec"
    author: "Virginia López Lucas"
    illustrator: "Jose Foo"
    publisher: "Instituto de Grillo"
    originalPublisher:
*/

export interface TextBlockElement {
  type: "text";
  field?:
    | "l1"
    | "l2"
    | "isbn"
    | "license"
    | "licenseNotes"
    | "copyright"
    | "credits"
    | "acknowledgements-original-version"
    | "acknowledgements-localized-version"
    | "other-credits-on-cover"
    | "funding-info"
    | "tags"
    | "country"
    | "province"
    | "district"
    | "author"
    | "illustrator"
    | "publisher"
    | "originalPublisher"
    | "title"
    | "coverImage";
  content: Record<string, string>; // lang -> text
}

export type PageElement = ImageElement | TextBlockElement;

export interface Page {
  appearsToBeBilingualPage?: boolean;
  elements: PageElement[];
  type: "front-matter" | "back-matter" | "content" | "empty";
}

export interface Book {
  metadata: BookMetadata;

  pages: Page[];
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
