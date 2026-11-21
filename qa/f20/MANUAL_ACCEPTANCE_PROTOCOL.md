# Stage F20: physical-device and native-application signoff protocol
**State: NOT EXECUTED.** This document is a reproducible owner/reviewer checklist, not a manufactured test result.

Use a named release commit and artifact SHA-256. Start with a **downloaded verified backup** of any real personal profile before opening or importing. Execute tests with synthetic profiles unless a consenting owner deliberately supplies a test CV. Record OS/build, browser/version, device RAM, route, time, exact artifact hashes, screenshot hashes and redacted logs. Never publish private CVs or provider credentials.

| Gate | Native environment | Minimum acceptance observation | Status |
|---|---|---|---|
| F20-D01 | Windows 11, current Chrome | Save, close browser, reopen, restore exact profile and version; exports stay readable | NOT RUN |
| F20-D02 | Windows 11, current Edge | Two tabs editing same CV, conflict warning, download unsaved draft, reopen committed state | NOT RUN |
| F20-D03 | macOS Safari | Create/import/backup/offline relaunch; no private data loss | NOT RUN |
| F20-D04 | iOS Safari physical phone | Responsive create/edit, PWA install/reopen, offline access, safe keyboard/focus | NOT RUN |
| F20-D05 | Android Chrome physical phone | Same as iOS; notification claims only while supported/open | NOT RUN |
| F20-D06 | Firefox desktop | Storage-denied, quota-pressure, profile backup, safe failure; no silent discard | NOT RUN |
| F20-D07 | 8GB Windows PC | Measured cold start, editor responsiveness, 30-template switching, OCR memory stress | NOT RUN |
| F20-D08 | MS Word desktop | Open/edit/re-save/reopen DOCX for 30 templates × both papers; fonts, lists, links, margins preserved | NOT RUN |
| F20-D09 | LibreOffice desktop | Same DOCX editing roundtrip with comparisons to Word | NOT RUN |
| F20-D10 | Acrobat or equivalent native PDF viewer | All 30 template exports × both papers, 1–4-page fixtures, text selection, clickable links, no clipping | NOT RUN |
| F20-D11 | Screen reader NVDA + Windows Chrome/Edge | Keyboard paths, headings, announcements, dialogs, error focus, status and restore flow | NOT RUN |
| F20-D12 | VoiceOver on macOS/iOS, TalkBack Android | Real focus order, input labels, zoom, high contrast, reduced motion, touch targets | NOT RUN |
| F20-D13 | Arabic/English mixed script and long names | Native print/file extraction supports intended glyphs and RTL direction or honest blocking warning | NOT RUN |
| F20-D14 | Browser recovery failure injection | Corrupted DB, failed second transaction, quota, zero-byte backup and interrupted update, preserve recoverable data | NOT RUN |
| F20-D15 | Final public Vercel deployment | HTTPS hostname serves new A-E root and /legacy; SHA and service worker match, no exfiltration | BLOCKED: VERCEL 402 |

For each row reviewer fills: test ID, build SHA, exact steps, PASS/FAIL/BLOCKED/SKIP with reason, output screenshot/file hash, defect link, date and reviewer. **A human checkmark alone is not proof of executed steps.** Report skipped tests as OPEN, not pass.

GO requires every S0/S1 issue closed with verified evidence and an explicit owner approval. The CI browser and synthetic parser matrix are valuable early engineering checks, **not replacements** for the rows above.
