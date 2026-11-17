# Workstream E — Onboarding, accessibility & distribution (Stages 4, 17, 18)

Owner paths: `src/features/{onboarding,accessibility,experience,pwa-ui}/**`, `tests/experience/**`, this folder.
**Stage 19 (opt-in browser extension) was deliberately not built** at the owner's instruction: `extension/**` does not exist and nothing here depends on it. Manual paste/CSV job capture stays the only path (Group D's tracker already accepts pasted job text and CSV/JSON).

| Stage | State | What exists | Evidence |
|---|---|---|---|
| 4 Guided journey | AUTOMATED_VERIFIED (synthetic) | Create / Import / Improve / Tailor journeys as a pure state machine over A's `ResumeDocument`; field-level help and *"Example only"* hints that are never written into the CV; specific error messages; optional steps can be skipped; "resume later" drafts that are validated and (for import) recomputed, never trusted; journeys that need a CV explain why instead of dead-ending. Uses B (import/export) and C (checks, tailoring) only through their public APIs. `onboarding` `FeatureModule` renders it accessibly. | 9 unit tests incl. a first-time user producing a PDF with no key/network; real-Chromium run at 320px and 1280px |
| 17 Accessibility | AUTOMATED_VERIFIED for the checks listed; **conformance not claimed** | Shared helpers + CSS (`a11y.mjs`, `a11y.css`: live announcer, focus management, 44 px targets, visible focus, reduced motion, forced colours, text-spacing safe); an in-browser audit (`a11y-audit.mjs`) covering names, labels, ARIA refs, duplicate ids, target size (2.5.8), contrast (1.4.3), headings, live regions, alt text, error association, autocomplete (1.3.5), reflow (1.4.10), text spacing (1.4.12), zoom, reduced motion, `lang`; real-keyboard Tab reachability and focus-indicator check (2.1.1, 2.4.7/2.4.13) | audit run at 320/1280px against **onboarding, PWA panel and Group B's editor**; a negative-control test proves the audit detects 16 rule types on a deliberately bad page; remaining manual checks listed below |
| 18 PWA / portability | AUTOMATED_VERIFIED for the UI and logic; **needs Group A changes to be real** | Honest storage health (denied, quota error, nearly full, not persisted, `file://`), install/offline wording that never overclaims, opt-in backup reminders, safe update manager (user-approved, blocked by unsaved work, reloads once), checksummed portable package (per-section SHA-256, review-first, conflicts need an explicit decision, **credentials refused**), local feedback bundle (nothing sent, allow-listed diagnostics, personal-data warning), accessible `pwa-status` module | 18 unit tests; real-Chromium panel test at 320/1280px incl. the update flow with unsaved work |

## Verify
```
node --test tests/experience/*.test.mjs        # 18 tests (journeys + PWA logic)
node tests/experience/onboarding-browser.mjs   # real Chromium, audit + keyboard + flows
node tests/experience/pwa-browser.mjs          # real Chromium, audit + update flow
STRICT=1 node tests/experience/editor-a11y.mjs # audit of Group B's editor
node tests/experience/audit-selftest.mjs       # negative control for the audit
```

## Findings reported to other owners (Stage 17 process)
- **B — editor (fixed, please review):** the audit found a 1.4.12 text-spacing overflow at 320 px (template `<select>` wider than the screen). Fix: B's wrapper now carries the shared `ledger-a11y` class (one-token change in `editor-module.mjs`) and `a11y.css` caps control widths. The host must load `a11y.css`. Audit result after the fix: 0 findings at 320 and 1280 px, all controls reachable by Tab with a visible focus ring.
- Two audit false positives were fixed in the audit itself rather than hidden: disabled controls are exempt from contrast (1.4.3), and focus rings are measured with real keyboard focus because script `focus()` does not match `:focus-visible` after a mouse click.

## Change requests for Group A (service worker, cache, build: A-owned)
1. **`hosting/sw.template.js` calls `self.skipWaiting()` during `install`.** That activates every update immediately, which defeats the user-approved, unsaved-work-aware update flow built here. Required change: remove the automatic `skipWaiting()` and instead `self.addEventListener('message', e => { if (e.data?.type === 'SKIP_WAITING') self.skipWaiting(); })`. Until A does this, `createUpdateManager` is correct but cannot prevent a worker from taking over on its own.
2. Provide `services` to the host: `env`, `backup.export` (A's `createCareerProfileBackup` / the portable package), `backupState`, `lastWriteError` from the storage port, and `offlineReady` (true after the shell is cached).
3. Add `test:experience` and the three Chromium scripts to CI; load `src/features/accessibility/a11y.css` in the composed shell.
4. Add the portable package to backup/restore; keep `findSecretPaths` as a gate for anything leaving the device.

### Cache / update test matrix (to be executed by F with A's worker)
| Scenario | Expected | Status |
|---|---|---|
| First visit online | shell cached, "offline ready" true, no update prompt | NOT RUN (needs A's worker) |
| Reopen offline (hosted https) | app loads, saved CV present, honest offline message | NOT RUN |
| New version deployed, user idle, nothing unsaved | prompt appears; applies only after "Update now" | logic verified with fakes; real worker NOT RUN |
| New version, unsaved edits | "Update now" refused with explanation; nothing activated | verified with fakes; real worker NOT RUN |
| Old cache keys | removed on activate (A's worker already does for e29–e31 names) | NOT RUN |
| `file://` standalone | no install offer, storage-bound-to-path warning, backup prompt | wording verified; real browser NOT RUN |
| Private browsing / blocked storage | critical banner + backup button | logic verified; real browser NOT RUN |

## WCAG 2.2 AA issue matrix (scope: criteria this app's flows exercise; not the full success-criteria list)
| Criterion | Automated check | Manual still required |
|---|---|---|
| 1.1.1 Non-text content | alt present | alt quality |
| 1.3.1 / 3.3.2 Info, labels | programmatic labels, headings, error association | reading order sense |
| 1.3.5 Identify input purpose | `autocomplete` on personal fields | — |
| 1.4.3 Contrast (minimum) | computed text contrast (skips images/gradients) | gradients, images of text, hover/focus states |
| 1.4.4 / 1.4.10 / 1.4.12 Resize, reflow, spacing | zoom not disabled, no horizontal scroll at 320 px, clipped text under spacing overrides | 200%/400% zoom on real devices |
| 2.1.1 Keyboard | every control reachable by real Tab presses | complete tasks without a mouse |
| 2.4.7 / 2.4.13 Focus visible | ring present on every focused control | ring contrast against all backgrounds |
| 2.5.8 Target size (minimum) | ≥ 24 px (we use 44 px) | touch comfort on real phones |
| 3.1.1 Language | `lang` present | content language changes |
| 3.3.1 Error identification | invalid field has an associated message | wording clarity |
| 4.1.2 Name, role, value | accessible names, valid ARIA references, unique ids | assistive-tech announcements |
| 4.1.3 Status messages | live region present; announcer used for steps and errors | screen-reader behaviour |

### Not tested (open, listed so a green run is never read as conformance)
Screen readers (NVDA/JAWS/VoiceOver/TalkBack), real phones and tablets, Safari and Firefox, Windows High Contrast, 200%/400% zoom, dark mode appearance, cognitive/usability testing with real beginners, the legacy shipped UI (only the new modules were audited), Arabic/RTL.

## Known limitations
- Journeys cover one job and one education entry per run; more can be added in the editor. Starter examples are single-line hints, not templates.
- The `onboarding` module's DOM is tested in Chromium only. `pwa-status` shows an update prompt only if A's worker waits (see request 1).
- The audit uses its own contrast algorithm (no axe-core dependency); it skips elements over background images and cannot judge meaning.
- Portable package: one JSON file, not a ZIP; no encryption (users must protect the file themselves). Checksums detect damage and edits but are not signatures.

## Not accepted
No stage is ACCEPTED: no real-user first-use study, no assistive-technology or real-device testing, no real service-worker run, and F's independent review is outstanding.
