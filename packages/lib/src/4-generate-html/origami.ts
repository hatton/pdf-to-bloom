export type ItemType = "text" | "image";

export enum Orientation {
  Portrait = "portrait",
  Landscape = "landscape",
}

/**
 * Generates Bloom HTML for a given sequence of items and orientation.
 * @returns The generated HTML string.
 * @throws Error if the input sequence is empty.
 */
export function generateOrigamiHtml(
  sequence: ItemType[],
  orientation: Orientation = Orientation.Portrait
): string {
  if (!sequence || sequence.length === 0) {
    throw new Error("Input sequence cannot be empty.");
  }

  if (sequence.length === 1) {
    // Single item: just the inner component with the placeholder.
    const itemType = sequence[0];
    return `
<div class="split-pane-component-inner">
  <!-- ${itemType}-block goes here !-->
</div>`.trim();
  }
  // Multiple items: start with a split pane structure.
  return buildSplitPane(sequence, orientation);
}

/**
 * Recursively builds the HTML for a split pane structure.
 * @returns HTML string for the split pane.
 */
function buildSplitPane(
  currentSequence: ItemType[],
  orientation: Orientation = Orientation.Portrait
): string {
  const firstItemType = currentSequence[0];
  const remainingItemsSequence = currentSequence.slice(1);

  // Content for the first pane is always a placeholder for the first item.
  const contentForFirstPane = `<!-- ${firstItemType}-block goes here !-->`;

  let contentForSecondPane: string;
  if (remainingItemsSequence.length === 1) {
    // If only one item remains, it's a placeholder for the second pane.
    const secondPaneItemType = remainingItemsSequence[0];
    contentForSecondPane = `<!-- ${secondPaneItemType}-block goes here !-->`;
  } else {
    // If multiple items remain, the second pane contains another nested split.
    contentForSecondPane = buildSplitPane(remainingItemsSequence, orientation);
  }
  // the labels we have to emit are the opposite of actual orientation
  // they refer to the orientation of the split, not the orientation of the content
  const splitOrientation =
    orientation === Orientation.Landscape ? "vertical" : "horizontal";
  // Determine CSS classes based on orientation
  const splitPaneClass = `split-pane ${splitOrientation}-percent`;
  const firstPositionClass = `split-pane-component position-${
    splitOrientation === "horizontal" ? "top" : "left"
  }`;
  const dividerClass = `split-pane-divider ${splitOrientation}-divider`;
  const secondPositionClass = `split-pane-component position-${
    splitOrientation === "horizontal" ? "bottom" : "right"
  }`;

  // Assemble the HTML structure for this split level.
  // Using .trim() on the template literal removes leading/trailing newlines
  // and whitespace, making the output cleaner and easier to normalize for tests.
  return `
<div class="${splitPaneClass}">
  <div class="${firstPositionClass}">
    <div class="split-pane-component-inner">
      ${contentForFirstPane}
    </div>
  </div>
  <div class="${dividerClass}"></div>
  <div class="${secondPositionClass}">
    <div class="split-pane-component-inner">
      ${contentForSecondPane}
    </div>
  </div>
</div>`.trim();
}
