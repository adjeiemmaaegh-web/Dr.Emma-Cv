# Premium homepage redesign — implementation brief

Status: Stage 1 design brief; no UI implementation yet.
Reference products: Enhancv and MyPerfectCV UK (inspiration only; no copied assets).

## Current problems verified from live homepage
- The first screen is a task list rather than a compelling CV-focused visual.
- Technical backup, storage, and migration information occupies homepage space.
- Template previews are not prominently visible before starting.
- Primary and secondary actions lack a clear visual hierarchy.

## Stage 1 deliverables
1. Responsive navigation with brand, Templates, How it works, CV Tools, and one primary Create CV button.
2. Hero headline, short benefit statement, Create My CV and Upload Existing CV actions, and prominent genuine local template previews.
3. Template discovery section using existing template IDs and preview renderer; never show fake templates.
4. Three-step journey: Choose a template → Add your experience → Review and download.
5. Trust/privacy strip with accurate claims: free, local-first, private-session option, PDF/DOCX export.
6. Place storage, version recovery, raw backups and legacy migration under an accessible Data & Recovery section, without removing functionality.
7. Preserve Create/Import/Improve/Tailor flows, UK/UAE guidance, keyboard skip link, private session, offline behavior, and local data.

## Design direction
Contemporary editorial typography, generous whitespace, warm neutral surfaces, restrained indigo accent, rounded but not oversized cards, crisp CV previews, consistent 44px minimum touch targets. No invented testimonials, success statistics, or misleading ATS guarantees.

## Acceptance criteria
- Primary CTA visible without scrolling on typical Android and desktop viewports.
- All four existing task journeys remain reachable.
- Every showcased template resolves to an actual selectable template.
- Keyboard navigation, visible focus, reduced motion, responsive layout and screen-reader labels work.
- Offline app boot and private-session isolation remain intact.
- PDF and DOCX generation regressions absent.
- Review before merging; CI and Vercel production verified separately.

## Subsequent stages
Stage 2: editor and live preview. Stage 3: template gallery. Stage 4: application-wide visual consistency and acceptance.
