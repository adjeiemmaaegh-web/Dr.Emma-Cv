# Ledger CV Studio E21 — DOCX hidden-style privacy correction

**Engineering development candidate — production NO-GO.** Built from the immutable E20 standalone HTML. Existing E20 files are not modified. No cloud, payments, external scripts, application accounts or API connections.

## Reproducible defect fixed

E20's DOCX review stripped directly hidden Word runs but did not resolve Word style definitions in word/styles.xml. A synthetic Word DOCX containing hidden character/paragraph style text reproduced a real omission-risk: private content was included in review without an omission flag.

E21 filters text hidden by direct, character, paragraph, inherited, and document-default formatting before extracting CV text from body, headers, footers and text boxes. A directly visible override remains visible. Unsupported/missing referenced styles trigger a manual-review warning and disable structured Ledger-DOCX auto-parsing. Cyclic style inheritance, unsafe XML, and oversized style definitions fail closed.

The original local-storage schema, other offline features, calendar importer, and PDF/DOCX exporters remain unchanged. No unsupported OCR accuracy claim is made. It remains possible for complex/unusual Word constructs to require manual verification; hidden-style filtering is not a substitute for viewing the original.

## Files and reproducibility

- Ledger_CV_Studio_E21_Style_Safe_Docx_Import.html — double-click standalone offline application. SHA-256: 9d27f843eeee774d081fcc936b87da3196ab28d4f4bb94939a5d5e6a215689d2
- Ledger_CV_Studio_E21_Offline_QA.html — separate QA page with exact E21 hash pin and manual hidden-style review checks. SHA-256: d66e66f48b8619f88a2efc4b1c4abef123bb5d9e87493caad095c538b0bb5765
- source/docx_hidden_patch.js — source for this incremental correction. The original E20 HTML remains byte-pinned under development/e20.
- Native CI: tests/e21_native_docx_style.py, checking actual local file origin and synthetic Word style visibility on Linux and Windows hosted GitHub runners.

## Verification boundaries

Local Chromium page.set_content regression: 11 synthetic Word visibility cases, 3 fail-closed malformed/style attacks, existing Ledger Word output smoke, no uncaught errors or requests. This is not actual local file-origin evidence. Native file-origin CI covers a smaller representative set on hosted runners; check CI before treating it as passed. Real Windows 11 hardware, Microsoft Word, physical accessibility/mobile/RTL, scanned-image OCR accuracy, external calendar interoperability and authorized BYOK provider checks remain unverified, as does the complete historical modular E20 669-test suite.

**Release gates are unchanged.** This does not authorize merging into main, enabling Pages, or declaring production acceptance.
