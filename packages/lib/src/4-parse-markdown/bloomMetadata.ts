import * as yaml from "js-yaml";
import type { BookMetadata, ValidationError } from "../types";

export class BloomMetadataParser {
  private errors: ValidationError[] = [];

  /**
   * Extract frontmatter from markdown content
   */
  public extractFrontmatter(content: string): {
    frontmatter: string;
    body: string;
  } {
    const frontmatterMatch = content.match(/^---\r?\n(.*?)\r?\n---\r?\n(.*)$/s);
    if (!frontmatterMatch) {
      this.addError("No YAML frontmatter found");
      return { frontmatter: "", body: content };
    }

    return {
      frontmatter: frontmatterMatch[1],
      body: frontmatterMatch[2],
    };
  }

  /**
   * Parse YAML frontmatter text into BookMetadata
   */
  public parseMetadata(frontmatterText: string): BookMetadata {
    try {
      const metadata = yaml.load(frontmatterText) as BookMetadata;
      this.validateMetadata(metadata);
      return metadata;
    } catch (error) {
      this.addError(`Failed to parse YAML frontmatter: ${error}`);
      return {} as BookMetadata;
    }
  }

  /**
   * Validate that required metadata fields are present and valid
   */
  public validateMetadata(metadata: BookMetadata): boolean {
    if (!metadata.allTitles) {
      this.addError("Missing required field: allTitles");
    }
    if (!metadata.languages) {
      this.addError("Missing required field: languages");
    }
    if (!metadata.l1) {
      this.addError("Missing required field: l1");
    }

    // Validate l1 exists in languages
    if (metadata.l1 && metadata.languages && !metadata.languages[metadata.l1]) {
      this.addError(`Primary language '${metadata.l1}' not found in languages`);
    }

    // Validate l2 exists in languages if specified
    if (metadata.l2 && metadata.languages && !metadata.languages[metadata.l2]) {
      this.addError(
        `Secondary language '${metadata.l2}' not found in languages`
      );
    }

    // return true if no errors
    return this.errors.length === 0;
  }

  /**
   * Get all validation errors
   */
  public getErrors(): ValidationError[] {
    return this.errors;
  }

  /**
   * Clear all validation errors
   */
  public clearErrors(): void {
    this.errors = [];
  }

  private addError(message: string): void {
    this.errors.push({ type: "error", message });
  }
}
