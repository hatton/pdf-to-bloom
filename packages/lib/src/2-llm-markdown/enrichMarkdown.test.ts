import { describe, it, expect, vi } from "vitest";
import { enrichMarkdown } from "./enrichMarkdown";
import { LogEntry } from "../logger";

// Mock the AI SDK generateText function
vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: "<!-- Enriched Content via OpenRouter -->\n\n# Test Content\n\nThis is enriched test content.",
  }),
}));

// Mock the OpenRouter provider
vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: vi.fn().mockReturnValue(() => ({})),
}));

describe("enrichMarkdown", () => {
  it("should return cleaned up markdown string from llmMarkdown", async () => {
    const result = await enrichMarkdown("# Test", "valid-key");

    // enrichMarkdown should return a string, not an object
    expect(typeof result).toBe("string");
    expect(result).toContain("<!-- Enriched Content via OpenRouter -->");
  });

  it("should work with options", async () => {
    const logs: LogEntry[] = [];
    const result = await enrichMarkdown("# Test", "valid-key", {
      logCallback: (log) => logs.push(log),
      overridePrompt: "Custom prompt",
    });

    expect(typeof result).toBe("string");
    expect(result).toContain("<!-- Enriched Content via OpenRouter -->");
    expect(logs.length).toBeGreaterThan(0);
  });

  it("should throw error when API key is missing", async () => {
    await expect(enrichMarkdown("# Test", "")).rejects.toThrow(
      "OpenRouter API key is required"
    );
  });
});
