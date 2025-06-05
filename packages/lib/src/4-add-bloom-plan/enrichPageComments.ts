export function addPageAttributes(pageMarkdown: string): string {
  if (!pageMarkdown.startsWith("<!-- page ")) {
    throw new Error("Page markdown must start with a <!-- page --> comment.");
  }

  // todo: to the <!-- page --> comments, add
  // 1) `template="whatever"`
  // 2) `type="t"` where t is one of front-matter|back-matter|content
  // 3) `bilingual="true|false"`

  return pageMarkdown;
}
