# Main-bound A–D career journey integration — 2026-11-17

Source increment expands the already merged Group A–E workspace. Existing PRs #17 and #18 and reconciled #19 history are preserved; older Group B/C/D files have not overwritten newer main code.

## Human-led integrated flow
- Saved workspace Career tools route exposes pasted vacancy analysis against master CV, explicit per-suggestion consent and a separate tailored CV saved with one atomic Group A CAS write.
- User-led cover letters are draftable, editable, fact-checked, versioned, exportable (PDF/DOCX) and linkable to specific CV/job IDs.
- Applications use the existing separately revisioned Group A IndexedDB application store, with exact CV and optionally matching letter revision links.
- Real job-linked interview prompts and applicant-authored STAR stories are stored; a preparation PDF is exportable.
- LinkedIn only analyses explicitly pasted user text offline and does not retain that text. Unreviewed regional guidance is labelled as advisory.
- Job, cover-letter and interview drafts use an independent per-profile IndexedDB CAS store, with an unencrypted manual backup option. No silent import from old localStorage.

## Automated verification
See workflow .github/workflows/career-journey.yml: Node contract/legacy checks, new draft-store and atomic tailoring tests, and real Chromium journey/reload and six-view responsive UI tests. Actual workflow outcomes must be confirmed before claiming a pass.

## Limits still open
The integrated UI remains in the source workspace route /src/features/experience/workspace/index.html; the frozen public E30/E31 single-file build is not replaced. Multi-database CV/application/letter operations are not one atomic transaction; partial failures must remain visible. No AI provider or cloud sync was added. PDF Unicode/RTL and two-column fidelity, browser/device matrix, independent Group F signoff and actual production release acceptance remain open. The main Vercel deployment guard remains disabled.