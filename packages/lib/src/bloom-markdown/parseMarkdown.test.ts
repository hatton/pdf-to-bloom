import { describe, it, expect } from "vitest";
import { BloomMarkdown } from "./parseMarkdown";
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
    const parser = new BloomMarkdown();
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
    const parser = new BloomMarkdown();
    const result = parser.parseMarkdown(content);

    expect(result.pages).toHaveLength(3);
    // Note: layout field has been removed from Page interface
    // expect(result.pages[0].layout).toBe("image-top-text-bottom");
    // expect(result.pages[1].layout).toBe("text-image");
    // expect(result.pages[2].layout).toBe("text-only");
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
    const parser = new BloomMarkdown();
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

    const parser = new BloomMarkdown();
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

    const parser = new BloomMarkdown();
    const result = parser.parseMarkdown(content);

    expect(result.pages).toHaveLength(1);
    // Note: layout field has been removed from Page interface
    // expect(result.pages[0].layout).toBe("image-top-text-bottom");
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

    const parser = new BloomMarkdown();
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

    const parser = new BloomMarkdown();
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

  it("should handle pages with attributes correctly", () => {
    const content = `---
allTitles:
  en: "Test Book"
languages:
  en: "English"
  es: "Español"
l1: en
l2: es
---
<!-- page type="cover" bilingual="true" -->
<!-- text lang="en" -->
Cover title in English
<!-- text lang="es" -->
Cover title in Spanish
<!-- page type="content" -->
<!-- text lang="en" -->
Regular content page
<!-- page bilingual="false" -->
<!-- text lang="en" -->
Monolingual page
<!-- page type="back-matter" bilingual="true" -->
<!-- text lang="en" -->
Back matter English
<!-- text lang="es" -->
Back matter Spanish`;

    const parser = new BloomMarkdown();
    const result = parser.parseMarkdown(content);

    expect(result.pages).toHaveLength(4);

    // First page: cover with bilingual content
    expect(result.pages[0].type).toBe("cover");
    expect(result.pages[0].appearsToBeBilingualPage).toBe(true);
    expect((result.pages[0].elements[0] as TextBlockElement).content.en).toBe(
      "<p>Cover title in English</p>"
    );
    expect((result.pages[0].elements[0] as TextBlockElement).content.es).toBe(
      "<p>Cover title in Spanish</p>"
    );

    // Second page: content type (default bilingual based on content)
    expect(result.pages[1].type).toBe("content");
    expect(result.pages[1].appearsToBeBilingualPage).toBe(false);
    expect((result.pages[1].elements[0] as TextBlockElement).content.en).toBe(
      "<p>Regular content page</p>"
    );

    // Third page: explicitly not bilingual
    expect(result.pages[2].type).toBe("content"); // Default type
    expect(result.pages[2].appearsToBeBilingualPage).toBe(false);
    expect((result.pages[2].elements[0] as TextBlockElement).content.en).toBe(
      "<p>Monolingual page</p>"
    );

    // Fourth page: back-matter with bilingual content
    expect(result.pages[3].type).toBe("back-matter");
    expect(result.pages[3].appearsToBeBilingualPage).toBe(true);
    expect((result.pages[3].elements[0] as TextBlockElement).content.en).toBe(
      "<p>Back matter English</p>"
    );
    expect((result.pages[3].elements[0] as TextBlockElement).content.es).toBe(
      "<p>Back matter Spanish</p>"
    );
  });

  it("should handle pages without attributes (legacy format)", () => {
    const content = `---
allTitles:
  en: "Test Book"
languages:
  en: "English"
  es: "Español"
l1: en
l2: es
---
<!-- page -->
<!-- text lang="en" -->
First page without attributes
<!-- text lang="es" -->
First page Spanish
<!-- page -->
<!-- text lang="en" -->
Second page without attributes`;

    const parser = new BloomMarkdown();
    const result = parser.parseMarkdown(content);

    expect(result.pages).toHaveLength(2);

    // First page: should detect bilingual from content
    expect(result.pages[0].type).toBe("content"); // Default type
    expect(result.pages[0].appearsToBeBilingualPage).toBe(true); // Detected from multiple languages
    expect((result.pages[0].elements[0] as TextBlockElement).content.en).toBe(
      "<p>First page without attributes</p>"
    );
    expect((result.pages[0].elements[0] as TextBlockElement).content.es).toBe(
      "<p>First page Spanish</p>"
    );

    // Second page: monolingual
    expect(result.pages[1].type).toBe("content"); // Default type
    expect(result.pages[1].appearsToBeBilingualPage).toBe(false); // Only one language
    expect((result.pages[1].elements[0] as TextBlockElement).content.en).toBe(
      "<p>Second page without attributes</p>"
    );
  });

  it("should handle mixed attribute and non-attribute pages", () => {
    const content = `---
allTitles:
  en: "Test Book"
languages:
  en: "English"
l1: en
---
<!-- page -->
<!-- text lang="en" -->
Page without attributes
<!-- page type="front-matter" -->
<!-- text lang="en" -->
Page with type only
<!-- page bilingual="true" -->
<!-- text lang="en" -->
Page with bilingual only
<!-- page type="content" bilingual="false" -->
<!-- text lang="en" -->
Page with both attributes`;

    const parser = new BloomMarkdown();
    const result = parser.parseMarkdown(content);

    expect(result.pages).toHaveLength(4);

    // Page 1: no attributes
    expect(result.pages[0].type).toBe("content");
    expect(result.pages[0].appearsToBeBilingualPage).toBe(false);

    // Page 2: type attribute only
    expect(result.pages[1].type).toBe("front-matter");
    expect(result.pages[1].appearsToBeBilingualPage).toBe(false);

    // Page 3: bilingual attribute only
    expect(result.pages[2].type).toBe("content");
    expect(result.pages[2].appearsToBeBilingualPage).toBe(true);

    // Page 4: both attributes
    expect(result.pages[3].type).toBe("content");
    expect(result.pages[3].appearsToBeBilingualPage).toBe(false);
  });

  it("should handle various page comment formats with attributes", () => {
    const content = `---
allTitles:
  en: "Test Book"
languages:
  en: "English"
l1: en
---
<!-- page type="cover" -->
<!-- text lang="en" -->
Quoted type attribute
<!--page type=content bilingual=true-->
<!-- text lang="en" -->
No spaces, no quotes
<!--  page   type="front-matter"   bilingual="false"  -->
<!-- text lang="en" -->
Extra spaces
<!-- page bilingual='true' type='back-matter' -->
<!-- text lang="en" -->
Single quotes and different order`;

    const parser = new BloomMarkdown();
    const result = parser.parseMarkdown(content);

    expect(result.pages).toHaveLength(4);

    // Test various formatting styles are parsed correctly
    expect(result.pages[0].type).toBe("cover");
    expect(result.pages[0].appearsToBeBilingualPage).toBe(false);

    expect(result.pages[1].type).toBe("content");
    expect(result.pages[1].appearsToBeBilingualPage).toBe(true);

    expect(result.pages[2].type).toBe("front-matter");
    expect(result.pages[2].appearsToBeBilingualPage).toBe(false);

    expect(result.pages[3].type).toBe("back-matter");
    expect(result.pages[3].appearsToBeBilingualPage).toBe(true);
  });
});
