# E28 — Visual comparison of scanned PDF pages, safely offline

**Engineering development and test candidate · 11 November 2026 · release remains NO-GO.**

E28 continues from E27's frozen 15,992,809-byte standalone HTML. It improves OCR review safety without adding a server, installation, telemetry, payment, cloud, live model service or runtime downloads. The generated app is one locally opened HTML file.

## What E28 adds

Users importing scanned PDFs can now **see a locally rendered copy of the original selected page next to the editable OCR review area**, so that names, numbers, dates and contact details can be checked directly before approving import. The original page is not written to CV data, and the editable CV source text never contains artificial PDF-page metadata.

Users can choose 0°, 90°, 180° or 270° **scan orientation before trained English OCR**. The rotated bitmap passed to the trained Tesseract engine is the same bitmap shown in the review. This is a user-controlled correction for sideways scans, not automatic orientation detection. The reference viewer includes keyboard-operable zoom controls, a page chooser and a live description of the page and rotation.

At most five page reference images are retained in the browser memory, the newest pages replacing older references. Their object URLs are revoked when the dialog closes or a page is evicted. The old E27 all-or-nothing multi-page transaction, stop, duplicate guard, review-before-import and all earlier E20–E26 features remain intact.

## Reproducible build and QA

Install pinned `tesseract-wasm@0.11.0` and `pdfjs-dist@6.5.438` at build time only, pin the Tesseract English model with its SHA-256 as documented in `.github/workflows/e28-visual-pdf.yml`, then run:

```sh
node tools/build-e25-trained-ocr.mjs
node tools/build-e26-scanned-pdf.mjs
node tools/build-e27-pdf-batch.mjs
node tools/build-e28-visual-pdf-ocr.mjs
python tests/e28_native_pdf_visual.py
python tests/e28_inherited.py e27
python tests/e28_inherited.py e26
```

The generated E28 standalone file is 15,999,116 bytes with verified SHA-256 `73ca54189b8db116c5f9760f9372dc2082a836de5dfcbdea43c03eff436dcbd7`; the build now asserts this expected exact output. Hosted Windows Chrome and Edge acceptance ran successfully on real `file://` origins (see [E28 CI](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/workflows/e28-visual-pdf.yml)); the broader Linux template/document matrix is separately tracked in the same workflow. The E28 builder requires frozen E27 SHA-256 `f6d68fea1f7cc93be5884631d1a945db92c5ce946a39ab22d12e04e2c0789650`. It replaces only the private PDF OCR review function; the rest of the original HTML is byte-for-byte preserved. Hosted Linux Chromium and Windows Chrome/Edge tests are run on genuine `file://` origins. A synthetic sideways raster-only English PDF checks that rotating 90° permits actual model recognition, that the exact rotated bitmap is reviewable, that the verification checkbox still blocks unacknowledged import, and that the original page Blob URL is revoked on cancel.

Additional regressions run the frozen E27 multi-page and E26 one-page acceptance suites, the E21 hidden Word styles check, synthetic DOCX and PDF exports, calendar checks, browser restart persistence and all 30 templates at A4 and US Letter using long and short synthetic fixtures.

## Unverified critical gates

Clean synthetic English OCR recognition is not real-world accuracy. No numerical accuracy guarantee exists for noisy, rotated beyond manually corrected, low-resolution, multi-column or multilingual CVs. Real-world human reviewers, screen readers, keyboard and small-mobile usability, physical Windows 11/8GB hardware, actual Microsoft Word/LibreOffice fidelity, full recovery/backup drills, final layout golden-image signoff, third-party redistribution/legal review and all owner approval gates remain open in issue #5. Do not merge to `main`, deploy, enable payments/cloud/AI provider credentials, or call this production ready. Back up existing CVs before changing HTML file paths because file:// storage can be origin/path dependent.
