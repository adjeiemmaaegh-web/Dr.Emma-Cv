# Ledger CV Studio E23 — safer offline iCalendar imports

**Engineering candidate, 11 November 2026. Production NO-GO.** E23 starts from frozen E22 and does not change any stored CV/career schema, cloud setting, API handling, payment behavior, or shipping configuration. E20, E21, and E22 artifacts remain intact.

## Two reproduced defects corrected

1. **UTF-8 BOM from calendar exporters:** E22 rejected otherwise valid local .ics files that began with a BOM (U+FEFF). E23 accepts one leading BOM after existing maximum-size and control-character checks. Unknown encodings and non-calendar data remain unsupported.
2. **Calendar-wide cancellation notice:** E22 ignored a top-level METHOD:CANCEL header and could convert an event cancellation notice into a new reminder task. E23 detects that header regardless of its position in the calendar, marks scanned events skipped, and presents a warning. Existing stored tasks are not deleted or rescheduled.

E23 does **not** automatically reconcile cancellation notices with existing tasks. Timezone and recurrence expansion, and interoperability with real exported calendar files, still require independent validation.

## Build and evidence

- E22 source base SHA-256: ca686104b80df028b8f52b0b91adbafbd569709600dee493f9b8102e1a98e512.
- E23 exact generated application SHA-256: 5ad2e0ee3171502a4e5c0720ef9becf49ab97e791b3ba6affd0364e5f7bc8807.
- Four auditable replacements in development/e23/source/calendar_patch.json.
- Standalone candidate: Ledger_CV_Studio_E23_Calendar_Import_Safety.html.
- Run node tools/build-e23.mjs to assert the patched artifact is byte-identical to the committed one and generate dist output. The command prints the E23 SHA-256.
- Run node --test tests/e23-calendar.test.mjs for pure JavaScript regression checks.
- Run python tests/e23_native_calendar.py with Playwright installed for real file:// browser checks.
- CI checks hosted Linux Chromium, hosted Windows Google Chrome and Edge. This is engineering evidence only.

The app remains free and offline-first. Only synthetic CVs and calendar fixtures should be used in tests.

## Open release blockers

Original physical-device release gates, reliable trained offline OCR, complex Word/PDF import-fidelity corpus, real Outlook/Google/Apple calendar export interoperability, independent human review of 30 templates, mobile/RTL/screen-reader coverage, authorized live BYOK, and unavailable original E20 modular source are still open.

**No merge to main, public deployment, payment/cloud/provider activation, or production-readiness claim without explicit owner authorization.**
