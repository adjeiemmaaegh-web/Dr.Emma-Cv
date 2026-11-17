# F01–F30 legacy PRD ownership → parallel roadmap

**Nonproduction engineering traceability; 17 November 2026.**
Primary references: [original 30-feature PRD](../../PRD_FLOWCV_30_FEATURE_ENHANCEMENTS.md), separate [parallel roadmap](../../ENHANCV_EXCEED_FRONTEND_MASTER_PLAN.md) on draft roadmap PR #16, and [Group A PR #17](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/pull/17).

This table maps the thirty original requirements to the current **intended** implementation owner and integration stage. It is **not** a claim that any whole original F01–F30 feature has passed its exit criteria; existing Stage 8/E20–E31 capabilities require independent artifact-level parity audit. Do not change status to ACCEPTED based on this map. Each owner should create or link a tracked issue with fixtures, dependency, severity and test evidence during the relevant stage.

| Old ID | Original requirement | Primary owner / roadmap stage | Explicit integration dependencies |
| --- | --- | --- | --- |
| F01 | Professional template library | B6 | A1 tokens; B7 render |
| F02 | Template visual quality | B6 | A1 design primitives; F20 visual QA |
| F03 | Advanced design customization | B6 | A3 variant appearance; B5/B7 |
| F04 | Instant live preview | B5 | A1 composition; B7 renderer |
| F05 | Safe template switching | B5/B6 | A3 separate content from appearance |
| F06 | Paper/column/photo layouts | B6/B7 | E17 localization; F20 print QA |
| F07 | Multipage pagination | B7 | B5/B6; native exports |
| F08 | High-fidelity PDF | B7 | F20 extraction/print check |
| F09 | Fonts and typographic hierarchy | B6/B7 | A1 tokens; licensing, offline QA |
| F10 | Section rearrangement | B5 | E17 keyboard and assistive QA |
| F11 | PDF resume import | B8 | A3 reviewed profile conversion |
| F12 | DOCX resume import | B8 | A3 schema; F20 corpus |
| F13 | Image resume import | B8 | Offline OCR feasibility, E18 |
| F14 | Pasted resume import | B8 | A3 `ImportReview`; explicit approval |
| F15 | First-run onboarding | E4 | A1 routes, A3 draft profiles |
| F16 | Smart section guidance | E4 with C12 rules | A3 evidence provenance |
| F17 | CV duplication and targeted variants | A3 primitives + B5 interface | C11 job linkage; history & delete UX |
| F18 | Full cover-letter builder | D13 | A3 profile and B7 export |
| F19 | Matching document branding | D13/B6 | A1 tokens and B7 renderer |
| F20 | Kanban job tracker | D14 | A2 local data; E17 accessible list |
| F21 | Application-linked documents | D14 | A3 immutable variant revisions, D13 |
| F22 | Tasks and follow-ups | D14 | E18 browser capability/notification rules |
| F23 | Application analytics | D14 | F20 reconciled synthetic corpus |
| F24 | AI bullet rewriting | C11/C12 | A3 factual provenance; opt-in BYOK |
| F25 | AI summary refinement | C11/C12 | A3 content and evidence approval |
| F26 | AI grammar/spelling | C12 | Offline rules and optional explicit AI |
| F27 | AI translation | C12 with E17 | No automatic factual replacement |
| F28 | RTL language support | E17/B7 | Native print and mixed-direction QA |
| F29 | Localization | E17 | A1 tokens/navigation; B7 export |
| F30 | Product maturity and usability | F20 independent; A0/A2 + E17–E19 provide inputs | Real-device, recovery, WCAG and release signoff |

## Group A implementation boundaries, not full feature completion

- **F17 partial support:** A3 implements separate master/variant data, explicit confirmation for master change, bounded historical snapshots and opt-in workbench. B5/C11 still own full direct-edit and job-tailoring flows; F17 deletion/full UX and cross-feature acceptance remain unverified.
- **F30 partial infrastructure:** A2 implements separate IndexedDB compare-and-swap, typed errors, legacy raw export, reviewer-gated profile backup and synthetic two-tab native Chromium tests. It neither repairs all legacy localStorage writers nor proves cross-browser/device recovery.
- **F14 partial interface only:** A3 has a reviewed legacy CV JSON conversion plan; this is not the B8 general pasted-resume parser.
- **F02/F19 partial tokens only:** A1 provides scoped CSS tokens, not a validated template-design family or matching document output.

**Open tracking action:** link or create the thirty individual feature issues with exact original exit criteria and current verified evidence; this document alone does not satisfy the PRD's issue-tracker requirement. Unknown historic implementation states must be recorded as **NOT ASSESSED**, not automatically NOT STARTED or COMPLETE. No cross-team merges or release changes authorized.
