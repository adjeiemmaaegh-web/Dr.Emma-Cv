# E30 — Ledger CV Studio UX/UI design-system audit and implementation

**Date:** 12 November 2026. **Source:** E29 hosted branch at SHA 27555eb976799388f26330693538b8cbb80e6588. **Status:** Engineering UI improvement, not independent release acceptance.

## Scope and inventory

Inspected the active 14-screen router and representative legacy and auxiliary overlays:
home, upload, guided interview, offline agent, guided review, experience-level, template selection, personal details, work experience, education, skills, summary, additional sections, and editor. Examined editor edit/preview controls, template gallery, local PDF import/OCR review controls, modals, data-safety/backup actions, plus independently mounted career intelligence, encrypted transfer, finishing guide, career tracker, optional AI career tools and localization/accessibility controls. Career tracker and other auxiliary panels retain their separate implementations and are now reached through one utility menu.

Reviewed responsive layout and focus state at 320px, 390px, 768px and 1440px. Key visual examples: landing page, template selection, import, editor, and expanded tools. Actual real-world device, screen reader, high contrast and human visual acceptance are still pending.

## Before: confirmed UX inconsistencies

| Severity | Location | Finding | Evidence/impact | Correction |
|---|---|---|---|---|
| High | All screens, especially 320–390px | Six independently fixed utility launchers overlap one another and content, including import and wizard continuation areas | Before screenshots showed stacked Career tracker, optional AI, transfer, finishing guide, career intelligence and fixed language controls competing for the bottom edges | Preserve the original buttons/listeners, move them into one **Tools & language** disclosure with keyboard Escape and visible focus; leave all underlying tool dialogs and action implementations unchanged |
| High | 320px import | Document horizontal overflow (9px) from narrow file-import formatting/long descriptive content | Measured browser scroll width 329px for a 320px viewport | Constrain upload panel, allow wrapping of file-type chips and helper text, reduce mobile padding |
| Medium | Wizard, editor, import forms | Mixed input paddings, corner radii, field hints and minimum control heights | Legacy and stage-specific CSS evolved independently | Unify to 9px corner radius, 44px touch controls, consistent outlines and proportional spacing; preserve input types and validation |
| Medium | Home, wizard, editor | Mixed spacing scales and component edges reduce visual continuity | Comparison screenshots and source review | Shared color/typography/spacing tokens, consistent cards, subtle focus and form states |
| Medium | Secondary panels and modals | Modal corner radii, backdrop and overflow handling differ | Legacy modal vs newer overlays had inconsistent styles | Update shared modal only; newer tool overlays remain functional, with utility launcher dock below modal stacking layers |
| Medium | Mobile editor | Toolbar buttons and preview controls wrap awkwardly on smaller screens | Inspector screenshots at phone width | Responsive toolbar wrapping and panel padding, without changing editor split view or preview/print canvas |
| Accessibility | Navigation and controls | Visible focus and landmark clarity vary across older screens | Existing skip links and aria labels are preserved | Consistent high-contrast focus ring, Escape-to-close utility disclosure, original main landmarks preserved, reduced-motion preference respected |
| Non-issue | Template carousel | Some scaled CV page cards are intentionally clipped within horizontal gallery | Clipping exists even with no document horizontal overflow | Do not remove intended horizontal scrolling or alter printed template geometry |

## E30 design tokens

- **Primary:** #246A64; hover #19534F (warm teal, consistent with Ledger identity).
- **Ink:** #182333; secondary text #465464; neutral border #D8D7D0.
- **Control radius:** 9px; **card radius:** 12px; auxiliary utility drawer: 16px.
- **Interactive height:** min 40px; mobile and input/touch primary controls >= 44px.
- **Focus:** 3px #15786F solid, 3px offset, compatible with keyboard focus and reduced motion.
- **Spacing:** 8/10/12/14/16/20/24/28px increments, with responsive clamp() for larger surfaces.
- **Typography:** preserve the existing Inter/system UI face and Lora/serif document editorial face; no new remote font loading.
- **Containers:** responsive min-width:0; prevent overflow without breaking intentionally scrollable template galleries.
- **Composition:** one user-invoked utility menu rather than six independent fixed controls.

## Strict non-regression boundaries

E30's builder first regenerates E29 and asserts exact E29 HTML SHA-256 c04684c7ff79cae0068a8e44408b25b86a751d08d14909cdd1006cedefcc8767. It injects one screen-only CSS design system and one UI-only script at the true document boundaries; the E28 application processing, CV schema, templates/print geometry, OCR model, PDF renderer, Word export, local browser storage and job/calendar logic remain byte-preserved from E29. The existing auxiliary tool nodes are **moved**, not cloned/recreated, preserving event listeners and internal states. E30 also rotates the static service worker cache key to avoid stale HTML.

No account/login, payments, subscriptions, cloud synchronization or external AI provider activation are added. Data remains browser-local. The E30 CSS excludes print views and does not restyle .cv-page template document canvas.

## Evidence, acceptance and unresolved items

- Real HTTP-origin native browser test on hosted Linux Chromium and Windows Chrome and Edge, running 14 screens at four widths, validates horizontal scroll, tool accessibility, open/close keyboard behavior, core import/create navigation and data-safety entry points, browser JS exceptions, and recorded screenshots.
- Frozen E29 hosted QA verifies bundled trained Tesseract OCR on synthetic image resume, localStorage persistence, app startup, service-worker cache and reload while browser network is offline.
- Frozen E21 DOCX hidden-text privacy, E20 synthetic DOCX/PDF exports and E22 template-print suite cover all 30 templates on A4 and US Letter using short and long synthetic CVs.
- Visual/manual signoff remains **OPEN**: physical Android and iOS, real Windows 11 8GB desktop, screen reader/voice control across browsers, Arabic/RTL and translated locales, contrast measurements across theme variants, independent human inspection of every auxiliary modal, 30 printed template families and actual Word layout fidelity. Synthetic automated checks cannot establish subjective beauty or full WCAG conformance.
- Real-world OCR accuracy and multi-column/multilingual CV import remain release blockers, not UI issues solved by CSS.
- Site **production deployment must not be silently changed** until the E30 candidate has green hosted checks and review; current E29 live remains usable.

## How to reproduce

Run \`npm install --ignore-scripts --no-audit --no-fund\` then \`node tools/build-e30-ui.mjs\`, followed by the native \`tests/e30_ux_audit.py\` and \`tests/e30_inherited.py\` suites. GitHub workflow \`.github/workflows/e30-ux-ui.yml\` records three-browser evidence and screenshot artifacts. Test source does not contain personal CV data.

**Engineering conclusion:** Resolves the six-control mobile overlap and narrow-width import issue while harmonizing controls, forms and utility access. Does not equate to unrestricted production UX certification; formal owner and real-device acceptance remains open.
