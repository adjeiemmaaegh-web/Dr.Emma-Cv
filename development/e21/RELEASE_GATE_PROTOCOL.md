# Ledger CV Studio — physical acceptance and release-gate protocol

**Status: NOT SIGNED OFF — production NO-GO.** This protocol does not authorize deployment, payments, cloud, or live API use.

## Before testing

Use synthetic CVs, sample calendars and disposable browser profiles. Make a manual JSON backup from any preexisting Ledger profile before opening a different HTML filename/location. `file://` localStorage scope varies by browser and exact file URL, and automatic migration of old saved profiles is unverified.

Record: OS build, browser and version, exact HTML SHA-256, file origin, timestamp, actual outcome PASS/FAIL/BLOCKED, defect reproduction, and sanitized screenshot/QA JSON. Never share real CV content or API keys in the evidence.

## Seven original critical release gates

| Gate | Required real-device evidence | Exit criterion |
| --- | --- | --- |
| Windows Chrome/Edge boot | Windows 11, each installed browser, original file:// HTML, console log, offline operation | No fatal boot errors; all main entrypoints usable |
| CV persistence and two tabs | Save complete synthetic CV, close/restart browser, reopen exact file; edit in two tabs | Exact fields retained; second tab warned; no silent overwrite |
| Emergency draft recovery | In disposable profile force a rejected save while editing, reload same tab | Recovery copy available and readable; no surprise auto-apply or silent loss |
| Storage denial and partial writes | In disposable profile test quota/blocked storage and rejected/silent write; restore browser storage settings afterward | Accurate warning; prior saved data preserved; manual export offered |
| Native Word/PDF and 30 templates | In Chrome/Edge and actual Microsoft Word, export A4+US Letter for short and 4+ page CVs; inspect every family and all templates | No clipped/omitted text, blank pages, bad RTL, broken links, or missing fields |
| Accessibility/mobile/localization | Keyboard-only Tab/Shift+Tab/Escape/dialog focus; NVDA or VoiceOver; Android/iOS; English/French/Spanish/Arabic and RTL | All core flows navigable, legible, correct direction and accessible labels |
| Authorized BYOK provider | Only after separate owner approval and disposable credentials; inspect consent, CORS, cancellation, storage/network boundaries | No surprise uploads or autosave; valid provider behavior; no leaked key |

Hosted GitHub Windows runner checks (Windows Server, not Windows 11 physical hardware) are useful engineering evidence but **cannot sign off** these actual device gates.

## Additional product-release blockers

- Offline OCR: obtain rights-compatible local engine plus language data, bundle in single-file/offline package, then measure names, emails, numbers, dates and cross-script errors on a representative scored real scanned-CV corpus. Manual verification remains mandatory.
- Complex document import: test representative native Word, legacy DOCX, columns, tables, tracked changes, images, text boxes, malformed files and non-Western fonts with exact source-vs-reviewed-text comparisons.
- Calendar client compatibility: export/download real ICS fixtures from Apple/Google/Outlook, import to Ledger in a disposable profile with no network, confirm dates, recurrence/timezone warning and privacy.
- Full E20 modular source zip and 669-test reproduction are still missing. E21's reproducible incremental build proves E20 HTML -> E21 HTML byte integrity, **not** the missing historic 669 tests.

## Release decision

The original release gates remain OPEN until owner-collected real-device evidence is reviewed and approved. Neither this candidate nor CI success grants permission to merge into main or deploy a Pages build. Reconcile all failed tests, create an independent QA signoff record, then request a separate explicit release decision.
