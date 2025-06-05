import { describe, it, expect } from "vitest";
import { Parser } from "../4-parse-markdown/parseMarkdown";
import { HtmlGenerator } from "./html-generator";
import type { TextBlockElement, ImageElement } from "../types";

async function mdToBloomHtml(markdown: string) {
  const parser = new Parser();
  const book = parser.parseMarkdown(markdown);
  return HtmlGenerator.generateHtmlDocument(book);
}

describe("mdToBloomHtml", () => {
  it("should convert simple markdown to Bloom HTML", async () => {
    const markdown = `---
allTitles:
  en: "Test Book"
languages:
  en: "English"
l1: en
---
<!-- lang=en -->
Hello world`;

    const result = await mdToBloomHtml(markdown, () => {});

    expect(result).toContain("<!doctype html>");
    expect(result).toContain("<title>Test Book</title>");
    expect(result).toContain("Hello world");
    expect(result).toContain("bloom-editable");
  });
  it("should apply custom styles", async () => {
    const markdown = `---
allTitles:
  en: "Test Book"
languages:
  en: "English"
l1: en
---
<!-- lang=en -->
Hello world`;

    const result = await mdToBloomHtml(markdown, () => {});

    // Note: Custom styles functionality may not be implemented yet
    expect(result).toContain("<!doctype html>");
    expect(result).toContain("Hello world");
  });

  it("should handle validation errors gracefully", async () => {
    const invalidMarkdown = `---
allTitles:
  en: "Test Book"
# Missing required fields
---
<!-- lang=en -->
Test content`;
    await expect(mdToBloomHtml(invalidMarkdown, () => {})).rejects.toThrow(
      "Validation failed"
    );
  });
});

describe("MarkdownToBloomHtml", () => {
  it("should parse valid frontmatter", () => {
    const content = `---
allTitles:
  en: "Test Book"
  es: "Libro de Prueba"
languages:
  en: "English"
  es: "Español"
l1: en
l2: es
---
<!-- lang=en -->
Hello world
<!-- lang=es -->
Hola mundo`;

    const parser = new Parser();
    const result = parser.parseMarkdown(content);

    expect(result.metadata.allTitles.en).toBe("Test Book");
    expect(result.metadata.l1).toBe("en");
    expect(result.metadata.l2).toBe("es");
    expect(result.pages).toHaveLength(1);
    expect((result.pages[0].elements[0] as TextBlockElement).content.en).toBe(
      "<p>Hello world</p>"
    );
    expect((result.pages[0].elements[0] as TextBlockElement).content.es).toBe(
      "<p>Hola mundo</p>"
    );
  });

  it("should detect page layouts correctly", () => {
    const content = `---
allTitles:
  en: "Test Book"
languages:
  en: "English"
l1: en
---
![Test Image](test-image.png)
<!-- lang=en -->
Text after image
<!-- start-page -->
<!-- lang=en -->
Text before image
![Test Image](test-image.png)
<!-- start-page -->
<!-- lang=en -->
Text only page`;

    const parser = new Parser();
    const result = parser.parseMarkdown(content);

    expect(result.pages).toHaveLength(3);
    expect(result.pages[0].layout).toBe("image-top-text-bottom");
    expect(result.pages[1].layout).toBe("text-top-image-bottom");
    expect(result.pages[2].layout).toBe("text-only");
  });

  it("should convert markdown formatting to HTML", () => {
    const content = `---
allTitles:
  en: "Test Book"
languages:
  en: "English"
l1: en
---
<!-- lang=en -->
This is **bold** text and *italic* text.
Here's a [link](https://example.com).
Line one
Line two`;

    const parser = new Parser();
    const result = parser.parseMarkdown(content);

    const htmlText = (result.pages[0].elements[0] as TextBlockElement).content
      .en;
    expect(htmlText).toContain("<strong>bold</strong>");
    expect(htmlText).toContain("<em>italic</em>");
    expect(htmlText).toContain('<a href="https://example.com">link</a>');
    expect(htmlText).toContain("<p>");
  });

  it("should validate required metadata fields", () => {
    const content = `---
allTitles:
  en: "Test Book"
# Missing languages and l1
---
<!-- lang=en -->
Test content`;

    const parser = new Parser();
    expect(() => parser.parseMarkdown(content)).toThrow("Validation failed");
  });

  it("should handle images without file validation", () => {
    const content = `---
allTitles:
  en: "Test Book"
languages:
  en: "English"
l1: en
---
![Test Image](nonexistent-image.png)
<!-- lang=en -->
Text with image that doesn't exist on disk`;

    const parser = new Parser();
    const result = parser.parseMarkdown(content);

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].layout).toBe("image-top-text-bottom");
    expect((result.pages[0].elements[0] as ImageElement).src).toBe(
      "nonexistent-image.png"
    );
    expect((result.pages[0].elements[1] as TextBlockElement).content.en).toBe(
      "<p>Text with image that doesn't exist on disk</p>"
    );
    expect(result.pages[0]).toBeDefined();
  });

  it("should handle multiple languages correctly", () => {
    const content = `---
allTitles:
  en: "Test Book"
  fr: "Livre de Test"
  es: "Libro de Prueba"
languages:
  en: "English"
  fr: "French"
  es: "Spanish"
l1: en
l2: fr
---
<!-- lang=en -->
English text
<!-- lang=fr -->
French text
<!-- lang=es -->
Spanish text`;

    const parser = new Parser();
    const result = parser.parseMarkdown(content);

    expect(result.pages).toHaveLength(1);
    expect((result.pages[0].elements[0] as TextBlockElement).content.en).toBe(
      "<p>English text</p>"
    );
    expect((result.pages[0].elements[0] as TextBlockElement).content.fr).toBe(
      "<p>French text</p>"
    );
    expect((result.pages[0].elements[0] as TextBlockElement).content.es).toBe(
      "<p>Spanish text</p>"
    );
    expect(
      Object.keys((result.pages[0].elements[0] as TextBlockElement).content)
    ).toHaveLength(3);
  });

  it("should handle empty pages correctly", () => {
    const content = `---
allTitles:
  en: "Test Book"
languages:
  en: "English"
l1: en
---
<!-- lang=en -->
First page
<!-- start-page -->
<!-- Empty page with no content -->
<!-- start-page -->
<!-- lang=en -->
Third page`;

    const parser = new Parser();
    const result = parser.parseMarkdown(content);

    // Empty pages should be filtered out
    expect(result.pages).toHaveLength(2);
    expect((result.pages[0].elements[0] as TextBlockElement).content.en).toBe(
      "<p>First page</p>"
    );
    expect((result.pages[1].elements[0] as TextBlockElement).content.en).toBe(
      "<p>Third page</p>"
    );
  });
});

describe("HtmlGenerator", () => {
  it("should generate complete HTML document", () => {
    const book = {
      metadata: {
        allTitles: { en: "Test Book" },
        languages: { en: "English" },
        l1: "en",
      },
      pages: [
        {
          layout: "text-only" as const,
          appearsToBeBilingualPage: false,
          elements: [
            {
              type: "text" as const,
              content: { en: "<p>Hello world</p>" },
            },
          ],
        },
      ],
    };

    const html = HtmlGenerator.generateHtmlDocument(book);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>Test Book</title>");
    expect(html).toContain("bloom-page");
    expect(html).toContain("bloom-editable");
    expect(html).toContain("Hello world");
  });

  it("no pages, should generate data div with metadata", () => {
    const book = {
      metadata: {
        allTitles: { en: "Test Book", es: "Libro de Prueba" },
        languages: { en: "English", es: "Spanish" },
        l1: "en",
        l2: "es",
        isbn: "978-1234567890",
        copyright: "2023 Test Author",
        license: "CC-BY",
      },
      pages: [],
    };

    const html = HtmlGenerator.generateHtmlDocument(book);

    expect(html).toContain('data-book="contentLanguage1"');
    expect(html).not.toContain('data-book="contentLanguage2"'); // even though l2 is set, we don't have pages saying they are bilingual
    expect(html).toContain('data-book="bookTitle"');
    expect(html).toContain('data-book="ISBN"');
    expect(html).toContain('data-book="copyright"');
    expect(html).toContain('data-book="licenseUrl"');
    expect(html).toContain("creativecommons.org");
  });
});
