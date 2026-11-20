# Smart occupation content library — 19 November 2026

**Scope:** Development branch only. No public release, production deployment, payment, remote AI call, or automatic rewriting.

## Issue and restoration
The classic Stage 8/E31 app under `source/legacy/04-remaining-features.part` already had `ROLE_PROFILES`, `JOB_TITLE_GROUPS`, `ROLE_SUGGESTION_EXTRAS`, `SUGGESTED_SKILLS`, `SUGGESTED_BULLETS`, and `SUMMARY_SUGGESTIONS`. The newer Group A–E editor and onboarding had lost the click-to-insert user interface. **The classic app is unchanged.**

The new module `src/features/occupation/occupation-content.mjs` preserves the actual legacy catalog and adds role-aware examples without a server. There are 15 categories and 251 titles. Each category now has 25 summary options (the original 8 plus 17 additional examples), while cleaning has 24 unique skills and 24 responsibilities. Original text for every category is retained.

## New user journeys
1. **Editor:** Open **Edit → Smart content library**. Choose an occupation category, optionally a specific job. The summary, skills and work-history sections then show searchable clickable examples. The editor does not change the CV title when browsing; a separate **Use selected job title in my CV** button is explicit.
2. **Summary:** Click **Use summary**. The entire proposed text is inserted as an editable draft, with undo and a warning to verify.
3. **Skills:** Click **Add skill**. Existing skills are not added twice. Each insert uses the editor's reversible command API and ordinary autosave.
4. **Experience:** Inside each experience entry, click **Add duty** to append a bullet. The editor prevents exact normalized duplicates and preserves the remaining list.
5. **Beginner journey:** Select a category and role at the **The job you want** step. The subsequent experience, skills, and summary steps show matching examples, which populate the draft field only when clicked. Nothing is committed until the ordinary final save is confirmed.

Unknown occupation titles do **not** silently default to office suggestions. The user can choose a category explicitly. All content is local, deterministic and labeled an unverified example. Particular regulatory requirements (e.g. COSHH) must be verified for the user's actual region and employment history. No metrics or achievements are generated automatically.

## Review refinements — 20 November 2026
- **Replace-summary consent:** existing text stays unchanged unless the user approves replacement. Append mode remains opt-in, bounded to 800 characters and fully reversible.
- **Past-role matching:** suggestions within a work-experience card use its own occupation category. An unknown role never silently inherits the target occupation's duties. Users can explicitly select or clear the category for that particular job; changing the job title refreshes the suggestions after the input is committed, avoiding typing disruption.
- **Keyboard focus:** changing the main occupation/category selector restores focus to the corresponding recreated select. Suggestions are revealed within opened Skills and Experience sections, with search and keyboard-operable choices.
- **Limits:** source-provided statements can contain jurisdiction-specific language (including UK COSHH). Every example requires human fact and location review; 251 job titles do not imply 251 individually authored suggestion libraries.

## Implementation and safety
- Source: `src/features/occupation/occupation-content.mjs` and `occupation-ui.mjs`.
- New workspace integration: `src/features/experience/workspace/views.mjs`; guided journey: `src/features/onboarding/onboarding-module.mjs`.
- Bundling: `tools/build-workspace-vercel.mjs` serves the new occupation modules offline; `src/features/experience/workspace/workspace.css` styles picker controls.
- Data contracts, persistence, primary profile migration, and source backup formats are unchanged. No legacy object or stored CV is automatically altered. In the current editor, each insertion enters normal undo/revision flow.
- Tests: `tests/experience/occupation-content.test.mjs` and `tests/experience/occupation-browser.mjs`. The hosted-workspace CI job also runs the new browser test.
- Manual source inspection, dynamic JavaScript syntax compilation and the deterministic registry count checks passed in review. The complete Node/Chromium/hosted artifact checks and physical-device acceptance **must** be evaluated separately.

## Known limitations and next release gates
- Shared occupational examples are not individually tailored to every one of the 251 job titles. A role within a category inherits the group's content, and all text requires user verification.
- Summary options are examples, not independently verified career claims. The last 17 per non-cleaning category are deterministic variations of original category skills; they are not 17 independent human-curated occupation studies.
- Test the built site in native Chrome/Edge, Android/iOS, screen readers and offline service-worker use; regression-check final DOCX/PDF exports and browser storage before release approval.
- Keep public Vercel deployment unchanged. Open a draft PR for explicit review; no merge/release without owner authorization.
