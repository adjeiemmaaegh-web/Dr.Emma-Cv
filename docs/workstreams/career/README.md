# Workstream D — Career application toolkit (Stages 13–16)

Owner paths: `src/features/{cover-letter,tracker,interview,linkedin-coach,career-region,career}/**`, `tests/career/**`, this folder.
Uses Group A contracts (`CoverLetterDocument`, `ApplicationRecord`, `InterviewSession`, `LEDGER_APPLICATION_STATUSES`), Group C's public `intelligence` API (claim guard, job parser in tests) and Group B's renderer. Pure and offline; persistence and UI mounting belong to the host (A/E).

## Cross-owner change (needs B's review)
Group D needs to export letters and interview packs, but B's public API only renders CVs. I added **one new file in B's path**, `src/features/export/block-export.mjs` (`renderBlocksArtifact`: blocks → PDF/DOCX/text through B's own paginate/PDF/DOCX writers, no duplicated code), and one re-export line in `src/features/documents/index.mjs`. Nothing existing in B was altered. B should review or relocate it; per the roadmap's exception procedure this is an interface request that I fulfilled directly because one agent is doing all workstreams.

| Stage | State | What exists | Evidence |
|---|---|---|---|
| 13 Cover letters | AUTOMATED_VERIFIED (synthetic) | Structured letter (recipient, greeting, opening, ≤12 body paragraphs, closing, sign-off), revisioned and independent of the CV, linked by ids only; 4 layouts; fact check against the CV variant and job (invented numbers/names/credentials, employer/role/name mismatch, placeholders, wrong variant, CV changed since drafting); PDF/DOCX export reusing the CV's colour, paper, font so the pair matches | letter tests incl. reproducible PDF bytes, MediaBox/colour carry-over, DOCX paper size |
| 14 Tracker | AUTOMATED_VERIFIED (synthetic) | Immutable revisioned commands (add/update/status with history, tasks, contacts, delete needs confirmation); exact CV/letter revision links; `verifyLinks` flags stale, missing, mismatched; kanban/list/search/sort; due-task view; honest reminder capability; JSON backup/restore, CSV export (formula-injection neutralised); review-first import with explicit conflict policy; legacy stage-6 list import | tracker and io tests incl. hostile import files |
| 15 Interview prep | AUTOMATED_VERIFIED (synthetic) | Questions labelled `job-requirement` / `your-role` / `example` (examples are never presented as the user's facts); STAR stories with completeness notes; practice timer (injected clock), 1–5 self-scores, summary; export/import/clear with confirmation; printable pack via B's renderer. No webcam, microphone or hosted service | interview tests |
| 16 LinkedIn + region | AUTOMATED_VERIFIED (synthetic) | Pasted text or official export CSV only (URLs refused, no fetching); CSV parser; read-only LinkedIn↔CV comparison; headline/About/role-text suggestions built from the CV, cited and run through C's claim guard; 12 regions of **general** guidance; section labels for en/fr/de/es/pt/ar | LinkedIn and region tests |

## Verify
```
node --test tests/career/*.test.mjs        # 18 tests
node --test tests/documents/*.test.mjs tests/intelligence/*.test.mjs   # B and C still green
```

## Known limitations (honest list)
- **Region guidance and translations are unreviewed.** Every region and locale is flagged `unreviewed-…`; none has been checked by a local recruiter or native speaker. Present it as general advice only until reviewed.
- LinkedIn character limits (headline 220, About 2,600) and the export CSV column names are as last known and must be re-verified; unknown columns are ignored and a wrong layout yields a clear error, not guessed data.
- Pasted-profile parsing is heuristic (title / company / date-range lines). Unusual layouts produce fewer positions rather than invented ones.
- **Arabic and other non-Latin text cannot be exported to PDF** by B's current writer (WinAnsi); DOCX keeps Unicode but right-to-left layout is not implemented. This is surfaced in `sectionLabels().rendererNote`, not hidden.
- Reminders cannot fire when the browser is closed; the app says so. No calendar import UI here (the legacy E24 calendar import is untouched).
- Letters are drafted from templates and the CV; there is no free-text generation. Body paragraphs are the applicant's own writing, checked for unsupported facts.
- Interview scores are self-assessed and labelled as such; question relevance for a role is keyword-driven, not validated with users.

## Integration requests
- **A:** `test:career` script + CI; persistence for the application book, letters and sessions through `LocalRepositoryPort`; include them in backup/restore.
- **B:** review `block-export.mjs`; consider RTL/Unicode PDF support for the Stage 16 acceptance.
- **E:** UI for tracker, letter studio, interview practice, LinkedIn coach; notification permission flow; accessibility audit.
- **F:** exercise the common demo workflow (profile → CV → export → job → tailor → letter → application → restore → offline).

## Not accepted
No stage is ACCEPTED: no real-user testing, no accessibility or device checks, no expert review of regional or translated content, and F's independent review is outstanding.
