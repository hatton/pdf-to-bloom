import { describe, it, expect } from "vitest";
import { attemptCleanup } from "./post-llm-cleanup";

const validFrontmatter = `---
allTitles:
  en: "Book"
languages:
  en: "English"
l1: en
---`;

function wrapWithFrontmatter(body: string): string {
  return `${validFrontmatter}\n${body}`;
}

describe("attemptCleanup", () => {
  it("strips code block wrappers", () => {
    const wrapped = `\`\`\`\n${wrapWithFrontmatter('<!-- text lang="en" -->\nText')}\n\`\`\``;
    const result = attemptCleanup(wrapped);
    expect(result.valid).toBe(true);
    expect(result.cleaned).not.toContain("```");
    expect(result.cleaned.startsWith("---")).toBe(true);
  });

  it("fixes missing opening yaml delimiter", () => {
    const input = `allTitles:\n  en: Book\nlanguages:\n  en: English\nl1: en\n<!-- text lang=\"en\" -->\nText`;
    const result = attemptCleanup(input);
    expect(result.valid).toBe(true);
    expect(result.cleaned.startsWith("---")).toBe(true);
    expect(result.cleaned).toContain('---\n<!-- text lang="en" -->');
  });

  it("reorders language comments after images", () => {
    const input = wrapWithFrontmatter(
      `<!-- text lang="en" -->\n![img](img.png){width=150}`
    );
    const result = attemptCleanup(input);
    expect(result.valid).toBe(true);
    expect(result.cleaned).toMatch(
      /!\[img\]\(img.png\)\{width=150\}\n<!-- text lang="en" -->/
    );
  });

  it("removes code blocks from content", () => {
    const input = wrapWithFrontmatter(
      `<!-- text lang="en" -->\nHere is code:\n\`\`\`js\nconsole.log('hi');\n\`\`\``
    );
    const result = attemptCleanup(input);
    expect(result.valid).toBe(true);
    expect(result.cleaned).not.toContain("```");
    expect(result.cleaned).toContain("console.log('hi');");
  });

  it("returns invalid when required fields are missing", () => {
    const bad = `---\nallTitles:\n  en: Book\n---\n<!-- text lang="en" -->\ntext`;
    const result = attemptCleanup(bad);
    expect(result.valid).toBe(false);
  });

  it("removes code block lines while preserving content", () => {
    const input = wrapWithFrontmatter(
      `<!-- text lang="en" -->\nHere is some text:\n\`\`\`bash\necho "hello"\nls -la\n\`\`\`\n\nAnd more text:\n\`\`\`\nsome plain code\nmore code\n\`\`\``
    );
    const result = attemptCleanup(input);
    expect(result.valid).toBe(true);
    expect(result.cleaned).not.toContain("```");
    expect(result.cleaned).not.toContain("bash");
    expect(result.cleaned).toContain('echo "hello"');
    expect(result.cleaned).toContain("ls -la");
    expect(result.cleaned).toContain("some plain code");
    expect(result.cleaned).toContain("more code");
  });

  it("handles yaml code block with markdown text properly", () => {
    const input = `\`\`\`yaml
languages:
  gn: "Gondi"
  en: "English"
  l1: "gn"
  l2: "en"
\`\`\`
\`\`\`markdown
<!-- text lang="zxx" -->
\`\`\``;
    const result = attemptCleanup(input);
    expect(result.valid).toBe(true);
    expect(result.cleaned).not.toContain("```");
    expect(result.cleaned).not.toContain("yaml");
    expect(result.cleaned).not.toContain("markdown");
    expect(result.cleaned).toContain("languages:");
    expect(result.cleaned).toContain('<!-- text lang="zxx" -->');
    expect(result.cleaned.startsWith("---")).toBe(true);
  });

  it("removes various language specifiers as standalone lines", () => {
    const input = wrapWithFrontmatter(`python
<!-- text lang="en" -->
Some text
typescript
More text
bash
Final text`);
    const result = attemptCleanup(input);
    expect(result.valid).toBe(true);
    expect(result.cleaned).not.toContain("python");
    expect(result.cleaned).not.toContain("typescript");
    expect(result.cleaned).not.toContain("bash");
    expect(result.cleaned).toContain('<!-- text lang="en" -->');
    expect(result.cleaned).toContain("Some text");
    expect(result.cleaned).toContain("More text");
    expect(result.cleaned).toContain("Final text");
  });

  it("preserves legitimate single-word content that doesn't look like language identifiers", () => {
    const input = wrapWithFrontmatter(`<!-- text lang="en" -->
Text with special chars!
Some normal text
Text-with-hyphens but spaces
Final text`);
    const result = attemptCleanup(input);
    expect(result.valid).toBe(true);
    expect(result.cleaned).toContain("Text with special chars!");
    expect(result.cleaned).toContain("Text-with-hyphens but spaces");
    expect(result.cleaned).toContain("Some normal text");
    expect(result.cleaned).toContain("Final text");
  });

  it("handles malformed code blocks with both ``` and language specifiers", () => {
    const input = wrapWithFrontmatter(`<!-- text lang="en" -->
Some text
\`\`\`
yaml
More text
\`\`\`python
Final text`);
    const result = attemptCleanup(input);
    expect(result.valid).toBe(true);
    expect(result.cleaned).not.toContain("```");
    expect(result.cleaned).not.toContain("yaml");
    expect(result.cleaned).not.toContain("python");
    expect(result.cleaned).toContain("Some text");
    expect(result.cleaned).toContain("More text");
    expect(result.cleaned).toContain("Final text");
  });
});
