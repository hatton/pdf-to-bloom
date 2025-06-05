import { describe, it, expect } from "vitest";
import { Parser } from "../4-parse-markdown/parseMarkdown";
import { HtmlGenerator } from "./html-generator";
import type { TextBlockElement, ImageElement } from "../types";

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
