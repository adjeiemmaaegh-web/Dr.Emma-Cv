## E30 UX/UI polish candidate — 12 November 2026

The [E30 design audit and remedy notes](development/e30/UX_UI_AUDIT.md) document a full 14-screen router review, navigation/workflow and auxiliary-tool inventory, and before/after fixes for six overlapping floating launchers and 320px import overflow. E30 preserves the audited E29 application's CV data, trained local OCR, Word/PDF exports, career workflow and document geometry while introducing scoped app controls and a keyboard-accessible **Tools & language** menu. [Draft PR #13](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/pull/13) is unmerged and does **not** supersede the published E29 site yet.

**Exact E30 hosted HTML:** 16,010,305 bytes; SHA-256 `1dd5b058bc10e058825e37ec0de706f42efe2ac89c602a87909672f948dc546c`. [Hosted E30 Linux Chromium, Windows Chrome and Edge QA](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43216225981) passed 14 screens × four viewports per browser, no horizontal overflow or JavaScript errors, original offline OCR/storage tests, and 120/120 template-print cases on Linux. **Vercel E30 preview deployment was blocked by free-tier daily API quota HTTP 402**; the public site remains E29. Real device, screen-reader, Word fidelity and human visual QA remain open; **production release acceptance remains NO-GO**.

# Ledger CV Studio / Dr.Emma-Cv

Free, offline-first CV and career toolkit. This repository holds the current **Stage 8 development baseline**, not a verified production release.

## Open the app

Download or open [Ledger_CV_Studio_Stage8_Free_Finalization.html](Ledger_CV_Studio_Stage8_Free_Finalization.html) in a browser. Normal use requires no server, CMD, Node.js, user account, or payment.

## E20 development candidate (6 November 2026)

The newer [E20 offline calendar-import candidate](development/e20/README.md), [standalone E20 HTML](development/e20/Ledger_CV_Studio_E20_Offline_Calendar_Import_2026-11-06.html) and [local QA](development/e20/Ledger_CV_Studio_E20_Offline_QA_2026-11-06.html) are available for **development review only**. The original Stage 8 app below is unchanged. E20 remains **production NO-GO**. Back up your CV before switching file URLs; local browser storage continuity is not proven. Static artifact checks do not certify real Windows, document fidelity or accessibility.

## Latest E28 visual scanned-PDF OCR and release QA engineering candidate (11 November 2026)

[Draft E28 PR #10](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/pull/10) continues the E27 single-HTML offline CV builder. Scanned PDF import now has local preview of the **exact bitmap** used for trained English OCR, selectable 0°/90°/180°/270° correction **before recognition**, zoomable source comparison, a bounded five-image review cache and revocation of Blob references on close. The prior multi-page OCR atomicity, explicit import approval, and all previous functionality remain. The stand-alone E28 artifact is **15,999,116 bytes**, SHA-256 `73ca54189b8db116c5f9760f9372dc2082a836de5dfcbdea43c03eff436dcbd7`, with identical verified hosted Windows Chrome and Edge build outputs. Full [E28 GitHub Actions](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/workflows/e28-visual-pdf.yml) adds original E27/E26 QA and large synthetic template/export/Word/calendar checks. The original `main` remains unchanged; see [E28 engineering notes](development/e28/README.md). **Production NO-GO** until actual device, native Word, real OCR corpus, accessibility, mobile and owner release acceptance.

## Latest E27 transactional multi-page scanned-PDF OCR candidate (11 November 2026)

[Draft E27 PR #9](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/pull/9) adds **1–5 page local PDF OCR batches** with all-or-nothing review updates, cooperative stopping, prevention of duplicate PDF pages, and explicit reviewed CV import. [Hosted Linux Chromium and Windows Chrome/Edge tests](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43029129657) passed on the synthetic raster-PDF corpus, including inherited E26 single-page and E25 photo-OCR checks. The **standalone E27** HTML SHA-256 is `f6d68fea1f7cc93be5884631d1a945db92c5ce946a39ab22d12e04e2c0789650` (15,992,809 bytes). The generated HTML is available as an Actions engineering artifact, not a release. The earlier Stage 8 `main`, E20–E26 source and CV data formats remain preserved. Export an existing CV backup before changing standalone file paths. Real OCR accuracy/Office/device/accessibility acceptance remains outstanding; **production NO-GO**.

## Latest E26 offline scanned-PDF OCR engineering candidate (11 November 2026)

The [E26 standalone scanned-PDF OCR candidate](development/e26/README.md) extends the [E25 review-only trained English image OCR](development/e25/README.md) with bounded locally rendered **raster-only PDF page** recognition and explicit reviewed import. It uses no runtime network and remains a **single HTML file** for normal use. [Draft PR #8](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/pull/8) and [three-browser E26 native CI](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43012318742) passed. The generated E26 SHA-256 is `c05e4c037af412bd11822f4c9b089cbf02f4636cec787cfc32bf94d7c7fe180e` (15988960 bytes); a bundled standalone build is produced as a development-only Actions artifact. The Stage 8 `main` entrypoint and E20–E25 snapshots remain unchanged. Export a backup before opening a differently named HTML file, because file:// storage continuity is not assumed. Scanned-CV accuracy, real Microsoft Word, physical devices, mobile and accessibility gates remain OPEN: **production NO-GO**.

## New E25 trained offline English OCR engineering candidate (11 November 2026)

The latest [draft E25 trained OCR PR](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/pull/7) adds a **build-only optional English trained OCR engine** bundled into one offline HTML with review-and-consent safeguards. The frozen Stage 8/`main` application and E20–E24 review binaries are unchanged. The E25 HTML (11,623,585 bytes, SHA-256 `1126a81933d86dc54c7ac36eac9dd4e6aa01f8bddb47e7bcac5a546fb810c8a7`) is provided as a GitHub Actions **engineering artifact**, not a release. Rebuild with `node tools/build-e25-trained-ocr.mjs` using the pinned OCR build dependencies described in `development/e25/README.md`. [Hosted Chromium file:// trained OCR and review-only UI checks passed](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/actions/runs/43006306035) for a clean synthetic English CV. Real scanned-document accuracy, Windows 11 owner acceptance, office/print, accessibility, memory and mobile gates remain open. Export a backup before opening a different HTML filename.

## Latest E24 engineering candidate (11 November 2026)

The new [E24 standalone HTML](development/e24/Ledger_CV_Studio_E24_Offline_Calendar_Timezones.html) and [engineering notes](development/e24/README.md) extend offline calendar import with safe IANA timezone handling, daylight-saving ambiguity warnings, and a maintainable source module. Automated browser checks use synthetic data. The Stage 8 entrypoint on `main` and E20–E23 candidates are preserved. This is **a development candidate, not a released application**. Make an explicit full backup before changing standalone file paths.

## Previous E23 engineering candidate (11 November 2026)

The newest [E23 development candidate](development/e23/README.md) and [standalone HTML](development/e23/Ledger_CV_Studio_E23_Calendar_Import_Safety.html) build on the E20–E22 review chain. E23 fixes two iCalendar imports: a leading UTF-8 BOM and accidental task creation from calendar-wide cancellation notices. See [draft PR #4](https://github.com/adjeiemmaaegh-web/Dr.Emma-Cv/pull/4). This is **not a released or migrated version**. The main Stage 8 entrypoint remains unchanged; before opening another file URL, export a backup from the current app. Device acceptance and production launch remain unapproved.

## Engineering direction

- Keep the working standalone HTML release.
- Extract source into modular TypeScript and optionally React components incrementally, while safeguarding the existing data format.
- Deliver all 30 researched FlowCV improvements across templates, live preview, exports, imports, career tools, writing assistance, localization, accessibility, and reliability.
- Build the single HTML output from modular development sources where feasible.
- Run automated checks during development; keep full browser, mobile, and recovery acceptance as explicit pending gates.
- Preserve local-first storage and explicit encrypted manual transfers; do not activate cloud sync.

## Safety and limits

This is **not production accepted**. Preserve backups before changing versions. Browser file:// storage can be dependent on the exact URL and browser. Don't assume storage automatically migrates after renaming or moving the HTML file.

No payment processing, subscription, paywall, or external service is approved. No secrets or personal CV records should be committed.

The repository name is Dr.Emma-Cv; the product development name remains Ledger CV Studio unless explicitly renamed.
