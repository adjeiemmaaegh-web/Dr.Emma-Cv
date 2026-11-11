# Ledger CV Studio E24 — offline iCalendar timezone interoperability

**Development candidate · 11 November 2026 · production NO-GO.** E24 continues the E20 → E21 → E22 → E23 development review chain. It does not merge, deploy, change saved CV schema, activate cloud/payments or use any live BYOK provider.

## What E24 implements

- A separately auditable inline source module at `src/features/calendar/ics-import.inline.js`. The standalone E24 browser application is rebuilt by replacing **only** the E23 calendar parser block; all other code remains byte-identical.
- Supports standard all-day, floating local and UTC dates retained from earlier versions, plus **unambiguous IANA `TZID` date-time events**, e.g. `DTSTART;TZID=America/New_York:20261116T093000`.
- Handles `TZID` and `VALUE=DATE-TIME` regardless of parameter order and accepts quoted IANA TZIDs. Uses locally installed `Intl.DateTimeFormat` timezone data; there is no network lookup.
- Converts named-zone appointments to a **date-only local career task** in the current browser timezone. It clearly warns that the original appointment time will not be preserved; this is not a full calendar system.
- Checks both sides of daylight-saving transitions. Ambiguous repeated clock times and invalid skipped clock times are **not guessed**; they are omitted with warnings for manual review.
- Unsupported Windows/custom zone identifiers, recurrence rules, malformed values, and invalid/contradictory parameters are skipped conservatively, preserving existing tasks.
- Retains E23 UTF-8 BOM and `METHOD:CANCEL` safety corrections.
- Limits the per-session timezone formatter cache to 20 distinct IANA zones per calendar parser. Event and file limits from E20 remain.

## Rebuild and tests

- Original E23 input SHA-256: `5ad2e0ee3171502a4e5c0720ef9becf49ab97e791b3ba6affd0364e5f7bc8807`.
- Run `node tools/build-e24.mjs` to check exact standalone parity, embedded scripts and no external JS/CSS references and print E24 SHA-256.
- Run `node --test tests/e24-calendar-timezones.test.mjs` for 15 source/behavior regression tests.
- Run `python tests/e24_native_calendar.py` with Playwright installed to test actual `file://`, named-zone conversion, the in-app review and consent-to-save workflow, cancellation behavior, network silence and console errors.
- GitHub Actions runs the above on hosted Linux Chromium and hosted Windows Chrome/Edge, with a disposable browser timezone. Hosted CI is not the owner's Windows 11 test evidence.

## Deliberately unimplemented by this increment

- Expanding recurrence or guessing unsupported `VTIMEZONE` definitions, Windows aliases, calendar modifications and meeting times. The career workspace stores **dates**, not time slots or recurrence state.
- Automatically deleting/moving existing tasks when a calendar event is cancelled or rescheduled.
- Importing from real Outlook/Apple/Google exports with independently validated fixtures, particularly calendars containing proprietary TZIDs or `VTIMEZONE` aliases.
- Fully trained, browser-portable offline OCR, broad scanned CV/document corpus, native Microsoft Word and all owner-device accessibility/recovery gates.

**No production acceptance or approval for deployment.** Always export a backup before switching standalone file paths because file:// browser storage is not guaranteed to migrate between filenames.
