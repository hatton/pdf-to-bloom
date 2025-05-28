import { describe, it, expect } from "vitest";
import { makeBloomHtml } from "./makeBloomHtml";
import { LogEntry } from "./logger";

describe("makeBloomHtml", () => {
  it("should log HTML conversion process", () => {
    const logs: LogEntry[] = [];
    const result = makeBloomHtml("# Test Title\n\nSome content", {
      logCallback: (log) => logs.push(log),
    });

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

  it("should work without options", () => {
    const result = makeBloomHtml("# Test Title\n\nSome content");
    expect(result).toContain('<div class="bloom-book">');
  });

  it("should work with partial options", () => {
    const result = makeBloomHtml("# Test Title\n\nSome content", {
      customStyles: "custom-style",
      outputFormat: "enhanced",
    });
    expect(result).toContain('<div class="bloom-book">');
  });
});
