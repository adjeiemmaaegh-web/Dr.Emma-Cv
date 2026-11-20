# Role-specific CV content and evidence-led personalization — 20 November 2026

## Scope and evidence
The existing hosted A–E editor correctly merged the occupation picker, category libraries and Add/Remove cards, but different titles in each category received virtually identical content. The source library exposes 251 titles in 15 families, 25 summaries per family and shared category skills/duties. This workstream introduces a deliberately bounded first editorial wave, **not** a claim that 251 professions are individually written or clinically/legally validated.

### Implemented in review branch
1. src/features/occupation/occupation-role-editorial.mjs: 48 exact-title authored **sample** profiles spanning all 15 original groups. Each has a role-specific starter summary, three competencies, and two job tasks. Indexed by exact normalized title and group; a title from another group can never borrow a profile.
2. src/features/occupation/occupation-personalization.mjs: local deterministic matching to **explicitly entered** skill names or literal multiword phrases in work descriptions. No AI call, cloud transfer, account or personal-data collection. Only when at least **two relevant competencies** match a catalog entry does it offer an additional summary that describes skills **listed in this CV** rather than asserting verified employment, licences, outcomes or achievements.
3. occupation-content.mjs: preserves the 251-title selector and exactly **25** summary cards per selection. Exact-title examples appear first where covered; CV-based summary first when explicitly supported by listed skills. Retains Add/Remove and Undo, including confirmation before replacing an existing summary. Uncovered roles display honest **category-level** examples.
4. views.mjs: passes the current local CV snapshot into the role-aware content function, distinguishes exact-role from category suggestions and explains CV-backed summaries. Work-history duties use the category of **that job** only.
5. Guided onboarding: work-duty suggestions wait until the user enters/commits the **previous job title**, rather than inheriting the future job target. Target role controls skills and summary suggestions. Draft answers are only used in memory for matching. Final guided save remains unchanged.
6. Tests check 48-profile correctness, mismatched/unknown roles, no private contact leakage, exact past-job targeting, no automatic CV mutation, legacy functionality and browser interaction.

## Editorial limits and safety
- Each covered exact-role profile has **one specially authored summary**, three unique competencies, and two responsibility examples. The rest of the 25 summaries and other suggestions remain **category examples**, not newly researched role-specific material.
- Healthcare, financial, security and trade examples require jurisdiction, credential, employer-policy and factual review. A role title never proves required qualifications.
- Suggestions cannot establish that somebody held a job, performed a duty, earned a qualification, or achieved any metric. Users must choose and edit factual text.
- Existing local-first IndexedDB/profile storage stays unchanged. No new persistence schema, payment flow, remote AI, sign-up or analytics.

## Review and release gates
- Obtain exact-head GitHub Node, browser and static hosted build QA evidence before merging. Check offline behavior and preserve the classic route.
- Real-device browser restart and offline upgrade, native Word/PDF quality, actual CV usability, specialist editorial validation, accessibility with assistive technology and device/browser matrix remain unverified until owner review.
- **Do not merge to main or deploy this branch publicly without an explicit follow-up authorization.** Preserve existing production site and CV data.
