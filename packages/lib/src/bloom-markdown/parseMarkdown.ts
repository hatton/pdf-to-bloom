import {
  BloomMetadataParser,
  BookMetadata,
} from "../3-add-bloom-plan/bloomMetadata";
import type {
  Book,
  Page,
  PageElement,
  TextBlockElement,
  ValidationError,
} from "../types";

export class BloomMarkdown {
  private errors: ValidationError[] = [];
  private metadataParser = new BloomMetadataParser();

  public parseMarkdown(markdown: string): Book {
    this.errors = [];
    this.metadataParser.clearErrors();

    const { frontmatter, body } =
      this.metadataParser.extractFrontmatter(markdown);
    const metadata = this.metadataParser.parseMetadata(frontmatter);
    if (!metadata) {
      throw new Error("Failed to parse metadata from frontmatter");
    }

    // Merge metadata parser errors with our errors
    this.errors.push(...this.metadataParser.getErrors());

    const pages = this.createPageObjects(body, metadata);

    if (this.errors.some((e) => e.type === "error")) {
      throw new Error(
        `Validation failed:\n${this.errors.map((e) => `${e.type.toUpperCase()}: ${e.message}`).join("\n")}`
      );
    }

    return { metadata, pages };
  }  getErrors(): ValidationError[] {
    return [...this.errors, ...this.metadataParser.getErrors()];
  }
  private createPageObjects(body: string, metadata: BookMetadata): Page[] {
    // Use regex to split on page comments with or without attributes
    const pageRegex = /<!--\s*page\s*(?:[^>]*)-->/g;
    const parts = body.split(pageRegex);
    const pages: Page[] = [];

    // Find all page comments to extract their attributes
    const pageComments = [...body.matchAll(pageRegex)];

    // Skip the first part if it's empty (before the first page comment)
    let startIndex = 0;
    if (parts[0].trim() === "") {
      startIndex = 1;
    }

    for (let i = startIndex; i < parts.length; i++) {
      const pageContent = parts[i].trim();
      if (!pageContent) continue;

      // Get the corresponding page comment (adjust index for empty first part)
      const pageCommentIndex = startIndex === 1 ? i - 1 : i;
      const pageComment = pageComments[pageCommentIndex]?.[0] || "";

      const page = this.parsePage(pageContent, metadata, i, pageComment);
      if (page) {
        pages.push(page);
      }
    }

    return pages;
  }
  private parsePage(
    content: string,
    metadata: BookMetadata,
    pageNumber: number,
    pageComment?: string
  ): Page | null {
    const lines = content.split("\n");
    const elements: PageElement[] = [];
    let currentTextBlock: TextBlockElement | null = null;
    let currentLang = "";
    let currentText = "";

    // Parse page attributes from the comment
    const pageAttributes = this.parsePageAttributes(pageComment || "");

    for (const line of lines) {
      const trimmedLine = line.trim();

      /* The algorithm:
       Go through each line:
            If the line is an image:
               1) if we have a currentTextBlock, push it to elements and set it to null.
               2) push an image element to elements.
            If the line is a lang comment:
            1) if currentTextBlock not null and already has a currentLang for this lang comment, push it to elements and set it to null.
            2) if currentTextBlock is null, create a new one.
            If the line is some text
            1) set the currentTextBlock's entry for currentLanguage to the convertMarkdownToHtml(currentText.trim()).
      When we are done with lines, if we have a currentTextBlock, push it to elements.
      */

      // Check for images
      const imageMatch = trimmedLine.match(/!\[.*?\]\(([^)]+)\)/);
      if (imageMatch) {
        // Finalize current text block before adding image
        if (currentTextBlock) {
          elements.push(currentTextBlock);
          currentTextBlock = null;
        }

        const imagePath = imageMatch[1];
        elements.push({ type: "image", src: imagePath });

        continue; // go to the next line in the markdown
      } // Check for language blocks
      const langMatch = trimmedLine.match(
        /<!-- text lang=(?:"?([a-z]{2,3})"?) -->/
      );
      if (langMatch) {
        // Finalize current text before switching languages
        if (currentTextBlock && currentLang && currentText.trim()) {
          currentTextBlock.content[currentLang] =
            this.expressMarkdownFormattingAsHtml(currentText.trim());
        }

        currentLang = langMatch[1];

        // 1) if currentTextBlock not null and already has a currentLang for this lang comment, push it to elements and set it to null.
        if (currentTextBlock && currentTextBlock.content[currentLang]) {
          elements.push(currentTextBlock);
          currentTextBlock = null;
        }

        // 2) if currentTextBlock is null, create a new one.
        if (!currentTextBlock) {
          currentTextBlock = { type: "text", content: {} };
        }

        currentTextBlock.content[currentLang] = "";
        currentText = "";

        if (!metadata.languages || !metadata.languages[currentLang]) {
          this.addWarning(
            `Encountered lang="${currentLang}" but this language is not defined in the metadata languages (page ${pageNumber}).`
          );
        }

        continue; // go to the next line in the markdown
      }

      // If the line is some text, accumulate it for the current language
      // Accumulate text for the current language
      if (currentTextBlock && currentLang) {
        currentText += trimmedLine + "\n"; // Accumulate text
      } else {
        // if the trimmed line is not empty
        if (trimmedLine.length > 0) {
          this.addWarning(
            `Found text outside of a language block (page ${pageNumber}): "${trimmedLine}"`
          );
        }
      }
    }

    // Finalize any remaining text block
    if (currentTextBlock && currentLang && currentText.trim()) {
      currentTextBlock.content[currentLang] =
        this.expressMarkdownFormattingAsHtml(currentText.trim());
    }
    if (currentTextBlock) {
      elements.push(currentTextBlock);
    }

    if (elements.length === 0) {
      return null; // No content for this page
    }

    //console.log(`Page ${pageNumber}`);

    const pattern = elements.map((e) => {
      if (e.type === "image") {
        //  console.log(`   ${index}: image`);
        return "image";
      } else if (e.type === "text") {
        // determine if we want  "l1-only", "l2-only", or "multiple-languages"
        const textBlock = e as TextBlockElement;
        const langs = Object.keys(textBlock.content);
        if (langs.length === 1) {
          const x = langs[0] === metadata.l1 ? "l1-only" : "l2-only";
          //  console.log(`   ${index}: ${x}`);
          return x;
        } else if (langs.length > 1) {
          //console.log(`   ${index}: multiple-languages`);
          return "multiple-languages";
        } else {
          //console.log(`   ${index}: PROBLEM`);
          this.addError(
            `Text block without languages found on page ${pageNumber}`
          );
        }
      }
      //console.log(`   ${index}: FALLBACK TO l1-only`);
      return "l1-only"; // Default fallback
    });
    return {
      elements,
      appearsToBeBilingualPage:
        pageAttributes.bilingual ?? pattern.includes("multiple-languages"),
      type: (pageAttributes.type as any) || "content", // Default to content type
    };
  }

  // todo this should be in its own file
  private expressMarkdownFormattingAsHtml(markdown: string): string {
    // Apply block transformations first (headings)
    let html = markdown
      .replace(/^# (.*?)$/gm, "<h1>$1</h1>")
      .replace(/^## (.*?)$/gm, "<h2>$1</h2>");
    // Add other heading levels if needed H3-H6: .replace(/^### (.*?)$/gm, "<h3>$1</h3>") etc.

    // Then apply inline transformations to the whole result
    html = html
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+?)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Now, split into paragraphs and wrap appropriately
    return html
      .split(/\n\s*\n/)
      .map((paraBlock) => {
        const trimmedParaBlock = paraBlock.replace(/\n/g, " ").trim();
        if (!trimmedParaBlock) {
          return ""; // Skip empty blocks
        }

        // If the block is already an h-tag or p-tag (or other block tags), don't wrap it in another <p>
        // Regex checks if the string STARTS with a common block tag.
        if (
          /^<(h[1-6]|p|div|ul|ol|li|blockquote|hr|table|figure|figcaption)/i.test(
            trimmedParaBlock
          )
        ) {
          return trimmedParaBlock;
        }

        // Otherwise, it's content that needs to be wrapped in a <p> tag
        return `<p>${trimmedParaBlock}</p>`;
      })
      .filter((block) => block !== "") // Remove empty strings
      .join("");
  }

  private addError(message: string): void {
    this.errors.push({ type: "error", message });
  }
  private addWarning(message: string): void {
    this.errors.push({ type: "warning", message });
  }
  private parsePageAttributes(pageComment: string): {
    type?: string;
    bilingual?: boolean;
  } {
    const attributes: { type?: string; bilingual?: boolean } = {};

    // Extract type attribute
    const typeMatch = pageComment.match(/type=["']?([^"'\s>]+)["']?/);
    if (typeMatch) {
      attributes.type = typeMatch[1];
    }

    // Extract bilingual attribute
    const bilingualMatch = pageComment.match(
      /bilingual=["']?(true|false)["']?/
    );
    if (bilingualMatch) {
      attributes.bilingual = bilingualMatch[1] === "true";
    }

    return attributes;
  }
}
