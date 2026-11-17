# Workstream B — CV editor & document fidelity (Stages 5–8)

Owner paths: `src/features/{editor,templates,documents,import,export,ocr}/**`, `tests/documents/**`, this folder.
Built on Group A's `feat/ws-a-stages-00-03-foundation-2026-11-17` contracts (`src/contracts`, `src/core/feature-registry.mjs`, `src/domain/**`). No Group A, legacy-snapshot or generated file is modified.

| Stage | State | What exists | Evidence |
|---|---|---|---|
| 5 Editor | AUTOMATED_VERIFIED (module level) | `editor-state.mjs` command model (undo/redo, keyboard reorder, no-loss removal, protected fields); `editor-module.mjs` `FeatureModule` `cv-editor` (accessible form + live preview, explicit save-failure state) | unit tests; `tests/documents/editor-browser.mjs` in real Chromium at 320 px and 1280 px (keyboard reorder, undo, focus kept while typing, save failure keeps edits, clean unmount, zero external requests) |
| 6 Templates | IMPLEMENTED_UNVERIFIED | 30 legacy template ids in 7 families, each distinguishable by tokens/accent; customisation: font, size, spacing, margins, paper, header, columns, photo flag; legacy values degrade safely | registry tests. **Human visual quality and a golden-screenshot baseline are NOT done.** |
| 7 Layout/export | AUTOMATED_VERIFIED (own renderer) | deterministic pagination with keep-with-next; reproducible PDF (selectable text, URI links, WinAnsi with loss warning) and editable DOCX (Title/Heading styles, real bullet numbering, hyperlinks, paper/margins) | tests over A4/Letter × 1–90 entries; PDF checked with `pdftotext`/`pdfinfo`, DOCX with python-docx and a LibreOffice conversion (manual checks, see below). **Native Microsoft Word fidelity: NOT tested.** |
| 8 Import/OCR | AUTOMATED_VERIFIED (synthetic) | TXT/HTML/DOCX → `ImportReview`; per-item accept/reject; explicit confirmation; accepted claims become `source:'document', verifiedByUser:false` evidence; hidden text omitted and reported; bounded ZIP reader; OCR batch wrapper (≤5 pages, ≤6 MiB each, cancellable, all-or-nothing, never pre-accepted) | tests with synthetic fixtures only. **No labelled accuracy corpus yet, so no accuracy figure is claimed.** |

## Verify
```
node --test tests/documents/*.test.mjs        # 23 tests
node tests/documents/editor-browser.mjs        # needs Playwright Chromium
```

## Known limitations (honest list)
- Sidebar/two-column templates preview and export as **one column** (ATS-safe reading order); the exporter warns. Visual two-column rendering is future work.
- PDF uses the standard Helvetica/Times fonts and WinAnsi; characters outside it (e.g. Arabic) become `?` **with a warning**; DOCX keeps full Unicode. Embedded fonts / RTL are not implemented. Text measurement is an average-metrics approximation, conservative but not exact.
- The browser editor edits personal details, summary, experience, education and skills only; other sections are exported but not yet editable in this module. Existing legacy UI is untouched and remains the shipped editor until A composes this module.
- DOCX import reads `document.xml`, headers and footers (tables/text boxes are flagged, not reconstructed). Browser inflate uses `DecompressionStream`; Node tests inject zlib. Legacy `.doc`, PDF text extraction and the existing E26–E28 scanned-PDF/OCR UI are not yet re-pointed at `ImportReview` (they remain in `src/features/pdf|ocr` legacy inline files, unowned until Stage 1 allocation).
- Heuristic text parser handles common English CV layouts; unusual layouts yield warnings and `uncertain` items rather than guesses.

## Integration request to Group A (not done here — A-owned files)
1. Add `"test:documents": "node --test tests/documents/*.test.mjs"` to `package.json` and a CI job running it plus `node tests/documents/editor-browser.mjs`.
2. Register `editorFeature` (from `src/features/documents/index.mjs`) behind a feature flag, providing `services.documentSource` backed by `LocalRepositoryPort`.
3. Provide an inflate service for DOCX import in browsers if `DecompressionStream` is unavailable.

## Not accepted
State is **not ACCEPTED** for any stage: native Word/LibreOffice fidelity protocol, golden visual baselines, real-device/screen-reader checks, import accuracy corpus and F's independent review are all open.
