# Dr. CV — editor-led premium experience

## Goal
Replace the text-heavy utility presentation with a distinctive, modern CV-building experience comparable in polish (not copied layout) to Enhancv. Preserve all 38 existing templates, user data, guided editing, import/export, accessibility, offline support, and privacy.

## Homepage
- Premium responsive header: logo, Templates, CV Builder, Import CV, ATS Check, clear Create My CV action.
- Hero: bold outcome-led headline, short supporting line, two clear CTAs, and a **real application-derived** editor preview using fictional data (not an unrelated stock mockup).
- Product demonstration: document preview with adjacent contextual writing assistance and template switcher; gracefully degrade to static demo when interactive preview is unavailable.
- Featured templates: distinct thumbnail previews, named families, filters, selection routed into editor, no duplicate-looking cards.
- Three-step onboarding with lightweight icons, then evidence-backed feature demonstrations and accessible FAQ.
- Move backup/recovery, storage, version diagnostics and technical notes to Settings / Data Management; retain access from app navigation.

## Visual system
- Define reusable design tokens for typography scale, spacing, radii, shadows, focus rings, neutral backgrounds and restrained accent colors.
- Desktop-first hero composition with readable 320px mobile layout; avoid horizontal overflow and excessive vertical scrolling.
- Support reduced motion, keyboard navigation, visible focus, WCAG AA contrast, and semantic headings.

## Editor follow-through
- Unified toolbar, direct document editing where supported, clear active section, accessible suggestions, live accurate preview and explicit save/export feedback.
- Keep privacy/offline promises accurate and do not imply AI features that are not functional.

## Release gates
1. Inspect current source and reuse working template renderer; do not create nonfunctional CTA buttons.
2. Run typecheck, lint, unit, browser, service-worker and production build checks.
3. Verify desktop 1440x900, tablet and Android-sized viewports; keyboard and screen reader basics.
4. Check all 38 templates, create/import/edit/export, private session and offline update regression.
5. Review screenshots, merge via PR only after required checks pass; verify production domain commit.

## Design comparison
Enhancv's current homepage foregrounds a large editor demonstration and visible resume, while Dr. CV currently opens with task descriptions and technical controls. The redesign prioritizes the actual product experience above explanatory prose.
