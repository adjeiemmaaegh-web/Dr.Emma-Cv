# Ledger CV Studio — Community / Nonprofit Offline Delivery
20 November 2026 · Engineering implementation and release gate

## Product intent

Ledger CV Studio remains a free, offline-first, user-controlled CV tool.
A nonprofit, training centre, charity or career adviser may help a jobseeker
use the same app, without creating an account or requiring the jobseeker to pay.
A later arrangement for organizational support, sponsorship or distribution
must never create a paywall or quietly upload beneficiary CV data. Any licensing,
branding or distribution change needs a separate owner decision.

The community service should work for someone who has never prepared a CV:
**Start → answer plain-language questions → review true claims → choose template →
check → download PDF/Word**. Advanced functionality remains optional.

## This increment: implemented

1. Guided Create / Import (paste) / Improve / Tailor journeys are now placed
   *before* system health, advanced tools and data controls on Home, instead of
   being buried below those elements.
2. Home offers optional, editable-in-interface UK and UAE CV convention advice,
   with no country inference, legal-compliance claim, remote lookup or data entry.
3. An expandable adviser guide covers explicit jobseeker permission, evidence,
   handoff and caution about computer-sharing.
4. A visible **Start a private session** link launches `?private=1`. It starts
   with an empty in-memory document and holds the guided draft in memory, does
   not open existing saved profiles, does not write CV edits or onboarding drafts
   to localStorage/IndexedDB and blocks automatic sample data. The banner warns
   that reload/close discards work, and a before-unload guard warns after CV
   content is entered. PDF and Word export remain usable.
5. The private switch does not delete an older browser profile or files already
   downloaded. That distinction is shown in the UI; do not describe it as
   incognito mode or secure erasure.
6. Browser regression tests exercise the original saved CV, the isolated private
   path, UAE selector, first-name editing, no draft persistence, and loss on reload.
   Unit tests cover the jurisdiction advice data.

## What is NOT yet proven or implemented

- No verified organization-grade deletion workflow for all current and legacy
  origin-local data, browser downloads, caches and history. Site-data cleanup
  is browser/user-controlled; do not promise a one-click wipe.
- The new guided **Import** journey currently accepts pasted CV text. The old
  standalone app and other modules have additional document-import features,
  but the simple home journey does not yet offer one-action reviewed PDF/DOCX
  upload. Do not advertise it as if it did.
- Private session data lives in the open browser's JavaScript memory, not an
  isolated OS/browser security boundary. Closing the window may not securely
  erase a downloaded CV; clipboard, screenshots, printed pages and memory
  recovery are outside this app's control.
- UK/UAE snippets are general conventions and require qualified local editorial
  review, including accessibility and Arabic content considerations.
- No field evidence from real jobseekers, advisers, screen reader users or
  low-end offline devices has been collected in this increment.

## Nonprofit deployment requirements (next increments)

**P0 — safer assisted use.** Add a permission-driven assisted workflow,
step-by-step review handoff checklist, optional no-file-save warning at exit,
and truthful cleanup guidance for shared devices without erasing unrelated
origin records. Never auto-delete an existing CV because a private session ended.

**P0 — usable CV import.** Integrate explicit local PDF/DOCX upload in the
guided home import, show side-by-side extracted source and proposed fields,
block incomplete/uncertain transfers, allow correction, and commit only after
affirmative review. Preserve local OCR and previous CV versions.

**P0 — confidence in delivery.** Test the exact Vercel/standalone artifact
offline after first cache, after refresh and browser restart. Verify PDF/DOCX
and 30+ template families in real Word/PDF viewers, 320px Android, low-end
Windows, keyboard and real screen readers. Confirm backups and restore, and
that later browser updates don't silently abandon local CVs.

**P1 — easy career outcomes.** Profession-specific truthful summary/skills/duty
choices, clear ATS warnings with field-level fixes, cover letters, UK/UAE
employer-convention templates, role-appropriate language and accessible
simple/advanced navigation. Review the remaining uncatalogued occupations.

**P1 — organizational distribution.** Optional editable organization name/
welcome content installed locally, reproducible offline package, optional
printable handoff leaflet, documented license/third-party notices and operator
training. No organization analytics or beneficiary directory by default.

## Acceptance / privacy contract

| Scenario | Expected |
| --- | --- |
| First-time visitor | Guided choice visible at top of Home, no account or fees |
| Private mode on browser containing an older CV | New blank draft; older CV unmodified |
| Private mode typing and guided draft | No browser persistence writes for CV or onboarding |
| Private mode reload | Warning when CV content exists; blank CV after proceeding |
| Private mode download | Local PDF/Word export; explicit warning about downloaded files |
| Normal saved session | Existing IndexedDB profile, backups and revisions unaffected |
| UK / UAE tips | Chosen manually, changed without writing profile, general advice only |
| Offline mode | No runtime request to an AI/payment/account service |
| Native documents | Manual human review in a real viewer, not a synthetic pass only |
| Shared device | Advisers warn about persisted old data and exported downloads |

Release state: **engineering increment only**. Gate production release on
exact-head CI, manual devices, accessibility, real exports and operator review.
Do not conflate a green source test with nonprofit field readiness.
