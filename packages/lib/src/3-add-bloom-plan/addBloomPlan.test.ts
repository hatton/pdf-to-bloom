describe("3-process-tagged-markdown", () => {
  it("should detect page layouts correctly", () => {
    const content = `---
allTitles:
  en: "Test Book"
languages:
  en: "English"
l1: en
---
![Test Image](test-image.png)
<!-- text lang="en" -->
Text after image
<!-- page -->
<!-- text lang="en" -->
Text before image
![Test Image](test-image.png)
<!-- page -->
<!-- text lang="en" -->
Text only page`;

    // todo
  });
});
