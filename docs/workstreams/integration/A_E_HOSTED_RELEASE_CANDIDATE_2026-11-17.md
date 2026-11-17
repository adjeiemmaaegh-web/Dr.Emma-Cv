# Hosted A–E workspace release candidate — 17 November 2026

**Target:** the existing Vercel team Emma / `ledger-cv-studio` project, linked to `adjeiemmaaegh-web/Dr.Emma-Cv`. No new application or credentials are required.

## Deployment configuration

- `npm run build` / `vercel.json` now produce an actual **A–E integrated workspace homepage**, not the older E31-only homepage.
- The previously verified E31 standalone HTML is regenerated with its checksum gates and preserved byte-identically at `/legacy/index.html`, alongside its original integrity manifest.
- Only public-source modules, styles and static assets under specific `src/` directories are copied to the Vercel `site` output. Private CVs and backed-up files are never embedded.
- The new `/sw.js` caches public app shell assets only, supports offline app loading, and defers activation of updates until user approval. It does not intercept or cache user files, posted data, or API responses.
- Original browser-stored CV data stays under the same origin; moving from legacy to the new IndexedDB profile is review-first, not silent migration.
- `vercel.json` keeps `git.deploymentEnabled.main=false`; explicit operator-initiated Vercel deployment is used rather than enabling automatic production pushes.

## Verification and limitations

- CI in `.github/workflows/hosted-workspace.yml` exercises the **emitted `site/` artifact** via real Chromium, including online/offline loading, module resolution, persistent job tracking, and the classic fallback route.
- Exact E0, E29, E30 and E31 legacy build guardrails remain in the normal build pipeline.
- On-device career data is isolated by browser origin. An existing user on another hostname must export/import through the approved workflow; the app does not remotely sync.
- The hosted A–E workspace is a **public beta**, not an independently accepted commercial release. Native PDF/DOCX fidelity, multilingual/RTL, all devices, and independent Group F signoff remain outstanding.
- No payments, credential transmission, hosted private data, cloud backup or third-party AI providers are enabled.
