# E27 — Transactional multi-page scanned-PDF OCR

**Ledger CV Studio · engineering candidate · 11 November 2026 · production NO-GO.**

E27 continues from the frozen E26 standalone application and retains the original offline-first single-HTML architecture. A normal user needs only the generated HTML file, opened locally in a browser. Node, npm, Python and model downloads are **build/QA only**, never end-user requirements.

## Improvements

Users can read a single PDF page as before, or choose a consecutive range of **at most five pages per action**. Pages are rendered locally one at a time and recognized using the bundled trained English Tesseract WebAssembly model. All proposed text remains in the existing editable import review until the user confirms the OCR transcription and explicitly creates a new CV.

Each batch is **transactional**: no partial OCR output is appended if a page fails, reading is stopped, the selected range is invalid, the user edits the review during recognition or the 120,000-character limit would be exceeded. Existing review characters are preserved exactly, not trimmed/truncated. Reprocessing a page already successfully added in that review is refused, with an explanation. PDF page provenance is displayed as separate live status, never included as fake applicant details in parsed CV text.

The **Stop after current page** control is intentionally cooperative: it does **not** interrupt an in-flight OCR worker, which finishes the current operation before discarding the entire batch. Import approval is blocked while OCR is running. Closing the import dialog invalidates any pending batch; it cannot later change the closed review or saved CV.

The original E26 limits remain: PDF ≤8 MiB, ≤50 pages, ≤1.45 million pixels per rendered page, PNG ≤6 MiB, English-trained OCR only. The app, fonts, rendering library, worker, recognition model and legally required notices are bundled in the standalone file. Nothing is uploaded or sent to third-party OCR services.

## Build and evidence

Build from E25 and E26 sources using the pinned Tesseract English model and the exact package versions from `.github/workflows/e27-pdf-batch.yml`, then run:

```sh
node tools/build-e25-trained-ocr.mjs
node tools/build-e26-scanned-pdf.mjs
node tools/build-e27-pdf-batch.mjs
python tests/e27_native_pdf_batch.py
python tests/e27_inherited_e26.py
```

The E27 builder checks the exact frozen E26 SHA-256 `c05e4c037af412bd11822f4c9b089cbf02f4636cec787cfc32bf94d7c7fe180e` and replaces **only** the scanned-PDF review function; the rest of the original HTML remains byte-identical. The final HTML, SHA manifest and synthetic test results are uploaded as GitHub Actions engineering artifacts. CI runs real `file://` tests on hosted Linux Chromium, Windows Chrome and Windows Edge, including concurrency, cancellation, duplicate prevention, approved CV import and browser reload.

## Open limitations

No real-world multi-page CV corpus has been scored. Complex tables, columns, low-resolution and rotated scans, images in unfamiliar languages, encrypted PDFs, and machine accuracy on genuine identities remain unverified. Physical Windows 11/8GB tests, native Microsoft Word, browser/mobile/Safari/Firefox, screen readers, license review and all owner release signoffs remain open; see issue #5. No merge to `main`, public deployment, account, cloud, payments or live provider activation authorized. Back up saved CV data before opening a differently named standalone HTML.
