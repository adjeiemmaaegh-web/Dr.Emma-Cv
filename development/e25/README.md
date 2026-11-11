# E25 — Offline trained English OCR integration (engineering candidate)

**Goal:** Replace the known experimental glyph-only OCR weakness with a genuinely trained, rights-reviewed recognition engine that can run inside the existing Ledger CV Studio standalone HTML without browser uploads, external APIs, installation or an online CDN. The E24 source and existing saved CV schema are retained unchanged.

## Build-only inputs

- `tesseract-wasm@0.11.0` — BSD-2-Clause, packaged JS/WASM worker runtime from the upstream npm registry.
- `tessdata_fast/eng.traineddata` — Apache-2.0, pinned upstream revision `87416418657359cb625c412a48b6e1d6d41c29bd`.
- License notices embedded into the generated HTML; see `THIRD_PARTY_NOTICES.txt`. Verify compiled core attribution for commercial redistribution before any release.
- Build tooling uses Node.js and internet access **only during engineering**. Ordinary users should need just one local HTML file.

## Execution

1. Fetch the pinned npm package and English model in a controlled build workspace (see `.github/workflows/e25-trained-ocr.yml`).
2. Run `node tools/build-e25-trained-ocr.mjs`. This validates the frozen E24 source hash, injects the WASM/worker/model as base64 non-executable DOM data, adds a lazy optional OCR worker and a review-only UI action, and emits one `dist/Ledger_CV_Studio_E25_Trained_Offline_OCR.html` with a SHA manifest.
3. Run `python tests/e25_native_trained_ocr.py` (Playwright + Pillow) against the real file:// artifact using a synthetic printed English test image. The UI never silently commits OCR output; a person must review and approve it.

The builder is deliberately separate from the committed E24 HTML. Do not treat a generated artifact as complete before native tests, cross-browser compatibility and accuracy measurements pass. The first CI artifact is experimental, not an accepted release.

## Limitations and release blockers

English only; large model and WASM memory footprint need real low-spec-device benchmarking. Mixed-script documents, actual noisy scans, photos, Arabic/Hebrew, image/PDF combinations, table order, word-level accuracy and full external document corpus remain open. Worker/blob origin restrictions may vary by browser and file:// policy. The complete 30-template/Office/accessibility/physical Windows release gates remain open. No deployment, main merge, payment or cloud approval.
