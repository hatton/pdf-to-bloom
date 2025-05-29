import { describe, it, expect } from "vitest";
import { enrichMarkdown } from "./enrichMarkdown";
import { LogEntry } from "../logger";

describe("enrichMarkdown", () => {
  it("should throw error when API key is missing", async () => {
    const logs: LogEntry[] = [];

    await expect(
      enrichMarkdown("# Test", "", { logCallback: (log) => logs.push(log) })
    ).rejects.toThrow("OpenRouter API key is required");

    expect(
      logs.some(
        (log) =>
          log.level === "error" &&
          log.message === "OpenRouter API key is required"
      )
    ).toBe(true);
  });
  it("should log enrichment process", async () => {
    const logs: LogEntry[] = [];
    const result = await enrichMarkdown("# Test", "valid-key", {
      logCallback: (log) => logs.push(log),
    });

    expect(
      logs.some(
        (log) =>
          log.level === "info" &&
          log.message === "Starting markdown enrichment process"
      )
    ).toBe(true);
    expect(
      logs.some(
        (log) =>
          log.level === "info" &&
          log.message === "Markdown enrichment completed successfully"
      )
    ).toBe(true);
    expect(result).toContain("<!-- Enriched Content via OpenRouter -->");
  });
  it("should work without options", async () => {
    const result = await enrichMarkdown("# Test", "valid-key");
    expect(result).toContain("<!-- Enriched Content via OpenRouter -->");
  });

  it("should work with partial options", async () => {
    const result = await enrichMarkdown("# Test", "valid-key", {
      overridePrompt: "Custom prompt",
      overrideModel: "custom-model",
    });
    expect(result).toContain("<!-- Enriched Content via OpenRouter -->");
  });
});
