# Ledger CV Studio — Product Requirements Document
## FlowCV Competitive Enhancement Programme (30 Features)

**Document version:** 1.0 · **Date:** 2026-10-30 · **Status:** Proposed implementation specification, not development completion  
**Product:** Ledger CV Studio (repository: Dr.Emma-Cv)  
**Baseline:** Stage 8 Free Edition standalone HTML; existing user data and features must be preserved.  
**Owner policy:** Free product, offline-first, no payments, no subscriptions, no forced account, no live cloud integration, no deployment approval.  
**AI policy:** Bring Your Own API Key (BYOK); no credentials in source code, repositories, Git history, builds, sample files, diagnostics, error reports, or issue templates.

## 1. Executive decision

Implement all 30 identified gaps. **Modularize source first** (TypeScript, reusable components, testable domain services). Add React incrementally to high-complexity editor surfaces only where justified, rather than rebuilding all legacy functionality at once. Produce a **single self-contained HTML distribution** for ordinary users if browser compatibility and features allow. Developers may use Node.js/build tools; users must not need them.

No feature can be marked complete solely because a button or UI panel exists: it requires implemented behavior, explicit acceptance criteria, and automated verification. Formal user-device, cross-browser, accessibility, import/export fidelity and security acceptance can be postponed until consolidated testing, but must remain **open** rather than implicitly passed.

## 2. Objectives, non-goals, and constraints

**Objectives:** FlowCV-class document design, fast guided CV editing, dependable PDF/DOCX, accurate import, coherent application workflow, optional user-controlled AI assistance, worldwide language/layout support, and evidence-based quality assurance.

**Non-goals:** clone FlowCV artwork/code; guaranteed ATS score; auto-submission to employers; mandatory cloud; billing; collecting CVs centrally; AI-generated fictional credentials; storing user API keys in GitHub; shipping a bundled provider key; claiming production readiness without acceptance.

**Hard invariants:**
- Remain free and privacy-first; CV data stays on-device except user-initiated actions (e.g., BYOK request).
- Existing Stage 8 resumes, application records, exports, backups, and encrypted transfer workflows must remain accessible.
- Preserve a master-CV model and independently editable targeted variants.
- Preserve explicit backup/export and user recovery options.
- Maintain single-HTML delivery if verified feasible; if a proposed feature conflicts with direct file:// execution, document the tradeoff and seek approval before changing the delivery contract.
- Never embed personal user data or real API keys in tests, fixtures, screenshot artifacts, or telemetry.
- Include accessible keyboard, screen-reader, mobile, high-contrast, and print behavior.

## 3. Target architecture

**Repository organization (proposed; not yet implemented):**

```text
/
  README.md
  docs/
    PRD_FLOWCV_30_FEATURE_ENHANCEMENTS.md
    architecture.md
    migration.md
    decisions/
  src/
    app/                  # shell, routes/panels, providers
    components/           # accessible primitives and dialogs
    domain/
      cv/                 # canonical models, migrations, versions
      application/        # jobs, tasks, interview records
      documents/          # rendering, pagination, export
      ai/                 # provider adapters and BYOK boundaries
    features/
      editor/
      templates/
      importer/
      documents/
      career/
      localization/
      onboarding/
    storage/              # local durable data, backup, conflict detection
    styles/
  tests/
    unit/
    integration/
    browser/
    fixtures/             # synthetic records only
  tools/                  # build-only
  dist/
    Ledger_CV_Studio.html # generated file, release candidate
```

**Data flow:** canonical versioned career profile → independent CV variant/content selection → template/design configuration → preview/page layout → print/PDF/DOCX. Jobs refer to a **specific immutable document revision** or exported snapshot, not a mutable latest-CV pointer. Use explicit schemas and migrations; avoid splitting the same facts into disconnected workbenches.

**Technology choices:** TypeScript + Vite build, optional incremental React + TypeScript for editor/preview, focused state management, CSS Grid/print styles, IndexedDB for scalable content with backup and migration safeguards, Web Crypto for user-controlled encrypted transfers, Vitest and Playwright for engineering. Third-party code must be legally reviewed and bundled for offline use. Do not assume React, Vite, a library, or a singlefile plugin automatically handles file://, workers, font paths, printing or browser storage.

**Source-to-release process:** modular source → typecheck/lint/unit/integration → deterministic bundled single HTML → test opening the actual artifact under file:// and airplane mode → hash/manifest/release notes. A green development-server run does **not** prove the distributed HTML works. Keep the existing Stage 8 HTML as a recoverable baseline until migrated parity is verified.

## 4. Thirty required features and explicit implementation/exit criteria

Status for each item starts **PLANNED**. Priority is delivery order, not permission to omit any item.

| ID | Gap / feature | Implementation requirement | Minimum demonstrable exit criteria | Priority |
|---|---|---|---|---|
| F01 | Professional template library | Create distinct layout families, not cosmetic duplicates; configurable template registry with preview thumbnails. | At least 24 genuinely distinct launch-quality layouts spanning classic, modern, creative, compact, photo/no-photo, ATS-first; every layout handles 1–3 pages. Expand towards 100+ only after quality gates. | P0 |
| F02 | Template visual quality | Shared typography tokens, consistent baseline grid, spacing, alignment, restrained visual hierarchy. | Golden-fixture visual comparison for all layouts at A4/Letter; no clipped, overlapping or unreadable sections. | P0 |
| F03 | Advanced design customization | Controls for font, scale, colors, section headings, margins, spacing and column ratios; persist per variant. | Design changes update preview and export; reset and undo work without changing career content. | P0 |
| F04 | Instant live preview | Reactive editor/preview with stable selection, focus and debounced heavy rendering. | Text and structure edits update preview without manual refresh; sustained edits remain responsive on low-spec laptop. | P0 |
| F05 | Safe template switching | Separate content/schema from theme/layout; non-destructive template selection. | Switching templates twice preserves all CV text, section ordering, omitted/visible rules and master designation. | P0 |
| F06 | Paper/column/photo layouts | A4/US Letter, single/two-column, optional photo, compact/standard layout modes. | Each combination prints correctly; photo omission does not leave blank space; photo controls respect local privacy. | P0 |
| F07 | Multipage pagination | Dedicated layout measurement and page-break policy; keep headings with content and protect orphan lines. | 1–4-page fixtures have no cut text or sections bleeding off paper; deterministic repeat exports. | P0 |
| F08 | High-fidelity PDF | Printable document with text selectable/searchable, controlled margins, links and metadata. | PDF extracted text includes all intended content in logical order; A4/Letter layout matches print preview and no unexpected blank pages. | P0 |
| F09 | Fonts and typographic hierarchy | Bundled legally distributable fonts or system fallbacks with multilingual coverage. | Offline fonts render correctly; no remote font requests; export supports bold/italic/link hierarchy. | P1 |
| F10 | Section rearrangement | Accessible drag-and-drop plus up/down keyboard controls and custom sections. | Reorder persists across reload, template changes, exports; screen-reader and keyboard alternatives available. | P1 |
| F11 | PDF resume import | Local PDF text extraction; user review of parsed fields; OCR optional later, never silent guess. | Text PDF fixture maps fields with confidence/review prompts; scanned PDFs receive honest unsupported/manual-review message if OCR unavailable. | P0 |
| F12 | DOCX resume import | Local DOCX text/structure extraction and normalization with review step. | Tables/bullets/dated jobs import without silent loss; unsupported components flagged; original file stays untouched. | P0 |
| F13 | Image resume import | Local PNG/JPG OCR where feasible with user-supplied or legally bundled OCR runtime; fallback manual capture. | Offline sample imports produce reviewable extracted text; low-confidence content flagged; no network OCR without explicit opt-in. | P2 |
| F14 | Pasted resume import | Paste → parse proposed sections → review each record → merge/new CV. | No data overwrite before confirmation; all unknown lines preserved in review; duplicate-detection offered. | P1 |
| F15 | First-run onboarding | Clear create/import/template/start wizard, starter examples, skip/resume. | User can produce first valid CV without account or tutorial; initial guide is keyboard/mobile usable. | P0 |
| F16 | Smart section guidance | Role-aware prompts, grounded examples and completion hints; no invented experience. | Hints distinguish optional from required fields; user can dismiss; content is never inserted without user action. | P1 |
| F17 | CV duplication and targeted variants | Safe copy from master, editable labels, history and link to job target. | Duplicating does not mutate master; variants have independent design/content; deletion requires confirmation. | P1 |
| F18 | Full cover-letter builder | Structured salutation, role/company, evidence paragraphs, sign-off, editable live preview. | Printable and exportable letter with no fabricated claims; saved locally and linked to CV/job. | P1 |
| F19 | Matching document branding | Shared design tokens between CV, cover letter and relevant exports. | Typography, name block and accent style match across documents; independent overrides possible. | P1 |
| F20 | Kanban job tracker | Accessible board with configurable workflow statuses and list alternative. | Move job between statuses by pointer/keyboard; persistence, undo or explicit confirmation, and filtering work offline. | P1 |
| F21 | Application-linked documents | Connect each job with selected CV revision, cover letter, notes, job ad and attachments metadata. | Opening job shows exact associated version; exported job bundle has consistent references and no dead links. | P1 |
| F22 | Tasks and follow-ups | Tasks, due dates, reminder flags and local notification only if user grants permission; fallback in-app list. | Sorting and completed status work offline; no promise of notifications when app is closed under file://. | P1 |
| F23 | Application analytics | Local funnel, counts, conversion, time-to-interview and user-defined periods. | Counts reconcile to job records, respect deleted records and timezone, export safely without CV text. | P2 |
| F24 | AI bullet rewriting | BYOK provider adapter, evidence-grounded rewrite suggestions, original vs proposed diff. | Without API key, app works normally; suggestions never auto-apply; prompts cannot invent employer, date, skill or metric. | P1 |
| F25 | AI summary refinement | BYOK revisions tied to selected CV evidence and target job, editable diff. | User chooses provider/model; request preview warns what content leaves device; no silent upload or key persistence. | P1 |
| F26 | AI grammar/spelling | BYOK optional proofreading and local rule-based fallback where useful. | Suggested corrections distinguish grammar from factual changes and require explicit acceptance. | P1 |
| F27 | AI translation | BYOK multilingual translation of selected sections with original retained. | Source and translated versions compared side-by-side; names/dates/metrics preserved; no automatic replacement. | P2 |
| F28 | RTL language support | Logical CSS properties, RTL text, language metadata and font/print support. | Arabic/Hebrew editor, preview, PDF output and mixed-direction contact info behave correctly. | P1 |
| F29 | Localization | Translation catalog, localized date formats, page standards, country-specific optional fields and Unicode. | At least English + one RTL language fully exercised and documented; missing translations fall back cleanly. | P1 |
| F30 | Product maturity and usability | Accessibility, performance, backup/recovery, error messaging, cross-browser QA, real-user usability. | No open release-critical issues; explicit browser/device matrix, recovery drills, export artifact inspection and acceptance sign-off. | P0 |

All 30 feature IDs must appear in the issue tracker and traceability matrix, with development status, test evidence, severity, owner, and blocking dependencies. F13 and F27 are lower sequence priority, **not excluded**.

## 5. BYOK AI design and secret-handling policy (mandatory)

The AI portion must be fully optional. **No provider key is supplied by Ledger.** The user obtains their own key from a provider, configures an endpoint/model, and explicitly chooses when to submit text.

### 5.1 Minimum privacy-safe user flow
1. The AI tool is disabled until the user opts in and selects a provider.
2. A dedicated settings dialog accepts a provider, model, endpoint from a strict allowlist/validated HTTPS host, and API key through a password field.
3. Default key lifetime is **memory-only for the active tab/session**; do not put the key in localStorage, IndexedDB, cookies, URLs, hash fragments, exported backups, downloadable HTML, or diagnostic logs.
4. Each request displays a concise disclosure that selected CV/job text and the key will be sent **directly to the selected external provider**; the user confirms submission, with a clear Cancel action.
5. Use `Authorization` headers over HTTPS only. Do not append the key to a URL/query string; do not log request headers, response bodies containing personal CV information, or error traces containing credentials.
6. Keys are cleared on explicit disconnect; memory-only keys disappear on full tab close/reload. Avoid copying them into global error objects or analytics.
7. Send **minimal selected content**, not the entire CV by default. Prevent prompt injection from job descriptions becoming instructions to modify local data or send additional information.
8. Display suggestions as untrusted drafts; require explicit user acceptance; retain original content and an undo path.
9. No hard-coded real key, no shared default key, no secrets in CI, screenshots, repository examples or commits. Use `YOUR_API_KEY` synthetic placeholders only.
10. If the provider blocks direct browser requests by CORS or prohibits client-side keys, mark that adapter unsupported in static mode; **do not silently create a proxy**. A proxy/server would be an architectural and privacy change requiring separate owner approval.

### 5.2 Explicit security caveat

A browser BYOK key is **visible to JavaScript executing in the user's browser** and can be exposed by browser extensions, XSS, malicious dependencies, compromised downloaded HTML, or local inspection. Memory-only handling reduces persistence risk but is **not a secure server-side secret vault**. Never describe it as zero-risk or encrypted-at-rest when it is merely stored in memory. Prefer supported provider APIs that permit controlled browser access, and show prominent risk disclosure before use.

### 5.3 Provider abstraction

```ts
interface AiProviderAdapter {
  id: string;
  supportsBrowserDirect: boolean;
  validateEndpoint(url: URL): boolean;
  listOrValidateModel(model: string): Promise<boolean>;
  generate(request: {
    task: "bullet" | "summary" | "proofread" | "translate";
    evidence: string[];
    selectedText: string;
    locale: string;
    signal: AbortSignal;
  }, credentials: EphemeralCredential): Promise<UntrustedSuggestion>;
}
```

- Implement provider adapters as isolated modules; do not expose credentials through application state serialization, errors or devtools persistence plugins.
- Enforce payload size, request timeout, cancellation, retry policy that never doubles billing without consent, rate-limit handling, and token/cost information if the provider supplies it.
- Validate response structure; do not render model HTML directly. Escape text and block scripts, URL schemes and arbitrary markdown HTML.
- Provide an always-available non-AI workflow, and a clear label distinguishing automated rules from externally generated output.
- Add secrets scanning (e.g., Gitleaks plus GitHub secret scanning where available), baseline `.gitignore` for `.env*` and credentials, and CI checks against known token patterns. **Git ignore alone is insufficient if a secret was already committed**: revoke and rotate immediately, remove from history where appropriate, and audit forks/clones.

## 6. Migration, backup and backward compatibility

**Before refactor:** inventory all localStorage/IndexedDB keys, schemas and write paths in Stage 8; capture sanitized schema fixtures; compute immutable source hash; document feature parity.

**Migrating users:** do not assume moving/renaming an HTML file preserves browser file:// storage origin. Offer explicit pre-upgrade full backup (CVs + separately stored applications + encrypted transfer metadata), import preview, conflict resolution, reversible migration, and a documented recovery procedure. Preserve original backups rather than silently overwriting them.

**Storage strategy:** use schema versions and one-way migrators with rollback snapshots. Reject invalid or partial imports; validate checksum/integrity; never depend on a remote account to recover local data. Multi-tab conflicts need explicit user review, not blind last-write-wins.

**Exports:** golden test files for PDF, DOCX, TXT, HTML, backup JSON and encrypted transfer; ensure no regression in prior Stage 8 capabilities. Existing undo/redo behavior must remain bounded and clear when history is ephemeral.

## 7. Development execution — complete increments, no micro-releases

The 30 features are **all in scope**. Increment boundaries are about dependencies and verification.

| Increment | Scope | IDs | Deliverable |
|---|---|---|---|
| E0 — Architecture / parity | Source extraction, data inventory, build pipeline, baseline parity, migration plan, secrets controls | Foundation for all IDs | Modular repository + byte-identifiable Stage 8 baseline + candidate single HTML |
| E1 — World-class editor | Templates, appearance, preview, theme switching, layout, pagination, fonts, section organization, onboarding, hints, variants | F01–F07, F09–F10, F15–F17 | Professional CV builder and print preview |
| E2 — Import / document fidelity | PDF export, PDF/DOCX/image/paste import, matching cover letters and branding | F08, F11–F14, F18–F19 | Full document creation and import workflow |
| E3 — Career workspace | Kanban, job document links, tasks/reminders, local analytics | F20–F23 | Unified career workspace |
| E4 — Optional BYOK intelligence | Bullet/summary/proofreading/translation, provider support and data disclosures | F24–F27 | User-controlled AI tools with no bundled key |
| E5 — Globalization / quality | RTL, locale, access, performance, backup/migrations, consolidated hardening | F28–F30 + regression across F01–F27 | Free release candidate + consolidated evidence matrix |

**Per-increment development exit:** complete the scoped functionality; code review; static analysis and TypeScript checks; deterministic automated logic tests; build reproducibility; no new untracked secrets; generated single-file artifact verified to open where practical. Do not defer easy automated checks as an excuse for “development first.”

**Deferred formal acceptance:** Chrome, Edge, Firefox and Safari including real Windows/macOS/Android/iOS, file:// persistence/restart, two-tab corruption/race drills, imports and rendered PDF/DOCX inspection, native print, RTL, screen-reader, keyboard-only, low-resource hardware and user usability. These stay open until evidence is recorded and reviewed.

**Release gate:** Production remains NO-GO until zero critical defects and all explicitly required tests and migration/recovery checks pass; public deployment needs separate owner authorization.

## 8. Quality attributes and performance targets

These are **targets to validate**, not measured claims:
- 100% local normal editing without internet; no remote fonts, script CDNs or hidden telemetry.
- Keyboard navigable editor/preview, clear focus indicators, accessible error descriptions; target WCAG 2.2 AA.
- Typical editing response within 100 ms on a representative low-spec laptop; heavier preview work asynchronous without losing keystrokes.
- Support 1–4 pages reliably at minimum; long or unusual CVs should fail visibly and recoverably rather than truncate silently.
- Import operations must be non-destructive until user review and confirmation.
- All exported documents must be checked for text completeness and visual page overflow.
- GitHub Actions secret-scanning, dependency/license checks, and reproducible build hash; no unreviewed cloud deployment.

## 9. Risks, decisions and mitigations

| Risk | Mitigation |
|---|---|
| React rewrite breaks existing CVs | Incremental adapter approach; schema inventory, migration fixtures, backups |
| Single HTML limits workers/large libraries | Test actual file:// artifact early; prefer inline assets; escalate only with explicit approval |
| Font licensing or offline loading issues | Review licenses and bundle only distributable fonts |
| PDF differs from live preview | Shared renderer and golden rendered artifact comparisons |
| PDF/DOCX/image import loses data | Review step, confidence flags, provenance, original-preserving workflow |
| OCR size/performance | Lazy opt-in, local bundled runtime, small-device benchmarks |
| User API key leaked | Ephemeral credentials; secret scan; no logs; clear disclosure; no keys in Git |
| Browser CORS blocks BYOK | Provider-specific capability matrix; no covert proxy |
| AI fabricates qualifications | Evidence binding and diff-only proposals; user approval |
| RTL + multi-column print defects | Dedicated language/font/print fixtures |
| file:// storage behavior varies | Real-browser origin/backup/migration acceptance matrix |
| Scope creep around 100+ templates | Quality-first launch set, then expand truly distinct variants |

## 10. Definition of done and governance

For every F01–F30 item, the ticket must include: requirements, owner, design reference, dependencies, source paths, automated evidence, known limitations, accessibility treatment, privacy treatment, demo artifact, and disposition of deferred acceptance. States are **NOT STARTED → IMPLEMENTED UNVERIFIED → AUTOMATED VERIFIED → ACCEPTED**; neither UI presence nor a developer's statement alone advances to ACCEPTED.

Decisions requiring owner approval: public release, moving away from one-file end-user delivery, mandatory cloud/account, backend AI proxy, payment features, shipment of provider credentials, telemetry/data collection, and irreversible storage migrations.

## 11. Immediate engineering entry checklist

- Inventory the currently committed Stage 8 HTML, existing storage keys, and feature boundaries.
- Establish baseline hash, controlled source extraction, and regression fixtures.
- Add `.gitignore`, secret scan and synthetic-only fixture rules before introducing BYOK.
- Implement versioned canonical models and migration/backup scaffolding.
- Prove rebuilt single-HTML file:// parity before replacing the user-facing baseline.
- Create 30 traceable issues and begin E1 only once foundation code is safely in place.

**Approval note:** This PRD authorizes planning/specification only. It is not authorization for cloud connectivity, payments, deployment, use of a real API key in development, or release.
