# CV import fidelity increment (2026-11-17)

**Status:** development candidate, unmerged, release **NO-GO**. Frozen E20–E31 HTML snapshots, generated site and persistent profile contracts remain untouched.

## Included
- DOCX OOXML document/header/footer extraction retains table cell and row boundaries. Styles.xml paragraph/run visibility including inherited hidden styles is reviewed; deleted tracked-change content is omitted. Hyperlink display labels are retained and link destinations explicitly called out for human inspection.
- ZIP reader now validates CRC32, duplicate selected filenames and local/central directory consistency before trusting an extracted Word document or LinkedIn export.
- Text CV parser handles split role title / employer / date lines, numeric month-year ranges and a leading bullet without crashing or assigning it as a job title. Unmapped header lines are retained in the review for reconstruction.
- PDF import adapter provides page-scoped text/provenance and an opt-in offline OCR hook. There is **no online document upload**. No PDF processing or CV data is persisted by this adapter.
- ImportReview keeps original text, warnings, proposed fields, source references and pending decisions. Approval must be explicit; a separate profile is created. Existing CVs are not silently replaced.

## Limitations / integration requirements
- src/features/import/pdf-import.mjs needs a **locally bundled** PDF.js getDocument implementation supplied by Group A/B at the application boundary. Generic PDF parsing is not yet enabled in the published workspace UI. Historical PDF OCR candidates have not been rewritten or promoted.
- Scanned pages still need a bundled, genuinely running offline OCR adapter and explicit allowOcr; absent OCR, page text is marked unavailable, not guessed.
- Complex multi-column PDFs, Word drawings, text boxes, alt text, non-English OCR and unusual date layouts need representative golden-corpus validation. Exact PDF/DOCX field-by-field reconstruction accuracy has not been measured.
- OCR confidence is an engine-reported value, **not** a validated probability of correctness. Never use it to auto-approve a fact.
- Existing approveImportReview creates a new career profile and does not atomically merge into an existing master. That non-destructive policy is intentional.

## Reproduction / gates
Run: node --test tests/documents/*.test.mjs. Then run the inherited suite and an actual PDF/DOCX input corpus after integration. Require original-vs-reconstructed side-by-side human checks, Windows Word/native browsers, multilingual text, mobile memory, malformed archive and visual reading order QA.

No deployment, live LinkedIn access, customer data, purchase, cloud sync or release approval is implied.
