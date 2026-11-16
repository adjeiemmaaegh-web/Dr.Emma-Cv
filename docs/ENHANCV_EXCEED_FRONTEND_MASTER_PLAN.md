# Dr.Emma-Cv / Ledger CV Studio — Frontend-First Master Roadmap to Surpass Enhancv

**Version:** 2.0 — parallel-development edition  
**Date:** 2026-11-17  
**Status:** Proposed for owner review; **not implementation approval, acceptance, or production release**  
**Repository:** [adjeiemmaaegh-web/Dr.Emma-Cv](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv)  
**Source reference:** `main` at `a561e3dd4384e4544f8b8056252e5b0498c0c67a` (2026-11-14)  
**Product intent:** Best-in-class free, browser-based, offline-capable CV and career toolkit  
**Scope:** Frontend, client-side application logic, offline assets, local storage, locally generated documents, browser tests, optional local/explicit user-provided AI integration  
**Excluded for now:** Backend services, hosted databases, user accounts, authentication, subscriptions, payments, mandatory external AI, server job crawler, cloud sync, and server-hosted multiuser collaboration

> **North star:** Surpass Enhancv in demonstrable document quality, editing usability, trustworthy tailoring, ATS diagnostics, career workflow, local privacy and value—**not** by copying its interface or by counting unfinished features. The full hosted-service feature set is explicitly outside this frontend-only phase.
>
> **Important:** Existing frontend code and automation cannot safely be split across developers simply by assigning stage numbers: the project contains historical frozen single-HTML artifacts and chained, hash-pinned E20–E31 build scripts. **Stage 0 and Stage 1 establish safe module and integration boundaries before parallel editing of the runtime.**

---

## 1. Non-negotiable product and engineering rules

1. **The core product stays genuinely free.** No watermark, trial expiration, required login, paid API, account quota, subscription, forced sign-in, or provider credentials to create, improve, save, export and track a CV.
2. **Offline-first and privacy-preserving.** Document content stays on the device unless the user explicitly initiates a disclosed external action. Offline features do not depend on a remote API or CDN. PWA service workers work under supported secure web origins; standalone `file://` behavior is tested separately and never misrepresented as an installable PWA.
3. **Reuse and preserve all working functionality.** Do not recreate the product from scratch. Maintain a full feature inventory and compatibility fixtures before extracting/refactoring the existing UI. Historical stage artifacts and pinned hashes remain immutable.
4. **Frontend-only scope.** Browser storage may be hardened where necessary for reliability, but do not introduce backend, hosted database or authentication work. Do not perform a speculative storage-engine rewrite.
5. **No invented credentials or achievements.** AI and rules-based suggestions must distinguish fact, interpretation and missing evidence. Unsupported factual changes require user correction/confirmation and cannot be auto-committed.
6. **No marketing claims ahead of evidence.** “ATS compatible,” “98% accurate,” “better than Enhancv,” or “production-ready” require relevant controlled tests. An ATS diagnostic score does not predict acceptance by an employer's proprietary ATS.
7. **Development stages are substantial deliverables, not micro-increments.** No stage is accepted because a button or mock screen exists.
8. **Protect real user data.** No production data in fixtures, screenshots, commits, logs or telemetry. Test with synthetic/anonymized documents; user data export/backup precedes migration.
9. **No automatic external release.** Pull-request review, CI success, or merge does not authorize production deployment, payment integrations or customer launch. Owner's release approval is a separate gate.
10. **Original implementation.** Observe the competitor's public functionality without copying proprietary source, illustrations, CSS, trademarks, template designs or protected wording. Review licenses of bundled fonts, OCR, PDF and document libraries.

## 2. Evidence and current-state caveats

- The GitHub default branch has an E31-oriented build configuration, but the prior code review identified failed E31 workflow parsing, inconsistent package/build/audit expectations, stale documentation, and deployment drift. **Fix and verify rather than assuming that E31 is a production baseline.**
- The existing application already has a 30-template portfolio, guided CV creation, master/variant handling, DOCX/PDF paths, local ATS and job comparison UI, a career tracker, cover-letter functionality, optional BYOK assistant, and experimental offline OCR. **Code presence is not the same as verified user quality or end-to-end acceptance.**
- A historical `Stage 8` single HTML, E20–E31 snapshots and generated `docs/index.html` coexist. The approved migration must preserve byte-verified historical references, browser data and independent rollback artifacts.
- Enhancv's publicly advertised capabilities include live editing, an ATS checker with 27 checks, job-specific tailoring, cover letters, application tracking, job tools, LinkedIn coaching and interview assistance. Public advertising and the competitor's own studies are **research inputs**, not independent proof of product quality.
- Existing production acceptance remains **NO-GO / unverified** until native-device, document fidelity, recovery, security, accessibility and owner gates have relevant evidence.
- **No backend means no genuine equivalent for hosted job search, remote account sync, cloud AI or concurrent collaboration** in this phase. Manual import, local files and permissioned browser extensions are the in-scope alternatives.

## 3. Parallel developer workstreams — six independent ownership groups

Each stage belongs to **exactly one** workstream. Group F performs continuous independent test/integration review as well as owning Stage 20.

| Workstream | Developer owner | Assigned stages | Responsibility | Primary delivery |
|---|---|---|---|---|
| **A — Platform & shared contracts** | Developer A / technical integrator | **0, 1, 2, 3** | Reproducible baseline, architecture/design tokens, local data safety, master profile, shared interfaces, builds | Stable frontend platform and frozen integration contracts |
| **B — CV editor & document fidelity** | Developer B | **5, 6, 7, 8** | Visual editor, templates, page layout, PDF/DOCX export, document import, offline OCR | Best-in-class document creation pipeline |
| **C — ATS, job matching & writing intelligence** | Developer C | **9, 10, 11, 12** | Explainable ATS diagnostics, vacancy analysis, evidence-grounded tailoring, free local writing assistance | Trustworthy and measurable CV improvement |
| **D — Career application toolkit** | Developer D | **13, 14, 15, 16** | Cover letters, local tracker, interview preparation, LinkedIn guidance and career-region content | Integrated, locally maintained career workflow |
| **E — Onboarding, accessibility & distribution** | Developer E | **4, 17, 18, 19** | First-run UX, mobile/accessibility audits, PWA experience, portability, opt-in browser extension | Usable experience across supported devices and origins |
| **F — Independent QA & competitive acceptance** | Developer F / release QA | **20** + continuous testing | Cross-module integration, browser/device and security tests, document benchmarks, benchmark study, release evidence | Independent proof, merge gates and go/no-go report |

**Coverage check:** A=4, B=4, C=4, D=4, E=4, F=1; **21 total stages (0–20), no duplicates or omissions.** Teams may have more than one contributor internally but must name a single accountable reviewer.

### 3.1 Owned paths: proposed target module structure

These are **target paths**, not a claim they all exist in the current repository. Stage 1 records the exact actual mapping and migration adapters before teams create or move files.

| Owner | Exclusive write-owned production paths | Exclusive team-owned tests/docs |
|---|---|---|
| **A** | `src/core/**`, `src/contracts/**`, `src/domain/profile/**`, `src/domain/storage/**`, `src/ui/system/**`, `tools/**`, `hosting/**`, `vercel.json`, `package.json`, `.github/workflows/**`, app entry/composition root | `tests/platform/**`, `docs/workstreams/platform/**` |
| **B** | `src/features/editor/**`, `src/features/templates/**`, `src/features/documents/**`, `src/features/import/**`, `src/features/export/**`, `src/features/ocr/**` | `tests/documents/**`, `docs/workstreams/documents/**` |
| **C** | `src/features/intelligence/**`, `src/features/ats/**`, `src/features/job-match/**`, `src/features/tailoring/**`, `src/features/writing/**` | `tests/intelligence/**`, `docs/workstreams/intelligence/**` |
| **D** | `src/features/cover-letter/**`, `src/features/tracker/**`, `src/features/interview/**`, `src/features/linkedin-coach/**`, `src/features/career-region/**` | `tests/career/**`, `docs/workstreams/career/**` |
| **E** | `src/features/onboarding/**`, `src/features/accessibility/**`, `src/features/experience/**`, `src/features/pwa-ui/**`, `extension/**` | `tests/experience/**`, `docs/workstreams/experience/**` |
| **F** | **No feature-production paths.** Owns acceptance harnesses and test fixtures, not product implementation. | `tests/integration/**`, `tests/e2e/**`, `benchmarks/**`, `qa/**`, `docs/release/**` |

**Shared / restricted legacy paths:** `Ledger_CV_Studio_Stage8_Free_Finalization.html`, `development/e20/**` through `development/e31/**`, historical frozen source bundles, and checksum-pinned reference artifacts are **read-only**. `docs/index.html`, `site/**` and `dist/**` are generated/assembled outputs: **only A's approved integration build** may change them, and generated outputs are not used as feature-authoring entrypoints. Existing `src/features/ui/**` / other unextracted legacy paths receive a one-time owner assignment in Stage 1; do **not** allow concurrent direct edits there.

**Exception procedure:** If D needs a template change, D opens an interface/change request to B, not a PR editing B's files. If E needs service-worker or build changes, E provides the behavior/manifest/tests and A implements the integration in A-owned files. If C needs profile schema fields, C proposes a versioned contract change to A, which maintains migrations and adapters. If F discovers a bug, F files a reproducible failing test; the owning team fixes it. Exceptions require explicit cross-owner review and a change-log entry.

### 3.2 Shared contracts to freeze at the Stage 1 gate

A publishes the **versioned TypeScript-facing contracts** (plain JS adapters allowed during migration) and contract tests before other teams integrate with the app:

- `CareerProfile` and `EvidenceItem`: owner-supplied facts, evidence references, source provenance, consent flags and optional confidence—not a fabricated numeric achievement.
- `ResumeVariant`: immutable identifier, master linkage, career content snapshot, presentation config, revision, target-job association and modification history.
- `JobTarget`: user-pasted/imported job information, raw original text, extracted requirements and optional source URL.
- `ApplicationRecord`: local status, job details, notes, tasks, links to **exact** CV/letter revision IDs.
- `CoverLetterDocument` and `InterviewSession`: independently editable local artifacts connected to a job/variant only by explicit IDs.
- `ImportReview`: extracted data, source locations, omitted/uncertain fields, warnings, human decisions, approved commit. Never silently overwrite.
- `SuggestionPatch`: proposed change, original/new text, evidence references, relevance explanation, approval/rejection status, and explicit “unsupported fact” flag.
- `DocumentArtifact` / `DocumentRenderer`: stable preview/export request inputs, PDF/DOCX/file outputs, page and text-order test hooks.
- `LocalRepositoryPort`: load/list/save with expected revision and clear failure result, backup/restore preview and user-confirmed commit; realistic conflict behavior across browsers (do **not** promise atomic localStorage compare-and-swap).
- `FeatureMount` / navigation events: register routes, editor panels, commands and dialogs without writing directly to other modules' DOM or state.

All identifiers, ownership, schema versions, error codes, migration policies, accessibility requirements, async cancellation and data/privacy rules must be documented. Contracts use synthetic fixtures and contract tests. Frozen contracts may evolve only through an Architecture Decision Record (ADR) and reviewed versioned adapter/migration—not direct unannounced edits.

### 3.3 Anti-conflict rules for parallel work

1. **Never commit directly to `main`.** One branch/PR per stage: `feat/ws-a-stage-00-baseline`, `feat/ws-b-stage-05-editor`, etc. Documentation PRs use `docs/`; fixes use `fix/`. Avoid long-lived branches spanning multiple stages.
2. **One owner for each production file.** Path ownership is enforced by PR review, ideally GitHub CODEOWNERS and branch rules. GitHub `main` was previously observed as unprotected; branch protection is an owner-approved governance step, not already configured.
3. **No feature-team editing of assembled HTML** and no edits to historical hash-pinned snapshots. Feature modules register through contracts; A owns the deterministic build and integration.
4. **No cross-team direct imports of private implementation files.** Use published contracts/adapters; external teams consume mocks during parallel development.
5. **Shared API changes follow propose → review → contract test → adapter/migration → consumer upgrade.** Existing consumers must continue to work or be updated through a coordinated integration PR.
6. **PRs include a changed-path ownership report**, stage ID, contract version, synthetic fixtures, test results, accessibility and privacy checks, migration/rollback notes, and explicit limitations.
7. **A controls a serialized merge queue.** Rebase/retest when the base changes; no simultaneous merging of branches that touch build, contract, storage or app composition.
8. **F must independently review CI, exports, data migration and benchmark claims.** Failed, missing, skipped or unrun tests are never silently marked “passed.”
9. **Integrations are explicit and additive.** Feature flags keep incomplete modules disabled. Feature teams must provide a standalone demo/mount contract without changing default routes, storage, or the public build themselves.
10. **Regular cross-team integration checkpoints.** A publishes versioned integration artifacts after tested PR merges; F reruns end-to-end suites; each owner confirms compatibility. Avoid uncoordinated bulk final merges.
11. **No secrets or customer data.** No real BYOK keys, real personal CV data or private job documents in GitHub, fixtures, logs or screenshots.
12. **Rollback is required.** A release candidate is identified by commit/artifact checksum; an additive failed stage can be disabled or reverted without losing the user's saved CV.

## 4. Parallel execution sequence and dependency gates

**Stages are assigned once by owner, but stages across different groups can overlap where gates permit.** The following are dependencies, **not calendar promises**.

| Wave | A — Platform | B — Documents | C — Intelligence | D — Career | E — Experience | F — QA |
|---|---|---|---|---|---|---|
| **0: Baseline/control** | Stage 0 then Stage 1 initial contracts | Audit existing editor; isolated prototypes/fixtures only | Build ATS fixture set; isolated analysis only | Inventory career workflows; isolated fixtures only | Accessibility/onboarding audit only | Create initial baseline regression plan |
| **1: Contract-compatible foundations** | Finalize Stage 1; start Stages 2–3 | Stages 5–6 against released UI/data contracts | Stages 9–10 against mock profile/renderer contracts | Stages 13–14 against mock document/job contracts | Stage 4 guided onboarding | Cross-workstream contract/functional QA |
| **2: Feature depth** | Stabilize local data and profile; adapter requests | Stages 7–8 | Stages 11–12 after evidence/variant contract | Stages 15–16 | Stage 17, then Stage 18 after platform/PWA interface available | Cross-origin, import/export, factuality, accessibility QA |
| **3: Final integrations** | Assemble and reconcile all accepted modules | Fix fidelity regressions and complete exported document evidence | Tailoring vs parser/export verification | Finish CV/letter/tracker integration | Stage 19 after Stage 14 tracker link contract; finalize mobile/offline | Stage 20 controlled comparative study and release recommendation |

### Required gate order

- **G0 — Baseline gate:** Stage 0 determines one reproducible, tested E31 development build; known failing CI/deployment gaps are closed or explicitly isolated. All teams may research/test, but **do not integrate into mutable legacy HTML before G0**.
- **G1 — Contract gate:** Stage 1 publishes stable module mounting, data and document interfaces, owners, directory map and build/test rules. B/C/D/E may then merge independently built features through A's composition layer.
- **G2 — Data/content gate:** Stage 2's failure semantics and Stage 3's career/evidence profile contracts are accepted for integration. C11 job tailoring and D14 application-linked revisions depend on these guarantees.
- **G3 — Document/analysis gate:** Stage 5 editor contract and Stage 7 preview/export contract allow C9/C10 checks to validate the **produced** résumé, not only raw text; Stage 8 import evidence feeds the profile review model.
- **G4 — Workflow gate:** D14 tracker linkage and D13 letter export are integration-tested before E19 extension writes captured job data or C11 produces application-linked variants.
- **G5 — Final acceptance gate:** Complete Stage 20 independent comparison and customer/device acceptance before labeling production ready. Owner release approval remains explicit.

**Parallelism examples:** C9 ATS algorithms can be written against mock `ResumeVariant` and `DocumentArtifact` while B5 visual editor is built. D13 cover-letter domain/editing can proceed using B's renderer contract before final B7 pagination. E4 onboarding can build a wizard against mocked app navigation before A finishes production composition. Cross-workstream integration waits for the stated gates.

**Critical path:** A0 → A1 → A2/A3 shared contracts → B5/B7 + C10/C11 + D13/D14 integrations → E17/E18/E19 verification → F20. No stage may close another group's unverified gate by assumption.

---

## 5. Stage specifications by developer group

Every stage below has: **scope**, **deliverable**, **dependencies/interfaces**, and **acceptance evidence**. Scope also includes preserving already-working behavior, regression tests and accessible error handling. Further detailed checklists belong to the stage-owned issue/PR, not an unsanctioned new architectural branch.

### Group A — Platform & shared contracts (Developer A)

#### Stage 0 — Repository recovery, baseline and release integrity

- **Scope:** Inventory existing Stage 8 plus E20–E31 code, features, generated outputs, test coverage, storage keys and critical known issues. Reconcile E31 GitHub branch source with what is actually deployed. Repair malformed candidate workflow definitions, stale source/build/audit assumptions, dependency drift and misleading version/docs references.
- **Deliverable:** Reproducible known-good development artifact with SHA-256 manifest, verified build instructions, status matrix, rollback candidate and failing-test register. Clearly distinguish repository candidate, preview and actual public site.
- **Dependencies:** Current `main` and historical read-only snapshots; no other stage required.
- **Acceptance:** Clean checkout builds the named artifact reproducibly; workflow YAML parses and required jobs actually execute; no silently canceled/bypassed release checks; changes do not erase or mutate user storage. Public deployment remains separately gated.

#### Stage 1 — Shared design system, module architecture and contract freeze

- **Scope:** Define typography, spacing, colors, navigation semantics, form controls and common responsive shell. Extract a safe app-composition/mount interface around the existing monolithic code, without requiring an all-at-once framework rewrite. Allocate all unowned legacy modules. Publish contracts in §3.2 and enforce path ownership.
- **Deliverable:** Contract registry, ADRs, design tokens, shared UI primitives, route/component demo harness, module ownership map, contract tests, and integration build adapter.
- **Dependencies:** G0.
- **Acceptance:** Feature demo mounts with a mock profile without editing the assembled HTML; navigation, focus, responsiveness, module errors and cleanup are tested; old feature routes still work; parallel team PRs can be integrated without touching each other's files.

#### Stage 2 — Safe browser-local persistence and recoverable editing

- **Scope:** Protect the existing local data model against quota failure, denied storage, corrupt JSON, two-tab edits, interrupted writes and moving between `file://` paths and hosted origins. Provide lossless backup/restore preview, revisioned saves where supported, recovery barriers and explicit error states. Avoid server/database infrastructure and speculative storage replacement.
- **Deliverable:** Versioned storage port, migration fixtures, backup compatibility test pack, error UX contract, testable failure-injection adapter and supported-origin behavior matrix.
- **Dependencies:** G1; current legacy storage inventory.
- **Acceptance:** Crash/quota/denial/conflict/corrupt-primary cases fail safely in tests; old backups can be restored; loss/conflict is never silently represented as saved; no false guarantee of atomic localStorage writes. Real browser-origin/device acceptance remains open until exercised.

#### Stage 3 — Master Career Profile, variants and evidence provenance

- **Scope:** One structured source of candidate-entered facts (education, roles, dates, skills, certifications, projects, achievements, evidence). Link master CV to independent job-tailored variants and preserve versions/revisions; label supported vs user-asserted facts. Never auto-infer unprovided achievements.
- **Deliverable:** Profile/evidence schema and validators, migration from existing CV forms, variant commands, provenance UI hooks and synthetic profile fixtures.
- **Dependencies:** G1; Stage 2 storage contract (implementation can begin with mocked adapter).
- **Acceptance:** Duplicating/editing a variant never mutates the master; importing or tailoring never silently overwrites facts; profile and history survive save/restore; unsupported achievements remain visibly unsupported.

### Group B — CV editor & document fidelity (Developer B)

#### Stage 5 — World-class direct-edit CV editor

- **Scope:** Responsive editable document canvas, direct text/section editing, panels, reorder controls, undo/redo and live preview. Support accessible keyboard alternatives to drag-and-drop, focus restoration and non-destructive switching.
- **Deliverable:** Editor module with data/command adapters, renderer integration fixtures, visual baseline screenshots, synthetic long/short CV tests.
- **Dependencies:** G1; consumes profile and version contracts; no direct writes to A's storage implementation.
- **Acceptance:** Edits persist through navigation, template changes, restart, undo/redo and export; no content disappears; mobile editing remains usable and error states are explicit.

#### Stage 6 — Premium template design and customization

- **Scope:** Audit the existing 30 templates for meaningful quality differences. Standardize professional classic, executive, graduate, academic, technical, modern and restrained creative families. Add controllable fonts, spacing, margins, header styles, paper sizes, columns and photo/no-photo.
- **Deliverable:** Template registry, original design tokens and previews, customization UX, consistent sample/overflow fixtures.
- **Dependencies:** Stages 1 and 5 renderer contracts; Stage 7 layout interface can be mocked.
- **Acceptance:** At least 30 genuinely usable, visually differentiated templates; no silent content change across switching; A4/US Letter, single/two-column and 1–4 page examples pass visual baselines and keyboard access.

#### Stage 7 — Professional page layout, PDF and editable DOCX export

- **Scope:** Deterministic pagination, keep-with-next rules, link preservation, correctly ordered selectable text, embedded/bundled fonts where legally permitted, accessible preview, A4/US Letter, and faithful editable DOCX.
- **Deliverable:** Versioned document renderer/export interface, text-order and geometry tests, PDF/DOCX fixtures, native Office/LibreOffice check protocol.
- **Dependencies:** G1 and Stage 5 editor/document contracts; uses Stage 6 template registry.
- **Acceptance:** No critical clipped or missing text, unwanted blank pages or swapped experience dates; exported text preserves logical order; native Word/LibreOffice manual fidelity gates must be recorded, not assumed from browser tests.

#### Stage 8 — Local document import, structured review and offline OCR

- **Scope:** Improve DOCX/PDF/TXT/HTML input handling, including headers, footers, hyperlinks, tables, hidden/omitted text warnings, scanned PDF page orientation and English offline OCR. Review source beside extracted text; never auto-merge unverified data. Multilingual OCR is a future capability unless bundled/tested.
- **Deliverable:** Import pipeline implementing `ImportReview`, synthetic/representative corpus, review approval UI, rejection/rollback tests, memory/multifile constraints.
- **Dependencies:** Stage 3 profile schema; Stage 7 document ground-truth hooks where relevant.
- **Acceptance:** Report accuracy for contact/dates/employer–bullet association against labeled fixtures; no silent loss/overwrite of important fields; OCR uncertainty disclosed; memory limits and cancellation tested.

### Group C — ATS, job matching & writing intelligence (Developer C)

#### Stage 9 — Explainable ATS and document quality diagnostics

- **Scope:** Create a coverage matrix matching all **27 publicly documented Enhancv check types**, plus genuinely useful additional diagnostics. Check text extraction, contact completeness, headings, chronology, bullets, readability and formatting on the **exported artifact** when possible.
- **Deliverable:** Explainable local rules engine, configurable diagnostic severity, reproducible corpus and per-check coverage matrix. Do not invent a third-party ATS score.
- **Dependencies:** G1; mock `ResumeVariant` and `DocumentArtifact` initially; real Stage 7 export contract for final validation.
- **Acceptance:** Every check has a named rule, fixture, false-positive policy and explanation; comparison to external parsers clearly states limitations.

#### Stage 10 — Vacancy analysis and evidence-based gap detection

- **Scope:** Parse user-pasted/locally imported vacancies into mandatory/preferred qualifications, skills, role, seniority, tasks and keywords. Compare against the master profile without claiming the applicant has missing credentials.
- **Deliverable:** `JobTarget` parser, local comparison UI, requirement-to-evidence citations and conflict/uncertainty labels.
- **Dependencies:** Stage 3 profile and job contracts; algorithm may start against published mocks.
- **Acceptance:** Each finding links to a specific original job requirement and specific candidate evidence or explicit missing-evidence statement; no unsupported “ATS pass probability.”

#### Stage 11 — Evidence-verified job-specific CV tailoring

- **Scope:** Create an independent tailored variant, relevance ordering, stronger—but factual—summary and bullet suggestions, transparent original/proposal diff, per-suggestion approval/rejection and mobile review. Preserve source evidence and history.
- **Deliverable:** Deterministic rule-based tailoring plus optional AI-provider adapter; approval workflow; evidence/refusal tests; exact variant/job linkage.
- **Dependencies:** G2; Stages 9–10 and 3, editor/variant commands from B5.
- **Acceptance:** No unapproved factual invention is committed; every change can be rejected/reverted; the master CV is unchanged; works without an AI key for useful baseline tailoring.

#### Stage 12 — Free writing assistant and optional privacy-aware AI

- **Scope:** Local writing checks for clarity, passive phrasing, repetition, weak bullets, action verbs and missing quantitative context; accessible guided self-improvement. Consider browser-local models **only if** supported device performance and distribution make them genuinely usable. BYOK remains strictly opt-in.
- **Deliverable:** Local suggestion engine, provider-independent API contract, side-by-side rewrite review, provenance display, no-key offline mode, disclosure before any external request.
- **Dependencies:** Stages 3 and 11; A-owned privacy/storage contracts.
- **Acceptance:** Useful suggestions with network disabled; no paid AI required; external requests cannot occur without informed user action; API keys excluded from Git/logs and ephemeral by default; proposed claims can never silently become facts.

### Group D — Career application toolkit (Developer D)

#### Stage 13 — Matching professional cover-letter studio

- **Scope:** Structured, directly editable letters with consistent CV branding and independent document variants; job-target linkage, factual checks, multiple original letter layouts, paper sizes and outputs.
- **Deliverable:** Cover-letter module, format tokens consumed from B's renderer, document review fixtures.
- **Dependencies:** Stages 1 and 3, Stage 7 export interface (mock first).
- **Acceptance:** Job and CV facts match unless user explicitly changes them; final output prints and exports; no fabricated achievements; saved revisions independent of CV master.

#### Stage 14 — Offline application tracker and task workflow

- **Scope:** Enhance existing tracker with Kanban/list views, statuses, company/role/location, notes, contact methods, job text/links, task due dates, calendar import review, reminders *only where browser capabilities permit*, and exact linked CV/letter revisions.
- **Deliverable:** Application module implementing `ApplicationRecord`, local imports/exports, undo/error states, offline fixtures and documented notification limitations.
- **Dependencies:** Stages 2–3 storage/profile ports and Stage 13 letter contract for complete linked flow.
- **Acceptance:** Whole application pipeline survives safe local backup/restore; incorrect linked versions are flagged; no assumption of background notifications when browser is closed; no server required.

#### Stage 15 — Interview preparation, STAR stories and structured practice

- **Scope:** Role-specific questions and competencies derived from the user's profile and target vacancy. Support editable STAR stories, timers, self-scoring, answer notes, reflection prompts and printable preparation pack. No webcam, voice-recognition or hosted service requirement.
- **Deliverable:** Local interview module and synthetic question/test corpus.
- **Dependencies:** Stages 3, 10 and 14 contracts.
- **Acceptance:** Questions and prompts are relevant to the selected role, distinguish examples from user facts and remain usable offline; user practice data can be exported/cleared safely.

#### Stage 16 — LinkedIn coach and international career content

- **Scope:** Analyze user-pasted/officially exported LinkedIn profile information; produce editable headline, About and role descriptions; align with verified career profile. Define region-specific CV guidance and multilingual career content. A/E supply common locale/display contracts; D owns career-specific rules and texts.
- **Deliverable:** Profile-coaching module, localized career fixtures, opt-in import/export UI and source-citation semantics.
- **Dependencies:** Stages 3, 10, 12; E17 international rendering/accessibility adapters for final acceptance.
- **Acceptance:** No unauthorized platform scraping, no fabricated job history, clear user review, and validated international examples (including RTL when enabled in the app).

### Group E — Onboarding, accessibility & distribution (Developer E)

#### Stage 4 — Beginner-first guided journey

- **Scope:** Create, Import, Improve, and Tailor entry flows; guided questions; relevant starter examples; progress; helpful errors; accessible resume-later behavior. **Do not** fork independent user-data schemas.
- **Deliverable:** Onboarding routes consuming A's navigation/profile contracts, first-use usability tasks and mobile fixtures.
- **Dependencies:** Stage 1 navigation/UI contracts and Stage 3 profile drafts (mock first).
- **Acceptance:** New users can create and export a coherent CV without an account or tutorial; avoid unexplained dead-end buttons; flow remains accessible with keyboard.

#### Stage 17 — Mobile usability and accessibility hardening

- **Scope:** Define shared accessibility acceptance rules, improve critical paths at 320px+ screens, accessible focus/landmarks, touch interactions, zoom, reduced motion, meaningful error announcements and screen-reader workflows. Teams B/C/D implement fixes in their own modules; E owns audit harness and experience-level adapters.
- **Deliverable:** WCAG 2.2 AA-aligned issue matrix, supported-browser device matrix, interaction tests and audited UX patterns.
- **Dependencies:** Stages 4–16 sufficiently functional; progressive audit can start immediately after G1.
- **Acceptance:** No unreviewed critical keyboard/mobile blockers; documented real-device and assistive-technology tests; no false claim that automated checks alone establish WCAG conformance.

#### Stage 18 — PWA experience, portability and safe offline updates

- **Scope:** Install/offline/reopen UX, clear storage health, update prompts, opt-in local backups, safe portable document packages, and local feedback bundles. E owns PWA UI and tests; **A owns all service-worker/cache/build implementations** from E's reviewed interface proposal.
- **Deliverable:** Offline/install UI, portable review package spec and import, cache/update test matrix, A-approved build integration request.
- **Dependencies:** Stages 0–2, 7, 14 and A's PWA adapter.
- **Acceptance:** HTTPS PWA and standalone `file://` are separately tested; service worker does not retain stale unbounded caches; upgrades preserve local user work; disconnected use behaves honestly.

#### Stage 19 — Optional local job capture/browser extension

- **Scope:** Permission-limited extension to capture user-selected job title/company/description/URL from supported pages, plus manual paste/CSV fallback. Avoid blanket scraping, hidden browsing, background user profiling or a server job index. The extension communicates with the app through a reviewed explicit import handoff.
- **Deliverable:** Extension with minimal permissions, user action UX, job import-review interface, store-policy/legal checklist, fallback without extension.
- **Dependencies:** G4; Stage 14 tracker import schema and Stage 10 job target parser.
- **Acceptance:** No background extraction or silent upload; import is user-reviewed; no direct writes to another team's storage; privacy, extension permissions and supported browser behaviors verified.

### Group F — Independent QA & competitive acceptance (Developer F)

#### Stage 20 — Cross-module verification and Enhancv head-to-head

- **Scope:** Maintain integration tests throughout development, then run comprehensive frontend acceptance: app boot, old-user migration, corrupted/quota/two-tab storage, keyboard/assistive tech, mobile browsers, offline web/PWA/file modes, PDF/DOCX imports/exports, fact-grounded tailoring, job/letter/variant linkage, security/privacy and performance. Benchmark Enhancv on equivalent user tasks using legally obtained accounts and identical anonymized data; blind finished-document assessment.
- **Deliverable:** Test harness, independent report, open defect ledger, artifact hashes, user-study methodology and reproducible head-to-head results with uncertainty.
- **Dependencies:** All integrated feature gates; continuous early work is expected.
- **Acceptance:** Every proposed metric is measured or marked unverified; no release-critical issue is quietly waived; the report states where Ledger wins/ties/loses; owner makes final release decision.

---

## 6. Cross-team integration contracts and handoff examples

| Producer → Consumer | Contract / payload | Handoff rule | Risk if bypassed |
|---|---|---|---|
| A3 → B/C/D/E | `CareerProfile` + `ResumeVariant` versioned fixtures | Consumer reads through public API; profile writes only through owner-approved commands | Data corruption, diverging field names |
| B7 → C9/C11 | `DocumentArtifact` PDF/DOCX + normalized extracted-text hooks | C tests outputs, requests changes by issue; does not modify renderer | Misleading ATS score |
| C10/C11 → B5 | `JobTarget` / `SuggestionPatch` | B renders suggestions; C owns evidence logic; approval command owns actual update | AI suggestions silently modifying CV |
| D13/D14 → C11/E19 | `CoverLetterDocument` / `ApplicationRecord` | Exact revision IDs and import-preview API; never bypass storage adapter | Wrong CV sent for a job |
| E4/E17 → all product teams | Navigation, UX, accessibility checklists | Each team fixes its own features; E tests common flows | Conflicting CSS/keyboard behavior |
| E18 → A | PWA cache/update and hosting requirements | A applies build/service worker patch after review | Broken offline cache or stale app version |
| F20 → A/B/C/D/E | Failing reproducible test, benchmark finding, severity | Owner fixes; F independently reruns; A merges in order | False “accepted” gate |

**Required common demo workflow:** synthetic profile → create master → choose template → export DOCX/PDF → paste job → inspect ATS findings → approve tailored copy → write matching letter → record application → restore from backup → reopen offline. Every cross-module build must keep this executable. Features unavailable in a given wave are represented by explicit disabled states, never deceptive success.

## 7. Stage package, issue and PR template

Every stage PR must contain:

1. **Stage and owner:** `Stage NN`, `WS-[A–F]`, accountable developer, current baseline SHA.
2. **Scope checklist:** required features; existing features preserved; explicit non-goals.
3. **Changes:** file-path list proving ownership and no unauthorized shared edits; interface changes and ADR references.
4. **Contract version:** consumed/provided interface versions, migration/compatibility handling and mock fixture updates.
5. **Verification:** exact commands, browser/origin, OS/device where used, synthetic fixtures and all test counts; explicit failures/skips and evidence artifact links.
6. **UX proof:** screenshots/video of relevant desktop/mobile states; keyboard/focus/error behavior; no dead-end UI.
7. **Privacy/security:** outbound calls, permissions, credential handling, storage keys and third-party notices.
8. **Data safety:** backup, rollback and corrupted/quota/legacy behavior where applicable.
9. **Integration steps:** composition changes requested from A, F's independent review, flags to keep incomplete work disabled.
10. **Acceptance record:** stage state, unmet criteria, blockers, reviewer and owner signoff. **Do not label the stage accepted when device/Office/user testing has not run.**

**States:** `NOT_STARTED → IN_PROGRESS → IMPLEMENTED_UNVERIFIED → AUTOMATED_VERIFIED → ACCEPTED`, with `BLOCKED` and `FAILED` explicit and independent of chronology.

## 8. Quality objectives and competitive proof

These are **targets**, not evidence of current performance. Baseline measurements must precede any “we exceed Enhancv” statement.

| Dimension | Proposed target | Evaluation |
|---|---|---|
| Price | Free core builder, ATS basics, writing guidance, import/export and local tracker | Usability audit with network disabled/no payment/no key |
| Templates | 30 consistently professional validated templates | Golden A4/Letter layouts and blinded human rating |
| ATS coverage | ≥27 meaningful check types with grounded explanations | Rule coverage against published competitor checklist + fixtures |
| DOCX/PDF contact/date accuracy | ≥98% critical field extraction on representative corpus | Compare against expert-labeled original documents |
| Experience/bullet association | ≥95% correct employer/title/period association | Structured import corpus and independent adjudication |
| Exported-file fidelity | ≥99% critical field preservation and logical order in selected parser suite | Multiple parser extraction and document inspection |
| Factual integrity | Zero **unapproved** fabricated claims in committed tailored outputs | Adversarial AI/rule tests + human review |
| Beginner success | ≥90% of recruited first-time users complete primary CV task independently | Moderated/unmoderated usability protocol |
| Blind comparative preference | Target ≥65% preferring Ledger in a pre-registered study with ≥120 participants | Balanced task order and blinded external reviewers; report confidence intervals |
| Local reliability | No unrecoverable data loss in approved simulated failure matrix | Quota, denied storage, restart, corrupted primary, two-tab, migrate/restore |
| Accessibility | No release-critical WCAG 2.2 AA-aligned blockers on supported matrix | Manual screen-reader/keyboard/device review plus automation |
| Privacy | No hidden CV exfiltration; optional external AI only after consent | Network inspection, mocked endpoints and policy review |
| Performance | Defined low-spec/mobile budgets based on measured baseline | Cold boot, editing latency, document export/OCR memory tests |

**Critical research caveat:** Enhancv is a moving target. Recheck its public features, price and availability when Stage 20 runs. Its self-published studies are not neutral evidence. The final comparative report must distinguish direct hands-on observations, user-study results, marketing claims and project assumptions.

## 9. Recommended issues/labels and merge/decision process

- Create milestone groups `WS-A Platform`, `WS-B Documents`, `WS-C Intelligence`, `WS-D Career`, `WS-E Experience`, `WS-F QA`, plus milestone `FINAL-ACCEPTANCE`.
- Create one stage parent issue per numbered stage, and bounded subtasks for implementation, tests, accessibility and contract updates—not separate tiny releases.
- Suggested labels: `workstream:A` … `workstream:F`, `stage:00` … `stage:20`, `contract-change`, `needs-integration`, `needs-device-test`, `release-blocker`.
- Enable protected `main` with approved required CI and CODEOWNERS if the repository owner authorizes governance changes. Changes to GitHub settings are **not made by this document**.
- Each team ships a reviewable PR in its owned paths, with mocks and test commands. A reviews composition/contracts; F reviews acceptance claims. No force merge on failing test.
- A publishes an integrated artifact with commit SHA and app SHA-256; F compares it to stage evidence. The owner can authorize a production candidate only after explicit release review.
- Deferred future work (a different roadmap): hosted job search, cloud account sync, collaborative workspace and hosted AI. Do not silently expand this roadmap into infrastructure work.

## 10. Suggested developer order of operations

1. **Start A and F now:** A fixes the baseline and publishes the ownership/contracts plan; F creates the independent minimum regression harness.
2. **Let B/C/D/E start with bounded discovery and mock modules** immediately—no edits to common app entrypoint or frozen artifacts until G1.
3. **After G1, run B5, C9–10, D13–14 and E4 in parallel** against A's approved mocked/public interfaces; A works on Stages 2–3.
4. **After G2/G3, run B6–8, C11–12, D15–16 and E17–18** with a serialized merge queue, contract tests and increasing end-to-end coverage.
5. **Start E19 only after D14 import and C10 job target contracts are stable.** Keep external-service features excluded.
6. **Finish F20 with real acceptance, controlled comparative study and explicit go/no-go.** A successful build is never itself a production approval.

### Final success condition

The team should be able to show—not merely state—that an independent user can create a more useful, correctly structured and visually professional CV, receive more reliable and explainable advice, tailor it truthfully to a job, export faithful PDF/DOCX files, manage related career materials, and do so for free without mandatory online accounts or AI credits.

**This roadmap is approved for parallel-development planning only when the owner reviews it; it does not assert that any of the 21 stages has been completed.**

---

## 11. Competitor and existing-project references

**Competitor primary sources (reverify during execution):**
- [Enhancv résumé builder](https://enhancv.com/)
- [Enhancv ATS resume checker](https://enhancv.com/resources/resume-checker/)
- [Enhancv application tracker](https://enhancv.com/features/job-application-tracker/)
- [Enhancv job discovery](https://enhancv.com/jobs/)
- [Enhancv LinkedIn coach](https://enhancv.com/resources/linkedin-coach/)
- [Enhancv interview tools](https://enhancv.com/features/ai-interview-help/)

**Own-repository primary sources:**
- [Current repository](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv)
- [Prior 30-feature PRD](PRD_FLOWCV_30_FEATURE_ENHANCEMENTS.md)
- [Existing storage inventory](STORAGE_MIGRATION_INVENTORY.md)
- [Existing release blocker](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/issues/5)
- [Current baseline branch](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/tree/main)

**Relationship to old PRD:** This roadmap does not delete or rewrite the earlier 30-feature PRD. The Stage 0 audit should map the earlier requirements F01–F30 to these stage owners and identify any uncovered or obsolete work explicitly. The previous PRD's “implemented ≠ accepted” rule remains in force.
