import { addBloomPlanToMarkdown } from "./addBloomPlan";
describe("3-process-tagged-markdown", () => {
  it("should detect page layouts correctly", () => {
    const content = `---
allTitles:
  en: "This is the title"
languages:
  en: "English"
l1: en
---
<!-- page type="cover" -->
<!-- text lang="en" -->
This is the title
![](image0.png)

<!-- page type="content" template="text"-->
<!-- text lang="en" -->
Just some text

<!-- page type="content" template="text-image" -->
<!-- text lang="en" -->
Text before image
![](image1.png)
`;
    const output = `---
allTitles:
  en: "This is the title"
languages:
  en: "English"
l1: en
---
<!-- page type="content" template="text"-->
<!-- text lang="en" -->
Just some text

<!-- page type="content" template="text-image" -->
<!-- text lang="en" -->
Text before image
![](image1.png)
`;

    const result = addBloomPlanToMarkdown(content);
  });
});
