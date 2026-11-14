# E22 Cross-browser pagination — engineering evidence and unresolved gates

**Date:** 7 November 2026. **Status:** Development candidate. **Production:** NO-GO.

### Reproduction

The frozen E21 HTML printed an 18-role A4 CV on the Monogram variants with a fifth page containing only the final skill. In hosted Windows Chrome and Edge, an E22 narrow Monogram-only rule still left a single 'Sales Management' skill on page 8 of a Horizon US Letter document. The text was not omitted, but the page break was visibly undesirable.

### Source correction

The E22 print-only rule now groups the **entire Skills section** (heading plus grid) across all template families. It uses CSS `:has(.cv-skills-grid)` and `break-inside:avoid-page`. No saved CV schema, content, network code, or any frozen E20/E21 artifact was modified. The original E21 remains the rebuild base. No files are installed for normal Ledger use.

Exact E22 application SHA-256: `ca686104b80df028b8f52b0b91adbafbd569709600dee493f9b8102e1a98e512`.

Exact E22 QA SHA-256: `cf68e13b4312d0d109b869334d37e618a715f82a2cc8143304f1467ebee403de`.

### Locally completed verification

- Node 22, 6/6 E22 reproducible source, embedded script, identity and QA pin checks passed.
- Linux local Chromium synthetic `set_content` test: 120/120 native PDF render/extraction cases passed; standard and 18-role long CV across 30 templates and A4/Letter, with no sparse or blank pages under a 20-character threshold. No out-of-page extracted text or lost required role markers; zero HTTP(S) calls observed.
- The print CSS was visually inspected on an example Monogram long-CV page: all five skills and heading appeared together. This image inspection is not comprehensive signoff.

### GitHub evidence (must be checked per run)

- E22 Actions matrix checks same 120 cases via genuine `file://` in hosted Linux Chromium, Windows Google Chrome and Microsoft Edge; each job records its independent outcome and may upload a JSON report.
- Cross-browser CI failures are blockers for this engineering increment until corrected, not waived as test noise. Do not claim all matrix runs passed without their final GitHub conclusions.
- E21 hidden-style Word privacy checks and E0/E20 static tests remain separate, not substitutes for human release acceptance.

### Remaining production blockers

Hardware Windows 11, live Microsoft Word visual acceptance, 30-template human review, screen-reader/mobile/RTL, exhaustive real-browser storage/crash recovery, real exported calendar interoperability, licensed/validated trained browser-portable OCR, explicit BYOK provider approval, and the original full E20 modular 669-test source package remain open. The test suite does not measure real scanned-document OCR accuracy.

**No release or deployment authority is inferred from CI.** Keep `main` unchanged and use synthetic test profiles.
