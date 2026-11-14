# Ledger CV Studio E22 — cross-browser Skills print-pagination safety (7 November 2026)

**Development candidate / production NO-GO.** E22 extends the frozen E21 standalone HTML without altering saved CV data formats, importers, experimental OCR, calendar workflows, DOCX exporter, external APIs, accounts or cloud functionality.

## Reproduced issue and corrected behavior

A deliberately long **18-role** synthetic CV (nine achievement bullets per role) revealed printable Skills-list orphans in multiple templates. On Linux Chromium, Monogram and Monogram Navy A4 could leave only the last skill on an extra final page. Hosted Windows Chrome and Edge confirmed the same issue with Horizon on US Letter.

E22 now uses a small **print-only** CSS rule to keep each short Skills heading/list together across all visual templates, rather than fixing only named templates. Browser print engines may move the entire group to a later page to preserve it. The editor does not change. The CSS does not promise perfect layout for arbitrary multi-page documents and cannot force a Skills section longer than a full page to remain indivisible.

## Frozen artifacts

| File | SHA-256 |
|---|---|
| `Ledger_CV_Studio_E22_Monogram_Print_Pagination.html` | `ca686104b80df028b8f52b0b91adbafbd569709600dee493f9b8102e1a98e512` |
| `Ledger_CV_Studio_E22_Offline_QA.html` | `cf68e13b4312d0d109b869334d37e618a715f82a2cc8143304f1467ebee403de` |

The retained filename reflects the original Monogram discovery; the finalized style rule also covers Horizon and all other templates. Rebuild with `node tools/build-e22.mjs`, and verify with `node --test tests/e22-artifact.test.mjs`. Exact application and QA SHA values must match. Normal end users still simply double-click the standalone HTML offline.

## Automated coverage and limits

- Local Linux Chromium `page.set_content()` with isolated mock storage: **120/120** short/long PDF checks passed (30 templates × A4/US Letter × 2 synthetic CV sizes), with valid page dimensions, retained name and role, all 18 long-form job markers and final sentinel, no PDF page with fewer than 20 extracted characters, no extracted text crossing paper boundaries, and zero unexpected HTTP(S) requests.
- GitHub Actions repeats 120 **genuine file://** checks per hosted browser: Linux Chromium, Windows Google Chrome, Windows Microsoft Edge; also exercises the E21 Word hidden-style privacy regression. Consult the actual CI results before claiming success. Hosted Windows is not the owner's physical Windows 11 machine.
- The original E20 and E21 artifacts are not changed. E22 does **not** solve reliable trained offline OCR or broad legacy document fidelity.

## Outstanding release blockers

Real Windows 11 hardware, Microsoft Word rendering, independent visual inspection of all 30 templates, actual crash/storage denial drills, keyboard/screen reader/mobile/RTL testing, real Apple/Google/Outlook calendar export interoperability, authorized BYOK provider, scored trained offline OCR and the unavailable historical E20 669-test engineering source archive remain **OPEN**.

Use synthetic data when testing, and export a backup before switching file URLs because browser file:// storage scope is not guaranteed to migrate. **No merging into main, public deployment, cloud/payments or provider activation is approved.**
