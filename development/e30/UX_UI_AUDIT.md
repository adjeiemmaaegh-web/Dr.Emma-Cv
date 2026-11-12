# E30 — Comprehensive UI/UX cohesion audit and design-system engineering

**Date:** 12 November 2026  
**Scope:** Ledger CV Studio public E29 HTTPS beta and its frozen offline E28 application.  
**Status:** Development review candidate, not a signed-off production design.

## Source-inventory and observed design problems

The app ships as one 16 MB self-contained HTML file assembled over many engineering stages. Its original shell is restrained in warm ivory, teal and ink, but later capability dialogs independently defined fonts, sizes, button treatments, focus outlines, corner radii, alerts and background palettes. This was confirmed by source-code inspection of every embedded CSS block and the generated screen/component templates.

1. **Crowded utility entry points (high):** Career tracker, career intelligence, optional AI, the classic toolkit and encrypted transfer created separate fixed-position launchers at overlapping bottom-right coordinates, especially below 600 px. Some late CSS overrides used \`!important\` to force incompatible coordinates. Accessibility controls also occupy the bottom-left.
2. **Style fragmentation (high):** Primary editor used \`#2B6F68\` teal, whereas career tracker and other dialogs defined unrelated blue accents, blue focus outlines, distinct shadows, Arial vs system fonts, button corner shapes, and field heights.
3. **Dense navigation (medium):** The editor contains eleven separate panels and a crowded top toolbar (review, history, word count, CV version actions and jump selector); long panel labels have limited room at phone widths.
4. **Responsive form friction (medium):** Variations in form-field heights, grid widths, helper text contrast and inner spacing make wizard, OCR review, panel editing and overlay dialogs feel unrelated. On smaller screens, the home screen's several actions risk competing for attention.
5. **Overlay hierarchy (medium):** General modal, AI, career tracker, encrypted transfer, accessibility and offline analysis overlays differ in border/rounding and in mobile max-height/scroll policies. The career board uses fixed four-column layout on desktop with an internal horizontal scroller.
6. **Focus/contrast consistency (medium):** Different features use different focus colors and outline widths; muted explanatory copy varied widely in contrast and line spacing.
7. **Document vs UI boundary (critical to preserve):** CV template families intentionally have 30 different typographic treatments. Their authored document design and export/PDF styles must **not** be homogenized with application controls.

## Unified E30 application design system

| Token / pattern | Value / rule |
| --- | --- |
| Main ink | \`#182B37\` |
| Secondary text | \`#314452\` |
| Supporting text | \`#566673\` |
| Brand action | \`#256C66\` |
| Brand action hover | \`#184D49\` |
| Interface canvas | \`#F5F5F2\` |
| Calm action surface | \`#F0F5F3\` |
| Surface and divider | \`#FFFFFF\`, \`#D9E1DF\` |
| Focus outline | 3 px visible blue \`#176B98\` with 3 px offset |
| Border radii | 8 px control, 12 px card, 18 px dialog |
| Spacing cadence | 4, 8, 12, 16, 20, 24, 32 px |
| Action target | 42 px standard, 38–44 px context-specific compact, 44–46 px dock |
| Typographic family | Existing bundled UI Inter/system fallbacks, preserving distinct CV document fonts |

**Implementation:** \`hosting/e30-design-system.css\` controls application chrome, wizard panels, gallery cards, editor navigation, tool dialog surfaces, imports, focused elements and responsive layouts. \`hosting/e30-tools-dock.js\` creates a single accessible **Workspace tools** menu. It *moves the existing launcher nodes with their original event listeners* instead of cloning or replacing features; supports Enter/Space, Escape, outside-click dismissal, and ARIA expanded state. The original bottom-left accessibility controls remain available.

**Explicitly unchanged:** All E28/E29 source bytes except one additive inline CSS and one additive inline JS layer; CV content/model schema, browser storage and recovery, authoring and editor logic, PDF/DOCX/print templates, offline trained OCR, accessibility settings data, AI consent and privacy boundary. E30's deterministic build asserts the frozen E29 and E28 SHA-256 before emitting output; a mismatched source fails the build. The service worker receives a new E30 cache identity to invalidate the old E29 shell.

## Screen and interaction audit matrix

- **14 app screens:** home, upload, guided interview, offline agent, guided review, eight individual CV-creation wizard steps, and CV editor.
- **11 editor panels:** CV review/readiness, personal, saved versions, summary, job match, cover letter, experience, education, skills, additional sections, and template/design.
- **Cross-feature entry points/dialogs:** upload, the original export modal, data safety, career tracker, offline career intelligence, optional external AI workspace, classic toolkit, encrypted transfer, and accessibility controls (the final one is retained in its original position).
- **Five responsive widths:** 360, 390, 768, 1024 and 1440 px (with representative portrait/landscape heights).
- **State-sensitive navigation:** sample CV demo, editor section switching, keyboard-opened dock, Escape/click closure, dialog opening and unchanged serialized CV document before/after visual-only navigation.
- **Automated accessibility:** axe-core WCAG 2 A/AA and 2.1 AA smoke checks; compare serious/critical findings with the frozen E29 baseline, instead of claiming absence of pre-existing violations.
- **Visual evidence:** paired before/after home screenshots and post-change screenshots for each route, editor panel and available overlay. Generated CI artifact includes screenshot list, viewport measurements, small target inventory and a machine-readable audit report.

## Verification and acceptance boundaries

The E30 GitHub workflow runs original E29 local-storage, trained OCR and offline-reload tests on Linux Chromium and Windows Chrome/Edge. It reruns the E26/E27 scanned-PDF protection, hidden DOCX style/privacy, PDF and DOCX export, calendar/timezone, restart persistence, and 120 long/short × A4/Letter × 30-template print/text checks on the new hosted HTML.

**Automated screenshots and axe results are NOT a substitute for human visual assessment.** Manual testing remains required on real iPhone/Android/Safari/Firefox, screen readers, keyboard-only sessions with high zoom, actual Word files, noisy/RTL scanned CVs, physical 8 GB Windows hardware, and real restore/backup workflows. All beta and owner acceptance blockers remain open. A Vercel READY deployment confirms hosting, not formal production design certification.
