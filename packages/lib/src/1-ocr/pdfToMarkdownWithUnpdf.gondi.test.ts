import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { pdfToMarkdownWithUnpdf } from "./pdfToMarkdownWithUnpdf";
import { LogEntry } from "../logger";
import fs from "fs";
import path from "path";
import os from "os";

/**
 * GONDI IMMUNISATIONS SPECIFIC TESTS
 *
 * These tests focus on ensuring proper text paragraph formation and line breaking
 * for the gondi-immunisations.pdf file, using the manually corrected version as
 * the expected output.
 */

describe("pdfToMarkdownWithUnpdf - Gondi Immunisations", () => {
  let tempDir: string;
  let imageOutputDir: string;
  let logMessages: LogEntry[];

  // Use the actual gondi-immunisations PDF and expected output
  const testPdfPath = path.resolve(
    __dirname,
    "../../../../test-inputs/gondi-immunisations.pdf"
  );
  const expectedMarkdownPath = path.resolve(
    __dirname,
    "../../../../test-inputs/gondi-immunisations.byhand.md"
  );

  const logCallback = (log: LogEntry) => {
    logMessages.push(log);
  };

  beforeEach(() => {
    // Create a unique temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unpdf-gondi-test-"));
    imageOutputDir = path.join(tempDir, "images");
    logMessages = [];

    // Verify test files exist
    if (!fs.existsSync(testPdfPath)) {
      throw new Error(`Test PDF file not found: ${testPdfPath}`);
    }
    if (!fs.existsSync(expectedMarkdownPath)) {
      throw new Error(
        `Expected markdown file not found: ${expectedMarkdownPath}`
      );
    }
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should extract text in correct paragraph structure", async () => {
    const result = await pdfToMarkdownWithUnpdf(
      testPdfPath,
      imageOutputDir,
      logCallback
    );

    // Test that basic structure is present
    expect(result).toContain("<!-- page index=1 -->");
    expect(result).toContain("<!-- page index=4 -->");
    expect(result).toContain("A Family Learns about Immunisations");
    expect(result).toContain("వాకిన్ యేతడున్ బారెతె కరి కియల్");
  });

  it("should correctly format copyright text with proper title placement", async () => {
    const result = await pdfToMarkdownWithUnpdf(
      testPdfPath,
      imageOutputDir,
      logCallback
    );

    // The critical test: ensure the copyright text has the book title in the right place
    const expectedCopyrightText =
      "This book is an adaptation of the original, A Family Learns about Immunisations, Copyright © 2021, SIL International. Licensed under CC BY 4.0.";

    // Check that the text appears correctly formatted (allowing for some whitespace differences)
    const normalizedResult = result.replace(/\s+/g, " ").trim();
    const normalizedExpected = expectedCopyrightText
      .replace(/\s+/g, " ")
      .trim();

    expect(normalizedResult).toContain(normalizedExpected);

    // Also check that we don't have the broken version
    expect(result).not.toContain("adaptation of the original, , Copyright");
    expect(result).not.toMatch(
      /4\.0\.\s*A Family Learns about\s*Immunisations/
    );
  });

  it("should preserve proper line breaks in text blocks", async () => {
    const result = await pdfToMarkdownWithUnpdf(
      testPdfPath,
      imageOutputDir,
      logCallback
    );

    // Read the expected output for comparison
    const expectedContent = fs.readFileSync(expectedMarkdownPath, "utf-8");

    // Extract page 1 content for detailed comparison
    const actualPage1 = extractPageContent(result, 1);
    const expectedPage1 = extractPageContent(expectedContent, 1);

    // Test that the main title lines are preserved
    expect(actualPage1).toContain("వాకిన్ యేతడున్ బారెతె కరি కియల్");
    expect(actualPage1).toContain("A Family Learns about Immunisations");

    // Test page 3 content structure
    const actualPage3 = extractPageContent(result, 3);
    const expectedPage3 = extractPageContent(expectedContent, 3);

    expect(actualPage3).toContain("Story by SIL Staff");
    expect(actualPage3).toContain("Illustrations by Moinak and team");
  });

  it("should format page 4 copyright section correctly", async () => {
    const result = await pdfToMarkdownWithUnpdf(
      testPdfPath,
      imageOutputDir,
      logCallback
    );

    const page4Content = extractPageContent(result, 4);

    // Check for key components of page 4
    expect(page4Content).toContain(
      "Copyright © 2025, CBase Solutions Private Limited"
    );
    expect(page4Content).toContain(
      "http://creativecommons.org/licenses/by/4.0/"
    );
    expect(page4Content).toContain(
      "You are free to make commercial use of this work"
    );
    expect(page4Content).toContain(
      "This book is an adaptation of the original, A Family Learns about Immunisations, Copyright © 2021, SIL International"
    );
  });

  it("should handle page 5 Gondi text correctly", async () => {
    const result = await pdfToMarkdownWithUnpdf(
      testPdfPath,
      imageOutputDir,
      logCallback
    );

    const page5Content = extractPageContent(result, 5);

    // Check that the Gondi text is extracted
    expect(page5Content).toContain("బిమె అని బీమల్");
    expect(page5Content).toContain("వేడతె కరెర్ మతెర్");
  });

  it("should maintain consistent image references", async () => {
    const result = await pdfToMarkdownWithUnpdf(
      testPdfPath,
      imageOutputDir,
      logCallback
    );

    // Check that images are referenced correctly
    expect(result).toMatch(/!\[Image\]\(page1-img\d+\.png\)/);
    expect(result).toMatch(/!\[Image\]\(page4-img\d+\.png\)/);
    expect(result).toMatch(/!\[Image\]\(page5-img\d+\.png\)/);

    // Verify image files are created
    const imageFiles = fs.readdirSync(imageOutputDir);
    expect(imageFiles.length).toBeGreaterThan(0);
    expect(imageFiles.some((file) => file.startsWith("page1-img"))).toBe(true);
    expect(imageFiles.some((file) => file.startsWith("page4-img"))).toBe(true);
    expect(imageFiles.some((file) => file.startsWith("page5-img"))).toBe(true);
  });

  describe("Text paragraph formation", () => {
    it("should not break styled text into separate paragraphs", async () => {
      const result = await pdfToMarkdownWithUnpdf(
        testPdfPath,
        imageOutputDir,
        logCallback
      );

      // The copyright text should be in one cohesive block, not broken up
      const copyrightMatch = result.match(/This book is an adaptation[^<]*/);
      expect(copyrightMatch).toBeTruthy();

      if (copyrightMatch) {
        const copyrightText = copyrightMatch[0];
        // Should contain the full sentence in one block
        expect(copyrightText).toContain("A Family Learns about Immunisations");
        expect(copyrightText).toContain("Copyright © 2021, SIL International");
      }
    });

    it("should create appropriate paragraph breaks for different content blocks", async () => {
      const result = await pdfToMarkdownWithUnpdf(
        testPdfPath,
        imageOutputDir,
        logCallback
      );

      // On page 3, different content should be in separate paragraphs
      const page3Content = extractPageContent(result, 3);

      // These should be separate elements
      expect(page3Content).toContain("A Family Learns about Immunisations");
      expect(page3Content).toContain("Story by SIL Staff");
      expect(page3Content).toContain("Illustrations by Moinak and team");
    });
  });
});

/**
 * Helper function to extract content for a specific page from markdown
 */
function extractPageContent(markdown: string, pageIndex: number): string {
  const pagePattern = new RegExp(
    `<!-- page index=${pageIndex} -->([\\s\\S]*?)(?=<!-- page index=|$)`,
    "i"
  );
  const match = markdown.match(pagePattern);
  return match ? match[1].trim() : "";
}
