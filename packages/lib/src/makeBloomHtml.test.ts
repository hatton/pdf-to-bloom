import { describe, it, expect } from "vitest";
import { makeBloomHtml } from "./makeBloomHtml";
import { LogEntry } from "./logger";

describe("makeBloomHtml", () => {
  it("should log HTML conversion process", async () => {
    const logs: LogEntry[] = [];
    const result = await makeBloomHtml(
      "# Test Title\n\nSome content",
      undefined,
      {
        logCallback: (log) => logs.push(log),
      }
    );

    expect(
      logs.some(
        (log) =>
          log.level === "info" &&
          log.message === "Starting markdown to Bloom HTML conversion"
      )
    ).toBe(true);
    expect(logs.some((log) => log.level === "verbose")).toBe(true);
    expect(
      logs.some(
        (log) =>
          log.level === "info" &&
          log.message === "Bloom HTML conversion completed successfully"
      )
    ).toBe(true);
    expect(result).toContain('<div class="bloom-book">');
  });

  it("should work without options", async () => {
    const result = await makeBloomHtml("# Test Title\n\nSome content");
    expect(result).toContain('<div class="bloom-book">');
  });

  it("should work with partial options", async () => {
    const result = await makeBloomHtml(
      "# Test Title\n\nSome content",
      undefined,
      {
        customStyles: "custom-style",
        outputFormat: "enhanced",
      }
    );
    expect(result).toContain('<div class="bloom-book enhanced">');
    expect(result).toContain("<style>custom-style</style>");
  });

  it("should apply custom styles when provided", async () => {
    const customStyles = ".bloom-page { margin: 20px; }";
    const result = await makeBloomHtml("# Test Title", undefined, {
      customStyles,
    });
    expect(result).toContain(`<style>${customStyles}</style>`);
  });

  it("should apply enhanced output format", async () => {
    const result = await makeBloomHtml("# Test Title", undefined, {
      outputFormat: "enhanced",
    });
    expect(result).toContain('<div class="bloom-book enhanced">');
  });

  it("should use standard output format by default", async () => {
    const result = await makeBloomHtml("# Test Title");
    expect(result).toContain('<div class="bloom-book">');
    expect(result).not.toContain("enhanced");
  });

  it("should re-enrich markdown when enrichment options and API key are provided", async () => {
    const logs: LogEntry[] = [];
    const result = await makeBloomHtml("# Test Title", "fake-api-key", {
      logCallback: (log) => logs.push(log),
      overridePrompt: "Custom prompt",
    });

    expect(
      logs.some(
        (log) =>
          log.level === "verbose" &&
          log.message === "Re-enriching markdown with provided options..."
      )
    ).toBe(true);
    expect(result).toContain('<div class="bloom-book">');
  });

  it("should not re-enrich when enrichment options provided but no API key", async () => {
    const logs: LogEntry[] = [];
    const result = await makeBloomHtml("# Test Title", undefined, {
      logCallback: (log) => logs.push(log),
      overridePrompt: "Custom prompt",
    });

    expect(
      logs.some(
        (log) =>
          log.message === "Re-enriching markdown with provided options..."
      )
    ).toBe(false);
    expect(result).toContain('<div class="bloom-book">');
  });
});
