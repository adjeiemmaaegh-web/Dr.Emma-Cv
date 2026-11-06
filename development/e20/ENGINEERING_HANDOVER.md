# Ledger CV Studio — E20 Offline Calendar Import (2026-11-06)

## Decision

**Production NO-GO / development candidate.** This is a source-only, offline-first, single-HTML increment. It does not authorize release, public deployment, payments, web services, or cloud storage. Normal use remains double-clicking the standalone HTML without Node, CMD, installation, or network.

## New work completed

The career tracker previously exported `.ics` reminders but did not import calendar files into the local task workflow. E20 adds a bounded iCalendar importer under **Career tracker → Tasks & reminders**.

- Reads local `.ics` bytes without network requests, external libraries, or background work.
- Supports all-day events, UTC timestamps converted to the device's local calendar date, and explicitly labelled floating local timestamps. Files are limited to 1 MB and 300 events with bounded line sizes/nesting. Malformed dates and unsafe control characters are rejected.
- Skips unsupported recurrence, cancelled events, and unhandled named time zones, showing warnings in the review screen rather than silently creating misleading reminders.
- Presents dates, summaries, and descriptions for manual review. Users can individually deselect events. Save is disabled until explicit consent; cancellation does not change stored CV or career information.
- Imports selected events as **unlinked local career tasks**; does not auto-update applications, contact anyone, alter CV documents, or synchronize to an external calendar. Existing tasks with the same deterministic event ID are never overwritten; repeated imports are idempotent for unchanged event UIDs. If an event is rescheduled under the same UID, it is skipped on reimport rather than silently moving the existing task.
- Uses the existing career storage validation and a single guarded write with a readback. The existing non-atomic, best-effort cross-tab conflict limitation still applies. Calendar headings/descriptions are rendered as escaped plain text.
- Existing generated DOCX and historical builds were not modified. The build is SHA-pinned to the 2026-11-06 Contact Skill Integrity HTML.

## Completed evidence

- `npm run verify:e20` passed. Main `node --test tests/*.test.mjs` suite **669/669**, including **12 new E20 focused tests** (overlapping count), 0 failures/skips.
- `qa/e20_ics_full_app.py` passed **5 in-app Chromium workflows** using `page.set_content()` and simulated memory storage: cancel; selective approval; duplicate prevention; repeat import; storage quota failure. No JavaScript errors or external requests.
- 390px and 1280px Chromium viewport checks found no page horizontal overflow; the file input has an accessible label.
- This was **not** a native `file://` run, true persisted browser storage, real Microsoft Outlook/Google Calendar/Apple Calendar import test, or a real screen-reader/mobile device acceptance.
- Independent extraction/rebuild of the source archive must match the delivered HTML/QA hashes (recorded in delivery manifest).

## Important limitations / future blockers

**Original seven critical release gates remain OPEN:** real Windows Chrome/Edge `file://` boot; native browser save/reopen and cross-tab conflict; same-tab crash/reload recovery; real denied/partial storage behavior; full native PDF/DOCX/print acceptance; actual keyboard/screen-reader/mobile/RTL sign-off; authorized real BYOK provider checks. **Reliable trained offline OCR** for scanned CVs and broad third-party document fidelity are also OPEN. The existing lightweight OCR remains experimental. No browser-WASM OCR engine or trained language files were bundled because the required assets could not be obtained and validated here.

**E20 calendar scope** is import to Ledger's local tasks from explicit all-day/limited timestamp `.ics` sources. It is not bi-directional calendar synchronization, recurrence expansion, or proof of real external calendar-client interoperability. A calendar app may synchronize exported events only after explicit user-initiated import into that app.

## Rebuild from this source ZIP

From its extracted root, use `npm run build:e20` to regenerate `dist/Ledger_CV_Studio_E20_Offline_Calendar_Import_2026-11-06.html` and `dist/LEDGER_E20_OFFLINE_CALENDAR_QA_2026-11-06.html`. `npm run verify:e20` runs the build, Node suite, and synthetic Chromium E20 workflow (development QA only). These commands are for engineers, not normal Ledger users.
