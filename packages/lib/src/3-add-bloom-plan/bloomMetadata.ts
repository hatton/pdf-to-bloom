import * as yaml from "js-yaml";
import type { ValidationError } from "../types";

export interface BookMetadata {
  allTitles: Record<string, string>;
  languages: Record<string, string>;
  l1: string; // primary language
  l2?: string; // secondary language
  coverImage?: string;
  isbn?: string;
  license?: string;
  copyright?: string;
  credits?: Record<string, string>;
  tags?: Record<string, string[]>;
  publisher?: string;
  country?: string;
  province?: string;
  district?: string;
  author?: string;
  illustrator?: string;
  originalPublisher?: string;
  acknowledgements?: string;
  fundingInfo?: string;
  [key: string]: any; // Allow additional fields
}
export class BloomMetadataParser {
  private errors: ValidationError[] = [];

  public parseOutMetadata(markdown: string): BookMetadata {
    this.errors = [];
    this.clearErrors();
    const { frontmatter } = this.extractFrontmatter(markdown);
    const metadata = this.parseMetadata(frontmatter);
    if (!metadata) {
      throw new Error("Failed to parse metadata from frontmatter");
    }
    // Merge metadata parser errors with our errors
    this.errors.push(...this.getErrors());
    if (this.errors.some((e) => e.type === "error")) {
      throw new Error(
        `Validation failed:\n${this.errors
          .map((e) => `${e.type.toUpperCase()}: ${e.message}`)
          .join("\n")}`
      );
    }
    return metadata;
  }

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
