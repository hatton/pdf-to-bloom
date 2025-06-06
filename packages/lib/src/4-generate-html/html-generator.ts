import escapeHtml from "escape-html";
import { mapLicense } from "./licenses.js";
import type {
  Book,
  Page,
  PageElement,
  TextBlockElement,
  ImageElement,
} from "../types.js";
import { BookMetadata } from "../3-add-bloom-plan/bloomMetadata.js";
import {
  generateOrigamiHtml,
  Orientation,
  type OrigamiItem,
  type TextOrigamiItem,
} from "./origami.js";

// A note about bloom-monolingual, bloom-bilingual, and bloom-trilingual
// Although they show up on page divs, they are put there at runtime, so
// this converter doesn't need to add them, and if it does, they will
// just be overwritten.

export class HtmlGenerator {
  public static generateHtmlDocument(
    book: Book,
    _logCallback?: (message: string) => void
  ): string {
    return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="Generator" content="PDF-to-Bloom Converter" />
    <meta name="BloomFormatVersion" content="2.1" />
    <title>${escapeHtml(
      book.metadata.allTitles[book.metadata.l1] || "Untitled"
    )}</title>
  </head>
  <body>
    ${this.generateBloomDataDiv(book.metadata, book.pages)}
    ${book.pages
      .map((page) => this.generatePage(page, book.metadata))
      .join("\n")}
  </body>
</html>`;
  }

  private static generateBloomDataDiv(
    metadata: BookMetadata,
    pages: Page[]
  ): string {
    const elements: string[] = [];

    elements.push(`<div id="bloomDataDiv">
      <div data-book="contentLanguage1" lang="*">${metadata.l1}</div>`);

    if (metadata.l2) {
      const bilingualContentPages = pages.filter(
        (page) => page.appearsToBeBilingualPage
      ).length;
      if (bilingualContentPages > pages.length / 2) {
        elements.push(
          `      <div data-book="contentLanguage2" lang="*">${metadata.l2}</div>`
        );
      }
    }

    if (metadata.coverImage) {
      elements.push(
        `      <div data-book="coverImage" lang="*">${escapeHtml(metadata.coverImage)}</div>`
      );
    }

    for (const [lang, title] of Object.entries(metadata.allTitles)) {
      elements.push(
        `      <div data-book="bookTitle" lang="${lang}">${escapeHtml(title)}</div>`
      );
    }

    if (metadata.isbn) {
      elements.push(
        `      <div data-book="ISBN" lang="*">${escapeHtml(metadata.isbn)}</div>`
      );
    }

    if (metadata.copyright) {
      elements.push(
        `      <div data-book="copyright" lang="*">${escapeHtml(metadata.copyright)}</div>`
      );
    }

    if (metadata.license) {
      const licenseUrl = mapLicense(metadata.license);
      elements.push(
        `      <div data-book="licenseUrl" lang="*">${escapeHtml(licenseUrl)}</div>`
      );
    }

    elements.push("    </div>");
    return elements.join("\n");
  }

  private static generatePage(page: Page, metadata: BookMetadata): string {
    const origamiItems: OrigamiItem[] = [];

    // Determine if the page structure matches a [Text, Image, Text] sequence
    // This is relevant for assigning "V" and "N1" for bilingual T-I-T pages.
    const isTITSequence =
      page.elements.length === 3 &&
      page.elements[0].type === "text" &&
      page.elements[1].type === "image" &&
      page.elements[2].type === "text";

    page.elements.forEach((element: PageElement, index: number) => {
      if (element.type === "text") {
        const textElement = element as TextBlockElement;
        const textItem: TextOrigamiItem = {
          type: "text",
          content: textElement.content,
        };

        // Condition for a page that is solely L2 text
        if (
          page.elements.length === 1 && // Only one element on the page
          metadata.l2 &&
          Object.keys(textElement.content).length === 1 && // Text element has content for only one language
          textElement.content[metadata.l2] // And that language is L2
        ) {
          textItem.translationGroupDefaultLangVariables = ["N1"];
        }
        // Condition for bilingual Text-Image-Text pages
        else if (page.appearsToBeBilingualPage && isTITSequence) {
          if (index === 0) {
            // First text element in T-I-T
            textItem.translationGroupDefaultLangVariables = ["V"];
          } else if (index === 2) {
            // Second text element in T-I-T (at element index 2)
            textItem.translationGroupDefaultLangVariables = ["N1"];
          }
        }
        origamiItems.push(textItem);
      } else if (element.type === "image") {
        const imageElement = element as ImageElement;
        origamiItems.push({ type: "image", src: imageElement.src });
      }
    });

    // If, after processing, no origami items were created (e.g., page.elements was empty),
    // default to a single empty text block.
    if (origamiItems.length === 0) {
      origamiItems.push({ type: "text", content: {} });
    }

    // All current Bloom top-level page layouts are vertical stacks,
    // which means the splits are horizontal.
    // In origami.ts, Orientation.Portrait leads to horizontal splits.
    const orientation = Orientation.Portrait;
    const origamiContent = generateOrigamiHtml(origamiItems, orientation);

    // TODO: Add classes like 'numberedPage', 'bloom-frontMatter', 'rightPage', 'leftPage'
    // to 'bloom-page' div based on page properties (e.g., page.type) if available/needed.
    // For now, 'customPage' is used as a general class.
    // The `page.type` property could be used here.
    let pageClasses = "bloom-page customPage";
    if (page.type === "front-matter") {
      pageClasses += " bloom-frontMatter";
    } else if (page.type === "back-matter") {
      pageClasses += " bloom-backMatter";
    }
    // Consider adding 'numberedPage' if it's a content page, etc.

    return `    <div class="${pageClasses.trim()}">
      <div class="marginBox">
        ${origamiContent}
      </div>
    </div>`;
  }
}
