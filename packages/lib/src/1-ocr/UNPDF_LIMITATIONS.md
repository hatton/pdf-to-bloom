# unpdf PDF Processing Limitations

## Known Issue: Hidden Text Extraction

### Problem

The unpdf approach extracts ALL text operations from PDF structure, including text that may not be visually rendered when viewing the PDF. This results in additional content appearing in the extracted markdown that is not visible to users viewing the PDF in standard PDF viewers.

### Affected PDFs

This issue has been observed with PDFs created using:

- Adobe Illustrator
- Adobe Distiller

The specific test case that demonstrates this issue is `test-inputs/bilingual-sample.pdf`, which contains an embedded English story summary that appears in unpdf extraction but is not visually displayed when viewing the PDF.

### Comparison: unpdf vs Mistral OCR

#### unpdf Approach

- **Method**: Structural text extraction from PDF operations
- **Extracts**: All text in PDF structure, including hidden/searchable layers
- **Result**: May include non-visible text content
- **Use case**: When you need access to all embedded text data

#### Mistral AI OCR Approach

- **Method**: Vision-based OCR of rendered PDF pages
- **Extracts**: Only visually displayed text
- **Result**: What you see is what you get
- **Use case**: When you want only visible content

### Technical Details

The hidden text appears to be embedded in the PDF structure but not rendered through standard PDF graphics state operations like:

- Text rendering mode (invisible text)
- Clipping paths
- Color/opacity settings
- Graphics state transformations

This suggests the text may be in annotation layers, metadata, or other non-display PDF structures that unpdf processes but PDF viewers ignore during rendering.

### Recommendation

Choose the appropriate method based on your needs:

- Use `--pdf unpdf` when you need comprehensive text extraction including hidden content
- Use the default Mistral AI approach when you want only visually displayed content

### Future Improvements

A potential solution would be to implement PDF rendering comparison to filter out non-visible text, but this would significantly increase complexity and processing requirements.
