// Here we find any front or back matter info that isn't safely represented in the metadata
// and add it to some special "unknown" metadata fields so that it isn't lost.

import { BloomMetadataParser, FrontMatterMetadata } from "./bloomMetadata";

export function finalMetadataPlan(markdown: string): FrontMatterMetadata {
  const parser = new BloomMetadataParser();
  const metadata: FrontMatterMetadata = parser.parseOutMetadata(markdown);
  // todo: we'll also need to look at all the text blocks (marked with <!-- text lang="xyz" field="foobar" --> comments)
  // todo: add any additional logic to finalize the metadata
  return metadata;
}
