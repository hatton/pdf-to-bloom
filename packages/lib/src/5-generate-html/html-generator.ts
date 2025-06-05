import escapeHtml from "escape-html";
import { mapLicense } from "./licenses.js";
import type { Book, PageContent } from "../types.js";
import { BookMetadata } from "../3-add-bloom-plan/bloomMetadata.js";

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
    pages: PageContent[]
  ): string {
    const elements: string[] = [];

    // Content languages
    elements.push(`<div id="bloomDataDiv">
      <div data-book="contentLanguage1" lang="*">${metadata.l1}</div>`);

    if (metadata.l2) {
      // hack only do this if we have a the majority of pages marked as multilingual
      const bilingualContentPages = pages.filter(
        (page) => page.appearsToBeBilingualPage
      ).length;
      if (bilingualContentPages > pages.length / 2) {
        elements.push(
          `      <div data-book="contentLanguage2" lang="*">${metadata.l2}</div>`
        );
      }
    }

    // Cover image
    if (metadata.coverImage) {
      elements.push(
        `      <div data-book="coverImage" lang="*">${escapeHtml(metadata.coverImage)}</div>`
      );
    }

    // Book titles
    for (const [lang, title] of Object.entries(metadata.allTitles)) {
      elements.push(
        `      <div data-book="bookTitle" lang="${lang}">${escapeHtml(title)}</div>`
      );
    }

    // ISBN
    if (metadata.isbn) {
      elements.push(
        `      <div data-book="ISBN" lang="*">${escapeHtml(metadata.isbn)}</div>`
      );
    }

    // Copyright
    if (metadata.copyright) {
      elements.push(
        `      <div data-book="copyright" lang="*">${escapeHtml(metadata.copyright)}</div>`
      );
    }

    // License URL
    if (metadata.license) {
      const licenseUrl = mapLicense(metadata.license);
      elements.push(
        `      <div data-book="licenseUrl" lang="*">${escapeHtml(licenseUrl)}</div>`
      );
    }

    elements.push("    </div>");
    return elements.join("\n");
  }

  private static generatePage(
    page: PageContent,
    metadata: BookMetadata
  ): string {
    switch (page.layout) {
      case "image-only":
        return this.generateImageOnlyPage(page);
      case "image-top-text-bottom":
        return this.generateImageTopTextBottomPage(page, metadata);
      case "text-top-image-bottom":
        return this.generateTextTopImageBottomPage(page, metadata);
      case "text-image-text":
        // "auto", "V", and "N1" are values that can go in the data-default-languages attribute of a translationGroup.
        // We normally use these instead of actual language codes
        return this.generateImageInMiddlePage(page, metadata, "auto", "auto");
      case "bilingual-text-image-text":
        return this.generateImageInMiddlePage(page, metadata, "V", "N1");
      case "text-only":
      default:
        return this.generateTextOnlyPage(page, metadata);
    }
  }
  private static generateImageTopTextBottomPage(
    page: PageContent,
    _metadata: BookMetadata
  ): string {
    const imageElement = page.elements.find((el) => el.type === "image");
    const textElement = page.elements.find((el) => el.type === "text");

    return `    <div class="bloom-page customPage">
      <div class="marginBox">
        <div class="split-pane horizontal-percent">
          <div class="split-pane-component position-top">
            ${this.imageBlock(imageElement ? imageElement.src : "")}
          </div>
          <div class="split-pane-divider horizontal-divider"></div>
          <div class="split-pane-component position-bottom">
              ${this.textBlock(textElement ? (textElement as any).content : {})}
          </div>
        </div>
      </div>
    </div>`;
  }
  private static generateTextTopImageBottomPage(
    page: PageContent,
    _metadata: BookMetadata
  ): string {
    const imageElement = page.elements.find((el) => el.type === "image");
    const textElement = page.elements.find((el) => el.type === "text");

    return `    <div class="bloom-page customPage ">
      <div class="marginBox">
        <div class="split-pane horizontal-percent">
          <div class="split-pane-component position-top">
            ${this.textBlock(textElement ? (textElement as any).content : {})}
          </div>
          <div class="split-pane-divider horizontal-divider"></div>
          <div class="split-pane-component position-bottom">
            ${this.imageBlock(imageElement ? imageElement.src : "")}
          </div>
        </div>
      </div>
    </div>`;
  }

  private static generateTextOnlyPage(
    page: PageContent,
    metadata: BookMetadata
  ): string {
    const textGroup = page.elements.find((el) => el.type === "text");

    // if the textGroup has only the L2 content, we can use a special class
    if (
      textGroup &&
      Object.keys((textGroup as any).content).length === 1 &&
      metadata.l2 !== undefined &&
      (textGroup as any).content[metadata.l2] !== undefined
    ) {
      return `<div class="bloom-page customPage ">
              <div class="marginBox">
                ${
                  this.textBlock(textGroup ? (textGroup as any).content : {}, [
                    "N1",
                  ]) // for some historical reason, N1 is used for the second language
                }
              </div>
            </div>`;
    } else
      return `<div class="bloom-page customPage ">
              <div class="marginBox">
                ${this.textBlock(textGroup ? (textGroup as any).content : {})}
              </div>
            </div>`;
  }

  private static generateImageOnlyPage(page: PageContent): string {
    const imageElement = page.elements.find((el) => el.type === "image");

    return `<div class="bloom-page customPage ">
              <div class="marginBox">
                  ${this.imageBlock(imageElement ? imageElement.src : "")}              </div>
            </div>`;
  }
  private static generateImageInMiddlePage(
    page: PageContent,
    _metadata: BookMetadata,
    topLangPlaceholder: string, // "V" or "N1"
    bottomLangPlaceholder: string // "V" or "N1"
  ): string {
    const imageElement = page.elements.find((el) => el.type === "image");
    const textElements = page.elements.filter((el) => el.type === "text");

    // Combine all text content for each section
    const topTextContent: Record<string, string> = {};
    const bottomTextContent: Record<string, string> = {};

    // For text-image-text layout, we need to distribute text elements
    if (textElements.length > 0) {
      // First text element goes to top
      if (textElements[0]) {
        Object.assign(topTextContent, (textElements[0] as any).content);
      }

      // If there's a second text element, it goes to bottom
      if (textElements.length > 1 && textElements[1]) {
        Object.assign(bottomTextContent, (textElements[1] as any).content);
      }
      // If only one text element, it goes to both top and bottom (for text-image-text)
      else if (textElements.length === 1) {
        Object.assign(bottomTextContent, (textElements[0] as any).content);
      }
    } // const topLangs = this._getLangsForPlaceholder(topLangPlaceholder, metadata);
    // const bottomLangs = this._getLangsForPlaceholder(
    //   bottomLangPlaceholder,
    //   metadata
    // );

    return `<div class="bloom-page customPage ">
          <div class="marginBox">
            <div class="split-pane horizontal-percent">
                <div class="split-pane-component position-top" >
                   ${this.textBlock(topTextContent, [topLangPlaceholder])}
                </div>
                <div class="split-pane-divider horizontal-divider"></div>
                <div class="split-pane-component position-middle">
                    <div class="split-pane-component-inner">
                <div class="bloom-canvas bloom-leadingElement bloom-has-canvas-element">
                    <div class="bloom-canvas-element bloom-backgroundImage">
                        <div class="bloom-leadingElement bloom-imageContainer">
                          <img src="${escapeHtml(imageElement?.src || "")}" />
                        </div>
                    </div>
                </div>
            </div>
                </div>
                <div class="split-pane-divider horizontal-divider"></div>
                <div class="split-pane-component position-bottom">
                    ${this.textBlock(bottomTextContent, [bottomLangPlaceholder])}
                </div>
            </div>
          </div>
        </div>`;
  }
  private static imageBlock(src: string | undefined): string {
    return `<div class="split-pane-component-inner">
                <div class="bloom-canvas bloom-leadingElement bloom-has-canvas-element">
                    <div class="bloom-canvas-element bloom-backgroundImage">
                        <div class="bloom-leadingElement bloom-imageContainer">
                          <img src="${escapeHtml(src || "")}" />
                        </div>
                    </div>
                </div>
            </div>`;
  }

  private static textBlock(
    textBlocks: Record<string, string>,
    translationGroupDefaultLangVariables?: string[] // normally "V", or "N1"
  ): string {
    const bloomEditableDivs: string[] = [];

    // iterate over the languages and create a bloom-editable div for each
    for (const lang of Object.keys(textBlocks)) {
      const paragraphs: string[] = [];
      const content = textBlocks[lang];

      // Don't wrap in <p> if content already contains block-level HTML tags
      const shouldWrapInParagraph =
        !/<(h[1-6]|p|div|ul|ol|li|blockquote|hr|table|figure|figcaption)/i.test(
          content
        );

      paragraphs.push(shouldWrapInParagraph ? `<p>${content}</p>` : content);

      bloomEditableDivs.push(
        `<div class="bloom-editable" lang="${lang}">
                ${paragraphs.join("\n")}
          </div>`
      );
    }

    // note this starts with a space so we can cram it against the class attr
    const defLangsAttr = translationGroupDefaultLangVariables
      ? ` data-default-languages="${translationGroupDefaultLangVariables.join(",")}"`
      : "";

    return `<div class="split-pane-component-inner">
              <div class="bloom-translationGroup"${defLangsAttr}>
                ${bloomEditableDivs.join("\n")}
              </div>
            </div>`;
  }
}
