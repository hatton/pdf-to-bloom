// Here we find any front or back matter info that isn't safely represented in the metadata
// and add it to some special "unknown" metadata fields so that it isn't lost.

export function finalMetadataPlan(markdown: string): object {
  const output: Record<string, any> = {};
  const frontMatterRegex = /---\s*([\s\S]*?)\s*---/;
  const frontMatterMatch = markdown.match(frontMatterRegex);

  if (frontMatterMatch) {
    const frontMatterContent = frontMatterMatch[1];
    const frontMatterLines = frontMatterContent
      .split("\n")
      .map((line) => line.trim());

    for (const line of frontMatterLines) {
      if (line) {
        const [key, ...valueParts] = line.split(":");
        const value = valueParts.join(":").trim();
        output[key] = value;
      }
    }
  }

  return output;
}
