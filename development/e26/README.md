# Ledger CV Studio E26 — Offline scanned-PDF OCR

**Engineering candidate, 11 November 2026. Production NO-GO.**

E26 continues the frozen E25 single-HTML offline trained-English-image OCR candidate. It adds an explicitly requested **raster-only PDF page OCR** path using bundled Mozilla PDF.js 6.5.438, while preserving all previous E25 features, data formats, and normal text-PDF extraction. No cloud, runtime model downloads, installation, payments, accounts or live provider calls.

## Using the preview

Open the E26 standalone HTML, choose **Upload existing**, and select a scanned or image-only PDF. In the review dialog choose a PDF page from 1 to 50, then select **Read selected PDF page offline**. The engine renders just that page locally and sends the temporary image into the already-bundled trained English Tesseract worker. The recognized text appears in an editable review draft. Verify *every* name, email, date, contact field, employer, qualification and number against the original before approving the new CV. Cancelling preserves the original CV.

Previous review text is only appended to after an explicit user confirmation. OCR-generated text cannot be approved without the existing verification acknowledgement. The output is text, not a fidelity-preserving Word conversion.

## Security and safeguards

- PDF file limit 8 MiB; PDF header must begin with %PDF-; at most 50 document pages; one selected page per operation.
- Raster image is capped at 1.45 million pixels and a 6 MiB PNG. The source PDF remains in local memory, not uploaded or persisted.
- PDF.js parsing uses in-memory bytes, disables eval and automatic fetch/streaming, and rasterizes the requested page only.
- Trained OCR remains English-only, user initiated, and protected by original CV review acknowledgement; no silent write.
- PDF.js is Apache-2.0 and its license is embedded inside the generated HTML, alongside E25 Tesseract, English trained model and Leptonica notices.

## Reproduce

On the engineering CI builder, install pinned tesseract-wasm@0.11.0 and pdfjs-dist@6.5.438. Download the pinned Tesseract English model as specified by the workflow, checking its SHA-256. Then run:

```sh
node tools/build-e25-trained-ocr.mjs
node tools/build-e26-scanned-pdf.mjs
python tests/e26_native_scanned_pdf.py
```

The E26 builder validates the exact frozen E25 HTML SHA-256 1126a81933d86dc54c7ac36eac9dd4e6aa01f8bddb47e7bcac5a546fb810c8a7 before insertion. The output is dist/Ledger_CV_Studio_E26_Scanned_PDF_Offline_OCR.html with a manifest and synthetic QA report. CI tests genuine offline file:// origins on hosted Linux Chromium, Windows Chrome and Windows Edge, and preserves E25 photo-OCR regressions.

## Unverified release gates

Real scanned CV datasets, OCR accuracy in low-light/rotated/multi-column and non-English scripts, encrypted PDFs, 8GB memory use, native Microsoft Word, real devices, accessibility, cross-browser mobile/Safari/Firefox, data backup/recovery and the original issue #5 release checklist remain open. Do not merge into main, deploy, enable cloud/payments or represent this as production-accepted. Export a backup before opening a new HTML filename, because file:// storage can be path-scoped.
