# Second-pass engineering review — ATS and vacancy intelligence
**Date:** 17 November 2026
**Branch:** feat/ats-27-job-matching-diagnostics-2026-11-17
**PR:** https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/pull/27 (draft, no merge/deployment approval)
**Reference:** https://enhancv.com/resources/resume-checker/ — published 27 checks in seven categories (comparison taxonomy, not a licensed scoring model)

## Why this pass was necessary

The initial feature mapping did not prove that any commercial ATS would parse a document correctly. More importantly, the original job comparator could call a job requirement "evidenced" after finding loosely related stems scattered across unrelated CV sections; an unrelated number could be mistaken for the advertised team's size or required years. This could actively mislead applicants. The first skill dictionary was too narrow and a skills-list or role-title mention could look stronger than it was. The CV-check screen mixed technical findings and corrections without surfacing limitations and outcomes clearly.

## Findings, severity and remedies

| Risk | Original symptom | New safeguard |
|---|---|---|
| High: ungrounded match claims | 60% bag-of-words overlap, even scattered or negated, could be presented as evidence | Normalise positive candidate text, require co-located relevant terms and affirmative skill examples to return the backward-compatible “evidenced” status; otherwise partial/not-found. Every result includes explicit human-review and evidence meaning |
| High: numerical scope mismatch | A "team of 50" or "5 years Python" requirement could ignore the actual number/context | Extract explicit team-size/experience-year requirements and report text-supported, possible-conflict or not-shown. Experience years only count if directly stated alongside requested recognized skills; never infer from job date spans |
| High: CV negation | A candidate learning a technology or explicitly denying experience could match it | Suppress bounded negative/learning clauses; skip skills described as "not required" |
| Medium: shallow lexicon | Narrow retail/office skills vocabulary; weak technical and regional coverage | Versioned, expanded English lexicon with development, infrastructure, data, operations, finance, security, PLC and soft skill phrases; careful whole-token aliases |
| Medium: ambiguous skill evidence | "Python Engineer" title or generic skills list may be called demonstrated experience | Role title alone is a mention. “Described” requires a concrete action in an experience/project text passage, still not independent verification |
| Medium: career chronology false positives | Title rank of "Senior Director" could be read as more junior than "Manager"; overlap handling needed | High-seniority title patterns take precedence. Employment intervals merge overlaps; year-only dates are conservative. Possible promotions are positive opportunities, not defects |
| Medium: category opacity | A check could say "local" without saying whether a problem was found | Category rows now expose reviewed finding count, sample messages and "review suggested"/"no local flag"/"not assessed" distinctions |
| Medium: poor correction display | Applicant saw a generic assessment without the requirement caveats | Career journey shows original requirement, priority, note, citation path, scope constraint and missing terms. CV check groups corrections and technical/scope registers |
| Medium: parser truncation | “Requirements: SQL and Excel” could be swallowed as a heading | Explicit inline heading parsing, required/preferred priorities and inherited benefits exclusion |
| Low: duplicate checks | Technical findings and prioritized corrections created duplicate primary lists | Technical findings remain accessible in a collapsible detail while the priority list leads |
| Low: misleading evidence source | Generated layout text described as the exact exported file | UI now calls it a layout preview; independent PDF/DOCX and ATS parser acceptance remains open |

## Verification strategy

The branch includes tests/intelligence/precision-regressions.test.mjs plus expanded-review regression cases for evidence sources, negation, requirement alternatives, distinctive technical IDs, numerical context, future dates, cautious promotion inference and limited grammar patterns. Run counts may change as review findings are addressed; use the exact head's CI output for authoritative totals. The ATS GitHub Actions job runs all intelligence, career, guided journey and syntax tests. Existing E0/E20 and hosted QA workflows are triggered by pull requests. Treat outcomes as **pending** until the specific head commit's run is completed and examined.

Test fixture data is synthetic and does not establish precision, recall, fair treatment, independent ATS parser compatibility, grammar completeness or job-fit calibration.

**Follow-on fixes:** The first browser integration runs exposed a hidden-first-item navigation issue and an omitted explicit “not a score” notice; both were corrected without weakening the accessibility test. A test expecting the inventory requirement to count as fully evidenced from a skills-list plus stock-count mention was changed to expect partial evidence. The subsequent tests detected a missing date-label helper in the new future-period check; that error was fixed on the branch. The branch now also distinguishes direct `A or B` alternatives (without assuming a complete logical reading of complex job prose) and separates definite future dates from uncertain year-only dates.

## Scope and still-open limitations

- The published checklist is only a benchmark reference. Some rows are partial, input-dependent or unsupported; 27 mapped entries must **not** be advertised as 27 fully implemented/validated engines.
- Job phrase coverage is limited to a bounded English dictionary; it cannot reliably infer expertise, professional licensure, scope, years, quality of leadership, or future performance.
- Numeric requirements have only shallow local parsing and may require manual interpretation. A job may state qualifications across multiple clauses that a heuristic cannot disambiguate.
- The local spelling/grammar checks are intentionally small and are not comprehensive language correction.
- Independent extracted PDF/DOCX reading order, actual parser behavior in multiple ATS systems, labelled CV/job-description cases, blinded reviewer annotations, accessibility, low-end device performance and full browser matrices remain unverified until evidence is collected.
- A future match *score*, if ever displayed, requires agreed evaluation labels, representative role and country/language coverage, repeatable measured error rates and calibration review. Currently every output's score is null/validated false; no hiring probability can be inferred.
- No cloud upload, candidate data transmission, monetization or deployment was enabled. The main branch remains untouched.

## Review disposition

Keep PR in **draft** until the exact new head passes CI, representative data evaluations are performed, and owner-run browser/real-document acceptance can be assessed. Source engineering alone is not release acceptance.
