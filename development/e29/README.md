# E29 — Hosted Ledger CV Studio (Vercel beta)

**11 November 2026 · Designed for actual use, with explicit remaining acceptance gates.**

## What is deployed

E29 publishes the **exact SHA-pinned E28 standalone CV application** as a static HTTPS site. It retains all 30 templates, the career workspace, offline local PDF/DOCX exports, calendar tools, trained English image OCR, reviewed multi-page scanned PDF import, and the visual PDF proof workflow. No cloud database, login, API credentials, payments, subscriptions, server CV storage, or telemetry has been added. Normal use requires only a supported browser.

Hosted shell assets: `index.html`, `sw.js`, `site.webmanifest`, `favicon.svg`, the redistributed third-party notices, and the public code-integrity manifest. The web wrapper adds optional browser install/offline-after-first-visit support using a same-origin service worker. It caches **only** the public application shell and static icon/manifest, not imported PDFs, CV data, provider requests or browser uploads. Offline installation is subject to browser/cache storage restrictions; the standalone HTML remains the reliable offline fallback.

## Reproducible build

`npm install` installs pinned build-only `tesseract-wasm@0.11.0` and `pdfjs-dist@6.5.438`; no normal user install is required. `node tools/build-e29-vercel.mjs` fetches the English trained model only in the Vercel/CI build and validates its SHA-256 `7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2`. It reproduces E25 → E26 → E27 → E28, refuses to host anything except exact E28 input SHA-256 `73ca54189b8db116c5f9760f9372dc2082a836de5dfcbdea43c03eff436dcbd7`, and writes `site/`. Deployment builds are fail-closed.

## Real HTTP and offline checks

Native browser tests check the actual generated HTML over a local HTTP origin, localStorage persistence, true bundled Tesseract WASM OCR with synthetic names and dates, local PDF renderer availability, registered service worker, reload after simulated complete network outage, no outbound HTTP(S) traffic during normal use, and no page JS exceptions. The matrix includes Linux Chromium, Windows Chrome and Windows Microsoft Edge. Earlier E28 direct file:// QA and document/print regressions remain preserved.

## How to use safely

Visit the published HTTPS URL. Choose **Create CV** or **Upload existing**. Your CV data remains in *that browser profile and that web origin*, not automatically synced to other devices or the downloaded offline HTML. Use the app's **Export / Backup** tools often, especially before clearing browser storage, changing browser/device, or moving between local HTML and website. Opening a PDF or other resume file does not upload it to our servers. Optional user-initiated BYOK provider features, if used, are a separate external-data-sharing action and should be reviewed carefully before authorizing.

## Requirements not marked complete

Clean synthetic English OCR is not a scored real applicant-image benchmark. True Word office fidelity, a full real-documents corpus, human visual inspection of all template/page combinations, screen readers and Arabic RTL, Safari/Firefox/mobile, physical 8GB Windows 11 performance, simultaneous-tab and backup/recovery signoff, and real-user usability remain open in GitHub issue #5. This beta is **not** declared a finished or formally accepted commercial release. No payments, cloud sync or credential storage has been added. A stable web URL is not proof of production quality.

