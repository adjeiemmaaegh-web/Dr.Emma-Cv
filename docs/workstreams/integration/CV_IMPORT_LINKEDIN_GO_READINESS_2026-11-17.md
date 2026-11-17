# CV import + LinkedIn: evidence-based GO decision (2026-11-17)

**Workstream:** `feat/cv-import-linkedin-fidelity-2026-11-17`, draft PR #29  
**Scope:** User-selected, local CV files and LinkedIn-owned exports; non-destructive review to a new profile.  
**Release state:** **NO-GO for public/production use until every critical evidence row is verified and signed off.** "CI green" alone is not a release acceptance decision.

## Engineering evidence to inspect at the latest HEAD

| Gate | Acceptance / exact command | State at creation |
| --- | --- | --- |
| Branch integration | Compare branch with latest `main`; must have zero commits behind and retain advanced visual editor + ATS and import. | Implemented; verify on final HEAD |
| Immutable legacy | E0, E20, E31 tests and checksum audits; old standalone app must remain byte-identical. | Automated; re-check on final HEAD |
| Core regressions | Node suites in `tests/documents`, `tests/career`, `tests/experience`, `tests/integration`; zero failures. | Automated; re-check on final HEAD |
| Actual PDF.js | `npm run build && npm run audit:hosted`; browser verifies built local PDF.js core and worker rather than a mock. | Automated; re-check on final HEAD |
| Browser matrix | `cv-import-cross-browser.yml`: Chromium, Firefox and WebKit load the published site, read a PDF and selected LinkedIn CSV, explicitly approve a new profile, and retain it after reload with no remote requests. | Automated; re-check on final HEAD |
| DOCX text fidelity | Synthetic multilingual/repeated-employer/custom-section corpus, round-trip from generated Word files; hidden/deleted text exclusion, ZIP CRC and bounded inflate tests. | Automated; re-check on final HEAD |
| Native office conversion | `cv-native-office.yml`: LibreOffice Writer opens a real generated DOCX, converts it, then actual PDF.js checks retained visible words. | Added; check workflow outcome |
| Sensitive content | No LinkedIn credentials/scraping/URL fetch, no unrelated archive categories, no unapproved master overwrite; source-file bytes remain local. | Static + browser checks; independent security review open |
| Scanned PDFs | Empty/sparse page blocks unapproved partial imports. Opt-in English OCR uses local pinned worker/WASM/model with 5-page/pixel limits and explicit source review; real Chromium test physically disables network. Manual full-page transcription remains available. | Implemented and synthetic offline-browser tested; real noisy scans/other languages OPEN |
| Visual/accessibility | Keyboard traversal, screen reader, native Microsoft Word/PDF viewers, high contrast, 200% zoom and touch on physical devices. | **OPEN — owner / independent acceptance** |
| Real-source fidelity | De-identified real Word CVs, two-column/complex PDFs, protected styles, rich links, actual member-export CSV variants, noisy scans, varied dates and non-English names. | **OPEN — corpus needed** |
| Licensing/operations | Confirm bundled PDF.js license, OSS notices, content security, staged rollback and support; no customer PII or secrets shipped. | Build license audit; independent legal/security review open |
| Launch authorization | Named code owners review + manual acceptance sign-off + explicit release owner decision, separate from PR merge and deployment. | **OPEN** |

## Minimum real-document acceptance protocol

Use a **private, de-identified** fixture set, never raw CVs or full LinkedIn exports in public GitHub. Record source format, page count, original fields, imported fields, omissions, wrong matches, and reviewer edits, with an issue ID for each discrepancy. Include at minimum: 10 distinct DOCX files from native Word/LibreOffice; 10 text-based PDFs with ordinary and two-column layouts; 5 scanned/image PDFs; 5 partial/complete official LinkedIn archive variants with consent; two multi-role same-employer profiles; multilingual names/date formats; hidden, revised and table-contained Word content. The test corpus is a **required acceptance target**, not represented by the synthetic automated fixtures.

Suggested GO thresholds, subject to the owner agreeing before scoring:

- **Zero silently omitted critical fields or invented credentials** among reviewed contact names, experience titles/employers/dates, education, certifications and LinkedIn categories. Review must surface ambiguities and source provenance.
- **All** tested files either create an accurate, explicitly approved new profile or fail closed with an actionable warning; no blank overwrite, cross-profile data leak, lost draft or unapproved automatic edit.
- At least **98% correct critical-field extraction before reviewer correction** for supported selectable-text DOCX/PDF fixtures, separately scored by format and layout. If shortfalls occur, do not average them away; fix root causes and rerun.
- For scanned PDFs, the trained offline English OCR adapter is integrated, but its synthetic Chromium proof does not determine field-level accuracy on noisy, blurred, rotated or mixed-language real scans. Score a separate, de-identified OCR reference corpus, never combine OCR results with selectable-text PDF accuracy, and preserve human acceptance.
- Re-test source-persistence and backup/recovery on real Windows Chrome/Edge, Mac Safari, iPhone Safari and Android Chrome (or record an explicit owner-approved, limited-platform pilot scope).
- Run actual keyboard and screen-reader walkthroughs; automated source lint and simulated-browser tests cannot establish WCAG 2.2 AA.

## Human sign-off fields (leave blank until evidence exists)

- Real-document fixture manifest and private evidence location: **PENDING**
- Native Microsoft Word visual/DOCX review: **PENDING**
- Mobile / accessibility / multi-browser device report: **PENDING**
- PII handling and security/licensing sign-off: **PENDING**
- Known release blockers, owners, target corrections: **PENDING**
- Independent code-owner approval: **PENDING**
- Owner release decision and date: **PENDING**

**Decision policy:** If any critical row is open, use **ENGINEERING CANDIDATE / PRODUCTION NO-GO**. No automatic main merge, public deployment, payments, cloud CV storage or release switch is authorized by this checklist.
