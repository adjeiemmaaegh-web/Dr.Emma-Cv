# Advanced interview preparation and career coaching — development increment
Date: 2026-11-17
Branch: feat/advanced-interview-coaching-2026-11-17
Release status: **engineering review / NO-GO** pending CI and independent Group F acceptance.

## Features integrated in the existing Career tools route
- Evidence-linked job/CV interview plan with persistent question identities, labelled job, CV-role and generic practice questions, and inspectable excerpts (never as independently verified credentials).
- Editable, saved STAR stories; truth-preserving four-part answer outline; local rules-based word-count, timing estimate, completeness, ownership, outcome and unsupported-factual-claim feedback.
- Existing revision-checked timed practice and self-scores exposed in the workspace; answer/coaching reviews persisted under the profile-bound career journey IndexedDB record with revision conflict detection.
- Optional **human-mediated** AI workflow: the user downloads a full disclosure-marked prompt, chooses a separate AI service independently (if desired), pastes a suggested rewrite, and passes a conservative claim guard before explicitly inserting it into the editable answer. **No AI provider is connected** and the app never automatically sends prompts, CVs, jobs, or answers.
- Company/role brief generated from the applicant-pasted vacancy plus source excerpts personally visited and attested by the user. Source URLs must be public HTTPS, are displayed as citations, and never auto-fetched. **The app has not independently verified the publisher, excerpt or company facts.** No unsourced company claims are generated.
- PDF and DOCX interview workbooks through the existing Group B renderer; includes role requirements, labelled questions, possible CV evidence, STAR stories, saved practice feedback, source-attributed company excerpts and reflection checklist.
- Preserves the current A–E offline-first architecture, CV master, old E31 fallback and local-only career-draft persistence. No payments, cloud sync, auto-deployment or credential transmission.

## Safety and limitations
- No generative AI writing is active. The optional external prompt may contain sensitive career material; user controls if and where to send it. Claim detection is heuristic, **not proof** of accuracy or completeness.
- “Reviewed” company sources are **reviewed by the user**, not cryptographically authenticated or fetched by Ledger. An independent, live verified-source service would require separately authorized online integration.
- PDF Unicode and RTL, true multi-column parity, native Word fidelity, Safari offline reliability, browser storage crash recovery and real-device accessibility remain open F20 gates. Workbooks must be inspected before use.
- The workbook reflects source material supplied by the candidate, not external fact-checking. No ATS success or hiring predictions.
- Group F independent QA must assess actual interviews, AI drafting claims, official company-source fidelity, and native exported workbooks before commercial or comparative claims.

## Automated checks
- `node --test tests/career/advanced-coach.test.mjs`
- `node --test tests/career/*.test.mjs`
- `npm run build && npm run audit:hosted`
- `node tests/hosting/workspace-hosted-browser.mjs` after Playwright Chromium is installed

No feature is declared production accepted by authoring this documentation. Never merge to main or deploy automatically without review and passing evidence.
