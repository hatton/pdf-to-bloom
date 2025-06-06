import { describe, it, expect } from "vitest";
import { getMarkdownFromBook, convertHtmlToMarkdown } from "./generateMarkdown";
import { Book, Page, TextBlockElement, ImageElement } from "../types";

describe("generateMarkdown", () => {
  describe("getMarkdownFromBook", () => {
    it("should generate basic markdown with frontmatter", () => {
      const book: Book = {
        metadata: {
          allTitles: { en: "Test Book" },
          languages: { en: "English" },
          l1: "en",
        },
        pages: [],
      };

      const result = getMarkdownFromBook(book);

      expect(result).toContain("---");
      expect(result).toContain("l1: en");
      expect(result).toContain("allTitles:");
      expect(result).toContain("  en: Test Book");
    });

    it("should handle complex metadata structures", () => {
      const book: Book = {
        metadata: {
          allTitles: {
            en: "English Title",
            fr: "Titre Français",
          },
          languages: {
            en: "English",
            fr: "French",
          },
          l1: "en",
          l2: "fr",
          coverImage: "cover.jpg",
          isbn: "978-1234567890",
        },
        pages: [],
      };

      const result = getMarkdownFromBook(book);

      expect(result).toContain("allTitles:");
      expect(result).toContain("  en: English Title");
      expect(result).toContain("  fr: Titre Français");
      expect(result).toContain("languages:");
      expect(result).toContain("  en: English");
      expect(result).toContain("  fr: French");
      expect(result).toContain("coverImage: cover.jpg");
      expect(result).toContain("isbn: 978-1234567890");
    });

    it("should generate page content with text elements", () => {
      const textElement: TextBlockElement = {
        type: "text",
        content: {
          en: "<p>Hello world</p>",
        },
      };

      const page: Page = {
        type: "content",
        appearsToBeBilingualPage: false,
        elements: [textElement],
      };

      const book: Book = {
        metadata: {
          allTitles: { en: "Test" },
          languages: { en: "English" },
          l1: "en",
        },
        pages: [page],
      };

      const result = getMarkdownFromBook(book);

      expect(result).toContain('<!-- page 1 type="content" -->');
      expect(result).toContain('<!-- text lang="en" -->');
      expect(result).toContain("Hello world");
    });

    it("should handle bilingual pages", () => {
      const textElement: TextBlockElement = {
        type: "text",
        content: {
          en: "<p>Hello world</p>",
          es: "<p>Hola mundo</p>",
        },
      };

      const page: Page = {
        type: "content",
        appearsToBeBilingualPage: true,
        elements: [textElement],
      };

      const book: Book = {
        metadata: {
          allTitles: { en: "Test" },
          languages: { en: "English", es: "Spanish" },
          l1: "en",
          l2: "es",
        },
        pages: [page],
      };

      const result = getMarkdownFromBook(book);

      expect(result).toContain('bilingual="true"');
      expect(result).toContain('<!-- text lang="en" -->');
      expect(result).toContain('<!-- text lang="es" -->');
      expect(result).toContain("Hello world");
      expect(result).toContain("Hola mundo");
    });

    it("should handle image elements", () => {
      const imageElement: ImageElement = {
        type: "image",
        src: "test-image.jpg",
      };

      const page: Page = {
        type: "content",
        appearsToBeBilingualPage: false,
        elements: [imageElement],
      };

      const book: Book = {
        metadata: {
          allTitles: { en: "Test" },
          languages: { en: "English" },
          l1: "en",
        },
        pages: [page],
      };

      const result = getMarkdownFromBook(book);

      expect(result).toContain("![](test-image.jpg)");
    });

    it("should handle mixed content (text and images)", () => {
      const textElement: TextBlockElement = {
        type: "text",
        content: {
          en: "<p>Text before image</p>",
        },
      };

      const imageElement: ImageElement = {
        type: "image",
        src: "middle-image.jpg",
      };

      const textElement2: TextBlockElement = {
        type: "text",
        content: {
          en: "<p>Text after image</p>",
        },
      };

      const page: Page = {
        type: "content",
        appearsToBeBilingualPage: false,
        elements: [textElement, imageElement, textElement2],
      };

      const book: Book = {
        metadata: {
          allTitles: { en: "Test" },
          languages: { en: "English" },
          l1: "en",
        },
        pages: [page],
      };

      const result = getMarkdownFromBook(book);

      expect(result).toContain("Text before image");
      expect(result).toContain("![](middle-image.jpg)");
      expect(result).toContain("Text after image");
    });

    it("should handle different page types", () => {
      const page: Page = {
        type: "front-matter",
        appearsToBeBilingualPage: false,
        elements: [],
      };

      const book: Book = {
        metadata: {
          allTitles: { en: "Test" },
          languages: { en: "English" },
          l1: "en",
        },
        pages: [page],
      };

      const result = getMarkdownFromBook(book);

      expect(result).toContain('type="front-matter"');
    });

    it("should handle empty pages gracefully", () => {
      const page: Page = {
        type: "empty",
        appearsToBeBilingualPage: false,
        elements: [],
      };

      const book: Book = {
        metadata: {
          allTitles: { en: "Test" },
          languages: { en: "English" },
          l1: "en",
        },
        pages: [page],
      };

      const result = getMarkdownFromBook(book);

      expect(result).toContain('<!-- page 1 type="empty" -->');
    });
  });

  describe("convertHtmlToMarkdown", () => {
    it("should convert basic HTML elements to markdown", () => {
      const html = "<p>Hello world</p>";
      const result = convertHtmlToMarkdown(html);
      expect(result).toBe("Hello world");
    });

    it("should convert headings", () => {
      const html = "<h1>Title</h1><h2>Subtitle</h2>";
      const result = convertHtmlToMarkdown(html);
      expect(result).toBe("# Title\n## Subtitle");
    });

    it("should convert bold and italic", () => {
      const html =
        "<p>This is <strong>bold</strong> and <em>italic</em> text</p>";
      const result = convertHtmlToMarkdown(html);
      expect(result).toBe("This is **bold** and *italic* text");
    });

    it("should convert links", () => {
      const html = '<p>Visit <a href="https://example.com">our website</a></p>';
      const result = convertHtmlToMarkdown(html);
      expect(result).toBe("Visit [our website](https://example.com)");
    });

    it("should handle multiple paragraphs", () => {
      const html = "<p>First paragraph</p><p>Second paragraph</p>";
      const result = convertHtmlToMarkdown(html);
      expect(result).toBe("First paragraph\nSecond paragraph");
    });

    it("should preserve content of existing block elements", () => {
      const html = "<h1>Already a heading</h1>";
      const result = convertHtmlToMarkdown(html);
      expect(result).toBe("# Already a heading");
    });
  });
});
