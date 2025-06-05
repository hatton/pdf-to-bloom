// Here we want to do the final bit of any logic work and add that to the markdown.
// We do this still in the format so that it is easier for a human to inspect the plan.
// Later we're go to HTML and by then it's really hard to wade through what was done.

// The plan includes:
// - for each page
// -- we need to look at the pattern of texts and images and choose a Bloom page layout
// -- decide if it is a bilingual page or not
// -- decide if it is front matter or back matter page which we want to strip out
// of the book we'll produce because the way Bloom works, all metadata is put in the book as such,
// and it's a runtime thing to generate pages to show that metadata in whatever way the current settings want.
// We then add that information to the <!-- page --> comment in the markdown.

export function addBloomPlanToMarkdown(markdown: string): string {
  let output = "";
  // add everything up to the first <!-- page --> comment
  output += markdown.split("<!-- page -->")[0] || "";

  return output;
}

function choosePageLayout(pageContent: string) {
  return "just-text"; // Placeholder for actual logic to determine layout
}

function isBilingualPage(pageContent: string): boolean {
  // Placeholder for actual logic to determine if the page is bilingual
  return false;
}

function getPageType(
  pageContent: string
): "front-matter" | "back-matter" | "content" {
  // Placeholder for actual logic to determine if the page is front matter, back matter, or content
  return "content";
}
