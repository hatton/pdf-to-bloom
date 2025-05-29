import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { pdfToBloomFolder } from "./pdfToBloom";
import { LogEntry } from "../logger";
import fs from "fs";
import path from "path";
import os from "os";

// Mock the dependencies
vi.mock("../pdf-to-markdown-and-images/pdfToMarkdownAndImageFiles", () => ({
  pdfToMarkdownAndImageFiles: vi.fn(),
}));

vi.mock("../enrich-markdown/enrichMarkdown", () => ({
  enrichMarkdown: vi.fn(),
}));

vi.mock(
  "../enriched-markdown-to-bloom-html/enrichedMarkdownToBloomHtml",
  () => ({
    enrichedMarkdownToBloomHtml: vi.fn(),
  })
);

// Import the mocked functions
import { pdfToMarkdownAndImageFiles } from "../pdf-to-markdown-and-images/pdfToMarkdownAndImageFiles";
import { enrichMarkdown } from "../enrich-markdown/enrichMarkdown";
import { enrichedMarkdownToBloomHtml } from "../enriched-markdown-to-bloom-html/enrichedMarkdownToBloomHtml";

describe("pdfToBloomFolder", () => {
  let tempDir: string;
  const mockPdfPath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "test-inputs",
    "testme.pdf"
  );
  const mockMistralApiKey = "test-api-key";
  const mockOpenRouterKey = "test-open-router-key";
  const mockMarkdown = "# Test Document\n\nThis is test content.";
  const mockEnrichedMarkdown =
    "<!-- Enriched -->\n# Test Document\n\nThis is enriched test content.";
  const mockBloomHtml =
    '<div class="bloom-book">\n<h1>Test Document</h1>\n<p>Content</p>\n</div>';

  beforeEach(() => {
    // Create a unique temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-to-bloom-test-")); // Setup default mock implementations
    vi.mocked(pdfToMarkdownAndImageFiles).mockResolvedValue(mockMarkdown);
    vi.mocked(enrichMarkdown).mockResolvedValue(mockEnrichedMarkdown);
    vi.mocked(enrichedMarkdownToBloomHtml).mockResolvedValue(mockBloomHtml);
  });

  afterEach(() => {
    // Clean up the temporary directory after each test
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Clear all mocks
    vi.clearAllMocks();
  });

  it("should complete the full PDF to Bloom conversion pipeline", async () => {
    const logs: LogEntry[] = [];

    const result = await pdfToBloomFolder(
      mockPdfPath,
      tempDir,
      mockMistralApiKey,
      mockOpenRouterKey,
      (log) => logs.push(log)
    );

    // Verify the pipeline was called in correct order
    expect(pdfToMarkdownAndImageFiles).toHaveBeenCalledWith(
      mockPdfPath,
      tempDir,
      mockMistralApiKey,
      expect.any(Function)
    );
    expect(enrichMarkdown).toHaveBeenCalledWith(
      mockMarkdown,
      mockOpenRouterKey,
      expect.objectContaining({
        logCallback: expect.any(Function),
      })
    );
    expect(enrichedMarkdownToBloomHtml).toHaveBeenCalledWith(
      mockEnrichedMarkdown,
      expect.objectContaining({
        logCallback: expect.any(Function),
      })
    );

    // Verify the HTML file was created
    const expectedFilePath = path.join(tempDir, "bloom.html");
    expect(fs.existsSync(expectedFilePath)).toBe(true);

    // Verify the file content
    const fileContent = fs.readFileSync(expectedFilePath, "utf8");
    expect(fileContent).toBe(mockBloomHtml);

    // Verify the returned path
    expect(result).toBe(expectedFilePath);

    // Verify logging messages
    expect(
      logs.some(
        (log) =>
          log.level === "info" &&
          log.message === `Starting PDF to Bloom conversion for: ${mockPdfPath}`
      )
    ).toBe(true);

    expect(
      logs.some(
        (log) =>
          log.level === "verbose" &&
          log.message === "PDF to Markdown conversion completed"
      )
    ).toBe(true);

    expect(
      logs.some(
        (log) =>
          log.level === "verbose" &&
          log.message === "Markdown enrichment completed"
      )
    ).toBe(true);

    expect(
      logs.some(
        (log) =>
          log.level === "verbose" &&
          log.message === "Bloom HTML conversion completed"
      )
    ).toBe(true);

    expect(
      logs.some(
        (log) =>
          log.level === "info" &&
          log.message === `Saving Bloom HTML to: ${expectedFilePath}`
      )
    ).toBe(true);

    expect(
      logs.some(
        (log) =>
          log.level === "info" &&
          log.message === "Bloom HTML file created successfully"
      )
    ).toBe(true);
  });

  it("should handle errors in pdfToMarkdownAndImageFiles step", async () => {
    const logs: LogEntry[] = [];
    const errorMessage = "PDF conversion failed";

    vi.mocked(pdfToMarkdownAndImageFiles).mockRejectedValue(
      new Error(errorMessage)
    );

    await expect(
      pdfToBloomFolder(
        mockPdfPath,
        tempDir,
        mockMistralApiKey,
        mockOpenRouterKey,
        (log) => logs.push(log)
      )
    ).rejects.toThrow(errorMessage);

    // Verify subsequent steps were not called
    expect(enrichMarkdown).not.toHaveBeenCalled();
    expect(enrichedMarkdownToBloomHtml).not.toHaveBeenCalled();

    // Verify no HTML file was created
    const expectedFilePath = path.join(tempDir, "bloom.html");
    expect(fs.existsSync(expectedFilePath)).toBe(false);
  });

  it("should handle errors in enrichMarkdown step", async () => {
    const logs: LogEntry[] = [];
    const errorMessage = "Markdown enrichment failed";

    vi.mocked(enrichMarkdown).mockRejectedValue(new Error(errorMessage));

    await expect(
      pdfToBloomFolder(
        mockPdfPath,
        tempDir,
        mockMistralApiKey,
        mockOpenRouterKey,
        (log) => logs.push(log)
      )
    ).rejects.toThrow(errorMessage);

    // Verify pdfToMarkdownAndImageFiles was called
    expect(pdfToMarkdownAndImageFiles).toHaveBeenCalled();

    // Verify enrichedMarkdownToBloomHtml was not called
    expect(enrichedMarkdownToBloomHtml).not.toHaveBeenCalled();

    // Verify no HTML file was created
    const expectedFilePath = path.join(tempDir, "bloom.html");
    expect(fs.existsSync(expectedFilePath)).toBe(false);
  });

  it("should handle errors in enrichedMarkdownToBloomHtml step", async () => {
    const logs: LogEntry[] = [];
    const errorMessage = "Bloom HTML generation failed";
    vi.mocked(enrichedMarkdownToBloomHtml).mockImplementation(() => {
      return Promise.reject(new Error(errorMessage));
    });

    await expect(
      pdfToBloomFolder(
        mockPdfPath,
        tempDir,
        mockMistralApiKey,
        mockOpenRouterKey,
        (log) => logs.push(log)
      )
    ).rejects.toThrow(errorMessage);

    // Verify previous steps were called
    expect(pdfToMarkdownAndImageFiles).toHaveBeenCalled();
    expect(enrichMarkdown).toHaveBeenCalled();

    // Verify no HTML file was created
    const expectedFilePath = path.join(tempDir, "bloom.html");
    expect(fs.existsSync(expectedFilePath)).toBe(false);
  });

  it("should handle file system errors when writing HTML", async () => {
    const logs: LogEntry[] = [];
    const invalidOutputDir = "/invalid/path/that/does/not/exist";

    await expect(
      pdfToBloomFolder(
        mockPdfPath,
        invalidOutputDir,
        mockMistralApiKey,
        mockOpenRouterKey,
        (log) => logs.push(log)
      )
    ).rejects.toThrow();

    // Verify all processing steps were completed
    expect(pdfToMarkdownAndImageFiles).toHaveBeenCalled();
    expect(enrichMarkdown).toHaveBeenCalled();
    expect(enrichedMarkdownToBloomHtml).toHaveBeenCalled();
  });

  it("should work without log callback", async () => {
    const result = await pdfToBloomFolder(
      mockPdfPath,
      tempDir,
      mockMistralApiKey,
      mockOpenRouterKey
    );

    // Verify the pipeline completed successfully
    expect(pdfToMarkdownAndImageFiles).toHaveBeenCalled();
    expect(enrichMarkdown).toHaveBeenCalled();
    expect(enrichedMarkdownToBloomHtml).toHaveBeenCalled();

    // Verify the HTML file was created
    const expectedFilePath = path.join(tempDir, "bloom.html");
    expect(fs.existsSync(expectedFilePath)).toBe(true);
    expect(result).toBe(expectedFilePath);
  });

  it("should pass logCallback to all pipeline steps", async () => {
    const mockLogCallback = vi.fn();

    await pdfToBloomFolder(
      mockPdfPath,
      tempDir,
      mockMistralApiKey,
      mockOpenRouterKey,
      mockLogCallback
    );

    // Verify logCallback was passed to each step
    expect(pdfToMarkdownAndImageFiles).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(Function)
    );
    expect(enrichMarkdown).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        logCallback: expect.any(Function),
      })
    );
    expect(enrichedMarkdownToBloomHtml).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        logCallback: expect.any(Function),
      })
    );
  });

  it("should create HTML file with correct content and encoding", async () => {
    const logs: LogEntry[] = [];
    const customHtml = '<div class="bloom-book"><h1>Custom Content</h1></div>';

    vi.mocked(enrichedMarkdownToBloomHtml).mockResolvedValue(customHtml);

    const result = await pdfToBloomFolder(
      mockPdfPath,
      tempDir,
      mockMistralApiKey,
      mockOpenRouterKey,
      (log) => logs.push(log)
    );

    // Read the file and verify content
    const fileContent = fs.readFileSync(result, "utf8");
    expect(fileContent).toBe(customHtml);

    // Verify UTF-8 encoding by checking that we can read it as string
    expect(typeof fileContent).toBe("string");
  });

  it("should generate correct output file path", async () => {
    const customOutputDir = path.join(tempDir, "custom", "nested", "path");
    fs.mkdirSync(customOutputDir, { recursive: true });

    const result = await pdfToBloomFolder(
      mockPdfPath,
      customOutputDir,
      mockMistralApiKey,
      mockOpenRouterKey
    );

    const expectedPath = path.join(customOutputDir, "bloom.html");
    expect(result).toBe(expectedPath);
    expect(fs.existsSync(expectedPath)).toBe(true);
  });
});
