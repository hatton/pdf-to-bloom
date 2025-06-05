import { describe, it, expect } from "vitest";
import { Parser } from "./parseMarkdown";
import type { TextBlockElement, ImageElement } from "../types";

describe("parse", () => {
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
<!-- text lang="en" -->
Hello world
<!-- text lang="es" -->
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
<!-- text lang="en" -->
Text after image
<!-- page -->
<!-- text lang="en" -->
Text before image
![Test Image](test-image.png)
<!-- page -->
<!-- text lang="en" -->
Text only page`;

    const parser = new Parser();
    const result = parser.parseMarkdown(content);

    expect(result.pages).toHaveLength(3);
    expect(result.pages[0].layout).toBe("image-top-text-bottom");
    expect(result.pages[1].layout).toBe("text-top-image-bottom");
    expect(result.pages[2].layout).toBe("text-only");
  });

  // todo this should be in its own test file
  it("should convert markdown formatting to HTML", () => {
    const content = `---
allTitles:
  en: "Test Book"
languages:
  en: "English"
l1: en
---
<!-- text lang="en" -->
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
  it("should integrate metadata parsing with page parsing", () => {
    const content = `---
allTitles:
  en: "Test Book"
# Missing languages and l1
---
<!-- text lang="en" -->
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
<!-- text lang="en" -->
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
<!-- text lang="en" -->
English text
<!-- text lang="fr" -->
French text
<!-- text lang=es -->
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
<!-- page -->
<!-- text lang="en" -->
First page
<!-- page -->
<!-- Empty page with no content -->
<!-- page -->
<!-- text lang="en" -->
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
