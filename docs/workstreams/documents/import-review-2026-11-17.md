# CV import fidelity increment (2026-11-17)

**Status:** development candidate, unmerged, release **NO-GO**. Frozen E20–E31 HTML snapshots, generated site and persistent profile contracts remain untouched.

## Included
- DOCX OOXML document/header/footer extraction retains table cell and row boundaries. Styles.xml paragraph/run visibility including inherited hidden styles is reviewed; deleted tracked-change content is omitted. Hyperlink display labels are retained and link destinations explicitly called out for human inspection.
- ZIP reader validates CRC32, duplicate selected filenames and local/central directory consistency; raw-deflate extraction is streamed with a strict expanded-byte bound to avoid uncontrolled decompression of malicious files.
- Text CV parser handles split role title / employer / date lines, numeric month-year ranges and a leading bullet without crashing or assigning it as a job title. Unmapped header lines are retained in the review for reconstruction. Additional headings such as publications and volunteering become explicitly reviewable custom sections; skills never receive fabricated proficiency ratings.
- The persistent Home workspace now provides PDF/DOCX/TXT/HTML file selection, locally extracted source text, editable proposed fields, individual acceptance checkboxes, final consent and creation of a **new** local CV profile. No original master or source file is overwritten.
- PDF.js 6.5.438 core and worker are copied byte-for-byte from pinned local node_modules into the hosted build, with its license; all assets are same-origin and cached offline. The adapter provides per-page text/provenance and explicitly blocks partial PDF imports when any page has no recoverable text.
- User-authorized, **trained offline English OCR** is now integrated into the hosted workspace for empty or suspiciously sparse PDF pages. Tesseract WASM 0.11.0 and the model pinned at Git blob `bbef4675053b5b468cdb477053e28b1c698ba08e` are bundled at build time, with license notices and strict page/pixel/text limits. No OCR machine result is automatically approved. A real Chromium test runs image-only PDF OCR with the browser network deliberately disabled. Explicit manual page transcription remains a fallback.
- Oversized/truncated text is blocked rather than offering a misleading partial proposed CV.
- ImportReview keeps original text, warnings, proposed fields, source references and pending decisions. Approval must be explicit; a separate profile is created. Existing CVs are not silently replaced.

## Limitations / integration requirements
- The source workspace tests can run without a copied PDF.js module; direct PDF import requires the **built hosted site** so /pdf-engine/pdf.mjs and /pdf-engine/pdf.worker.mjs are present. A hosted Chromium test now exercises the actual built PDF engine against a synthetic generated PDF. This test must pass in CI before acceptance.
- Automatic OCR runs **only at explicit user request**, in the hosted build with local English model/worker; mixed-script, rotated, handwritten, low-quality and large scans are not automatically supported or accepted. Historical E25–E28 frozen builds are not changed. This does NOT establish robust scanned-PDF OCR accuracy.
- Complex multi-column PDFs, Word drawings, text boxes, alt text, non-English OCR and unusual date layouts need representative golden-corpus validation. Exact PDF/DOCX field-by-field reconstruction accuracy has not been measured.
- OCR confidence is an engine-reported value, **not** a validated probability of correctness. Never use it to auto-approve a fact.
- Existing approveImportReview creates a new career profile and does not atomically merge into an existing master. That non-destructive policy is intentional.

## Reproduction / gates
Run: node --test tests/documents/*.test.mjs and npm run build && npm run audit:hosted, followed by the published-site browser tests tests/hosting/workspace-hosted-browser.mjs, tests/hosting/cv-import-cross-browser.mjs (Chromium, Firefox, WebKit), tests/hosting/scanned-pdf-ocr-browser.mjs (real offline English OCR), and tests/hosting/native-office-conversion.mjs (native LibreOffice). Then run the inherited suite and a real PDF/DOCX golden input corpus. Require original-vs-reconstructed side-by-side human checks, Windows Word/native browsers, multilingual text, mobile memory, malformed archive and visual reading order QA.

No deployment, live LinkedIn access, customer data, purchase, cloud sync or release approval is implied.
