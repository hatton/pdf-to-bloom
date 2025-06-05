import { addPageAttributes } from "./enrichPageComments";
import { finalMetadataPlan } from "./finalMetadataPlan";

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
  /* TODO:
   1) Use addPageAttributes() to enrich the page comments with the necessary attributes
   2) Use finalMetadataPlan() to finalize the metadata
   3) return the enriched markdown
   */

  return markdown;
}

function choosePageLayout(pageContent: string) {
  // TODO: see layout-determiner.ts for the logic to determine the layout
  // TODO: we want to move that logic here so that we can use it in the addBloomPlan.ts
  return "text"; // Placeholder for actual logic to determine layout
}

function isBilingualPage(pageContent: string): boolean {
  // When a page has two or more consecutive text blocks in two different languages, without any intervening images,
  // we consider it bilingual.
  const textBlocks = pageContent.match(/<!-- text lang="([a-z]{2,3})" -->/g);
  if (!textBlocks) return false;

  const uniqueLangs = new Set(
    textBlocks
      .map((block) => {
        const match = block.match(/lang="([a-z]{2,3})"/);
        return match ? match[1] : "";
      })
      .filter((lang) => lang !== "")
  );
  return uniqueLangs.size > 1;
}

function getPageType(
  pageContent: string
): "front-matter" | "back-matter" | "content" {
  // We consider front-matter to be a cover, title page, and credits page. (We do not consider TOC, dedication, etc. to be front matter).
  // Some books then include back matter.
  // Here we want to identify front-matter, back-matter, and content pages using some heuristics.
  // E.g. non-content pages should have <!-- text --> blocks that have a "field" attribute, e.g. <!-- text lang="en" field="title" -->
  // and <!-- text lang="en" field="copyright" -->.
  // Once we identify our first content page, all pages are content pages until we hit a back-matter page.
  return "content";
}
