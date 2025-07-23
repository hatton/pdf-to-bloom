# OCR instructions

Convert this to markdown. starting with the very first line and then again for each page, insert a <!-- page-index="1" -->. Drop the text giving the page number at the bottom. For images, include a markdown image reference. Be super careful with the transcription, preferring the embedded unicode over optical recognition. This may include minority language text with unusual characters. Therefore, do not omit or substitute any characters, and preserve all Unicode exactly as present, including rare IPA symbols and diacritics

# tiger.pdf

- old with fuzzy text (no embedded text)

# gondi-immunisations.pdf

- from bloom
- the telugu script is really hard
- mistral converts the title to year numbers
- unpdf can't get the spacing right between gondi letters

# bilingual-sample

- from adobe illustrator
- has invisible English text that unpdf doens't know how to hide

# pineapple

- from MS Publisher
- most of the metadata is on the last page
- goofy layout around the CC license that would take human level intelligence to sort out
- empty "ISBN:"

# children-com

- from PBT, MS Publisher
- mistral turns all ɨ (barred i) into ł (barred l)
- gemini 2.5 pro does it too (even weirder, "agɨlasaŋ" becomes "agiɫasaŋ"). Even after asking it to improve, it still made way too many errors. (e.g. "Jisasɨ ninanadi agɨlasaŋ mavɨn hɨnimi" became "Jisasɨ ninanadɨ agɨɫasaŋ mavɨn hinimi")
- 4o did it perfectly
