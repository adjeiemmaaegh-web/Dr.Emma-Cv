# Ledger CV Studio / Dr.Emma-Cv

Free, offline-first CV and career toolkit. This repository holds the current **Stage 8 development baseline**, not a verified production release.

## Open the app

Download or open [Ledger_CV_Studio_Stage8_Free_Finalization.html](Ledger_CV_Studio_Stage8_Free_Finalization.html) in a browser. Normal use requires no server, CMD, Node.js, user account, or payment.

## E20 development candidate (6 November 2026)

The newer [E20 offline calendar-import candidate](development/e20/README.md), [standalone E20 HTML](development/e20/Ledger_CV_Studio_E20_Offline_Calendar_Import_2026-11-06.html) and [local QA](development/e20/Ledger_CV_Studio_E20_Offline_QA_2026-11-06.html) are available for **development review only**. The original Stage 8 app below is unchanged. E20 remains **production NO-GO**. Back up your CV before switching file URLs; local browser storage continuity is not proven. Static artifact checks do not certify real Windows, document fidelity or accessibility.

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
