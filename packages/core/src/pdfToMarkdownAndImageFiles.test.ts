import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { pdfToMarkdownAndImageFiles } from "./pdfToMarkdownAndImageFiles";
import { LogEntry } from "./logger";
import fs from "fs";
import path from "path";
import os from "os";

describe("pdfToMarkdownAndImageFiles", () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a unique temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-to-bloom-test-"));
  });

  afterEach(() => {
    // Clean up the temporary directory after each test
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should throw error when API key is missing", async () => {
    const logs: LogEntry[] = [];

    await expect(
      pdfToMarkdownAndImageFiles("/test.pdf", tempDir, "", (log) =>
        logs.push(log)
      )
    ).rejects.toThrow("MistralAI API key is required");

    expect(
      logs.some(
        (log) =>
          log.level === "error" &&
          log.message === "MistralAI API key is required"
      )
    ).toBe(true);
  });

  it("should log conversion process", async () => {
    const logs: LogEntry[] = [];
    const result = await pdfToMarkdownAndImageFiles(
      "/test.pdf",
      tempDir,
      "valid-key",
      (log) => logs.push(log)
    );

    expect(
      logs.some(
        (log) =>
          log.level === "info" &&
          log.message.includes("Starting PDF to markdown conversion")
      )
    ).toBe(true);
    expect(logs.some((log) => log.level === "verbose")).toBe(true);
    expect(
      logs.some(
        (log) =>
          log.level === "info" &&
          log.message === "PDF to markdown conversion completed successfully"
      )
    ).toBe(true);
    expect(result).toContain("# Document from /test.pdf");
  });

  it("should create files in the output directory", async () => {
    const logs: LogEntry[] = [];
    await pdfToMarkdownAndImageFiles("/test.pdf", tempDir, "valid-key", (log) =>
      logs.push(log)
    );

    // Verify that the image file was created in the temp directory
    const imagePath = path.join(tempDir, "image1.png");
    expect(fs.existsSync(imagePath)).toBe(true);

    // Verify the content of the created file
    const imageContent = fs.readFileSync(imagePath, "utf8");
    expect(imageContent).toBe("pretend image content");
  });
});
