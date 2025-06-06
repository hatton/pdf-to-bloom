import { describe, it, expect } from "vitest";
import { HtmlGenerator } from "./html-generator";

describe("generateHtmlDocument", () => {
  it("should convert simple book to Bloom HTML", () => {
    const book = {
      metadata: {
        allTitles: { en: "Test Book" },
        languages: { en: "English" },
        l1: "en",
      },
      pages: [
        {
          type: "content" as const,
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

    const result = HtmlGenerator.generateHtmlDocument(book, () => {});

    expect(result).toContain("<!doctype html>");
    expect(result).toContain("<title>Test Book</title>");
    expect(result).toContain("Hello world");
    expect(result).toContain("bloom-editable");
  });

  it("should generate complete HTML document", () => {
    const book = {
      metadata: {
        allTitles: { en: "Test Book" },
        languages: { en: "English" },
        l1: "en",
      },
      pages: [
        {
          type: "content" as const,
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

  describe("multiple pages", () => {
    it("should generate HTML for multiple pages with different types", () => {
      const book = {
        metadata: {
          allTitles: { en: "Test Book" },
          languages: { en: "English" },
          l1: "en",
        },
        pages: [
          {
            type: "front-matter" as const,
            appearsToBeBilingualPage: false,
            elements: [
              {
                type: "text" as const,
                content: { en: "<p>Title Page</p>" },
              },
            ],
          },
          {
            type: "content" as const,
            appearsToBeBilingualPage: false,
            elements: [
              {
                type: "text" as const,
                content: { en: "<p>First content page</p>" },
              },
              {
                type: "image" as const,
                src: "image1.jpg",
              },
            ],
          },
          {
            type: "content" as const,
            appearsToBeBilingualPage: false,
            elements: [
              {
                type: "text" as const,
                content: { en: "<p>Second content page</p>" },
              },
            ],
          },
          {
            type: "back-matter" as const,
            appearsToBeBilingualPage: false,
            elements: [
              {
                type: "text" as const,
                content: { en: "<p>Back matter</p>" },
              },
            ],
          },
        ],
      };

      const html = HtmlGenerator.generateHtmlDocument(book);

      // Should contain all page content
      expect(html).toContain("Title Page");
      expect(html).toContain("First content page");
      expect(html).toContain("Second content page");
      expect(html).toContain("Back matter");
      expect(html).toContain("image1.jpg");

      // Should have correct page classes
      expect(html).toContain('class="bloom-page customPage bloom-frontMatter"');
      expect(html).toContain('class="bloom-page customPage bloom-backMatter"');

      // Should have multiple content pages without special matter classes
      const contentPageMatches = html.match(
        /class="bloom-page customPage"(?! bloom-)/g
      );
      expect(contentPageMatches).toHaveLength(2); // Two content pages
    });

    it("should handle bilingual pages correctly", () => {
      const book = {
        metadata: {
          allTitles: { en: "Test Book", es: "Libro de Prueba" },
          languages: { en: "English", es: "Spanish" },
          l1: "en",
          l2: "es",
        },
        pages: [
          {
            type: "content" as const,
            appearsToBeBilingualPage: true,
            elements: [
              {
                type: "text" as const,
                content: {
                  en: "<p>English text</p>",
                  es: "<p>Texto en español</p>",
                },
              },
            ],
          },
          {
            type: "content" as const,
            appearsToBeBilingualPage: true,
            elements: [
              {
                type: "text" as const,
                content: {
                  en: "<p>More English</p>",
                  es: "<p>Más español</p>",
                },
              },
            ],
          },
        ],
      };

      const html = HtmlGenerator.generateHtmlDocument(book);

      // Should contain both languages
      expect(html).toContain("English text");
      expect(html).toContain("Texto en español");
      expect(html).toContain("More English");
      expect(html).toContain("Más español");

      // Should include L2 in data div since more than half of pages are bilingual
      expect(html).toContain('data-book="contentLanguage2"');
      expect(html).toContain(">es</div>");
    });

    it("should handle Text-Image-Text bilingual pages with special translation groups", () => {
      const book = {
        metadata: {
          allTitles: { en: "Test Book", fr: "Livre de Test" },
          languages: { en: "English", fr: "French" },
          l1: "en",
          l2: "fr",
        },
        pages: [
          {
            type: "content" as const,
            appearsToBeBilingualPage: true,
            elements: [
              {
                type: "text" as const,
                content: {
                  en: "<p>First text</p>",
                  fr: "<p>Premier texte</p>",
                },
              },
              {
                type: "image" as const,
                src: "middle-image.jpg",
              },
              {
                type: "text" as const,
                content: {
                  en: "<p>Second text</p>",
                  fr: "<p>Deuxième texte</p>",
                },
              },
            ],
          },
        ],
      };

      const html = HtmlGenerator.generateHtmlDocument(book);

      expect(html).toContain("First text");
      expect(html).toContain("Premier texte");
      expect(html).toContain("middle-image.jpg");
      expect(html).toContain("Second text");
      expect(html).toContain("Deuxième texte");

      // Should contain V and N1 translation group variables for T-I-T pattern
      expect(html).toContain('data-default-languages="V"');
      expect(html).toContain('data-default-languages="N1"');
    });

    it("should handle L2-only page with N1 translation group", () => {
      const book = {
        metadata: {
          allTitles: { en: "Test Book", fr: "Livre de Test" },
          languages: { en: "English", fr: "French" },
          l1: "en",
          l2: "fr",
        },
        pages: [
          {
            type: "content" as const,
            appearsToBeBilingualPage: false,
            elements: [
              {
                type: "text" as const,
                content: {
                  fr: "<p>Seulement en français</p>",
                },
              },
            ],
          },
        ],
      };

      const html = HtmlGenerator.generateHtmlDocument(book);

      expect(html).toContain("Seulement en français");
      expect(html).toContain('data-default-languages="N1"');
    });

    it("should handle pages with mixed content types", () => {
      const book = {
        metadata: {
          allTitles: { en: "Mixed Content Book" },
          languages: { en: "English" },
          l1: "en",
        },
        pages: [
          {
            type: "content" as const,
            appearsToBeBilingualPage: false,
            elements: [
              {
                type: "image" as const,
                src: "first-image.jpg",
              },
              {
                type: "text" as const,
                content: { en: "<p>Text after image</p>" },
              },
              {
                type: "image" as const,
                src: "second-image.jpg",
              },
            ],
          },
        ],
      };

      const html = HtmlGenerator.generateHtmlDocument(book);

      expect(html).toContain("first-image.jpg");
      expect(html).toContain("Text after image");
      expect(html).toContain("second-image.jpg");
    });

    it("should handle empty pages gracefully", () => {
      const book = {
        metadata: {
          allTitles: { en: "Empty Pages Book" },
          languages: { en: "English" },
          l1: "en",
        },
        pages: [
          {
            type: "empty" as const,
            appearsToBeBilingualPage: false,
            elements: [],
          },
        ],
      };

      const html = HtmlGenerator.generateHtmlDocument(book);

      // Should still generate a page with an empty text block
      expect(html).toContain('class="bloom-page customPage"');
      expect(html).toContain("marginBox");
    });
  });

  describe("generateBloomDataDiv", () => {
    it("should generate basic data div with required fields", () => {
      const book = {
        metadata: {
          allTitles: { en: "Simple Book" },
          languages: { en: "English" },
          l1: "en",
        },
        pages: [],
      };

      const html = HtmlGenerator.generateHtmlDocument(book);

      expect(html).toContain('<div id="bloomDataDiv">');
      expect(html).toContain('data-book="contentLanguage1" lang="*">en</div>');
      expect(html).toContain(
        'data-book="bookTitle" lang="en">Simple Book</div>'
      );
      expect(html).not.toContain('data-book="contentLanguage2"');
    });

    it("should include L2 when more than half of pages are bilingual", () => {
      const book = {
        metadata: {
          allTitles: { en: "Bilingual Book", es: "Libro Bilingüe" },
          languages: { en: "English", es: "Spanish" },
          l1: "en",
          l2: "es",
        },
        pages: [
          {
            type: "content" as const,
            appearsToBeBilingualPage: true,
            elements: [
              { type: "text" as const, content: { en: "test", es: "prueba" } },
            ],
          },
          {
            type: "content" as const,
            appearsToBeBilingualPage: true,
            elements: [
              {
                type: "text" as const,
                content: { en: "test2", es: "prueba2" },
              },
            ],
          },
          {
            type: "content" as const,
            appearsToBeBilingualPage: false,
            elements: [
              { type: "text" as const, content: { en: "english only" } },
            ],
          },
        ],
      };

      const html = HtmlGenerator.generateHtmlDocument(book);

      expect(html).toContain('data-book="contentLanguage1" lang="*">en</div>');
      expect(html).toContain('data-book="contentLanguage2" lang="*">es</div>');
    });

    it("should not include L2 when less than half of pages are bilingual", () => {
      const book = {
        metadata: {
          allTitles: { en: "Mostly Monolingual", es: "Mayormente Monolingüe" },
          languages: { en: "English", es: "Spanish" },
          l1: "en",
          l2: "es",
        },
        pages: [
          {
            type: "content" as const,
            appearsToBeBilingualPage: true,
            elements: [
              { type: "text" as const, content: { en: "test", es: "prueba" } },
            ],
          },
          {
            type: "content" as const,
            appearsToBeBilingualPage: false,
            elements: [
              { type: "text" as const, content: { en: "english only 1" } },
            ],
          },
          {
            type: "content" as const,
            appearsToBeBilingualPage: false,
            elements: [
              { type: "text" as const, content: { en: "english only 2" } },
            ],
          },
        ],
      };

      const html = HtmlGenerator.generateHtmlDocument(book);

      expect(html).toContain('data-book="contentLanguage1" lang="*">en</div>');
      expect(html).not.toContain('data-book="contentLanguage2"');
    });

    it("should include all titles for multiple languages", () => {
      const book = {
        metadata: {
          allTitles: {
            en: "Multi-Language Book",
            es: "Libro Multi-Idioma",
            fr: "Livre Multi-Langues",
          },
          languages: { en: "English", es: "Spanish", fr: "French" },
          l1: "en",
        },
        pages: [],
      };

      const html = HtmlGenerator.generateHtmlDocument(book);

      expect(html).toContain(
        'data-book="bookTitle" lang="en">Multi-Language Book</div>'
      );
      expect(html).toContain(
        'data-book="bookTitle" lang="es">Libro Multi-Idioma</div>'
      );
      expect(html).toContain(
        'data-book="bookTitle" lang="fr">Livre Multi-Langues</div>'
      );
    });
    it("should include optional metadata fields when present", () => {
      const book = {
        metadata: {
          allTitles: { en: "Complete Metadata Book" },
          languages: { en: "English" },
          l1: "en",
          coverImage: "cover.jpg",
          isbn: "978-1234567890",
          copyright: "Copyright © 2023 Test Author",
          license: "CC-BY",
        },
        pages: [],
      };

      const html = HtmlGenerator.generateHtmlDocument(book);

      expect(html).toContain('data-book="coverImage" lang="*">cover.jpg</div>');
      expect(html).toContain('data-book="ISBN" lang="*">978-1234567890</div>');
      expect(html).toContain(
        'data-book="copyright" lang="*">Copyright © 2023 Test Author</div>'
      );
      expect(html).toContain('data-book="licenseUrl" lang="*">');
      expect(html).toContain("creativecommons.org"); // License should be mapped to URL
    });

    it("should escape HTML characters in metadata", () => {
      const book = {
        metadata: {
          allTitles: { en: 'Book with <tags> & "quotes"' },
          languages: { en: "English" },
          l1: "en",
          copyright: 'Copyright © 2023 <Publisher> & "Authors"',
        },
        pages: [],
      };

      const html = HtmlGenerator.generateHtmlDocument(book);

      expect(html).toContain("Book with &lt;tags&gt; &amp; &quot;quotes&quot;");
      expect(html).toContain(
        "Copyright © 2023 &lt;Publisher&gt; &amp; &quot;Authors&quot;"
      );
      expect(html).not.toContain("<tags>");
      expect(html).not.toContain("<Publisher>");
    });

    it("should handle missing optional fields gracefully", () => {
      const book = {
        metadata: {
          allTitles: { en: "Minimal Book" },
          languages: { en: "English" },
          l1: "en",
          // No optional fields
        },
        pages: [],
      };

      const html = HtmlGenerator.generateHtmlDocument(book);

      expect(html).toContain('<div id="bloomDataDiv">');
      expect(html).toContain('data-book="contentLanguage1"');
      expect(html).toContain('data-book="bookTitle"');
      expect(html).not.toContain('data-book="coverImage"');
      expect(html).not.toContain('data-book="ISBN"');
      expect(html).not.toContain('data-book="copyright"');
      expect(html).not.toContain('data-book="licenseUrl"');
    });
  });
});
