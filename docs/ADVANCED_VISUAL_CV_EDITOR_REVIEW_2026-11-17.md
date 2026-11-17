# Advanced CV visual editor — second engineering review (2026-11-17)

**Status:** Draft development change in PR #28. Not merged, not deployed and not production accepted. The frozen legacy single-HTML application and current public release are not replaced.

## Review findings and remediation

| Finding in first implementation | Second-pass remedy |
| --- | --- |
| Rapid precision slider movements pushed redundant undo entries | Gesture-scoped appearance command coalescing; one logical slider movement can be undone as one step |
| Repeated document pagination occurred during editor state synchronization | Shared `resolveStyle` replaces duplicate `layoutFor` call; preview layout is computed on the animation-frame render |
| Typing role/employer names could repeatedly recreate the entire form | Change detection is based on entry identities; visible role labels and field values update in place |
| Undo did not refresh all of the mirrored form fields | A shared field path resolver now handles personal details, role and education metadata, custom sections and skills |
| On-page text selection only edited one subfield of composite lines | Contextual multi-field editing for name, contact details, experience and education metadata; no HTML injection |
| Custom sections rendered only after all standard sections | Custom sections participate in section order and visibility, preserving underlying content when hidden |
| Built-in size/spacing presets did nothing after precise values were set | Preset selection clears the corresponding precision override so it takes effect immediately |
| Presets were limited to the current browser | Strict appearance-only JSON export and explicit reviewed import; reject unexpected fields, oversized files, duplicates and malformed data |
| Template families relied too heavily on rules and colors | Shared page accents: top rules, side rails and technical corner marks with a user override |
| Preview implied guaranteed identical font rendering to PDF | Wording corrected: geometry and pagination share the engine, but final PDF and Word should be inspected |

## UX and implementation

- **On-document editing:** Click or keyboard-activate meaningful text on a page. The contextual editor stays open as the preview is updated; its controls stay in sync after undo. The original form editor remains available for complete data entry.
- **Typography:** Body size, leading, page margin, name scale, heading scale, section gap, entry gap, paragraph gap and rule weight are bounded numerical controls. Font and header treatments, paper, document accent and divider style have explicit presets.
- **Page fidelity:** The preview, PDF and thumbnail share positioned text lines and decoration primitives. Real-time page counts and design labels are displayed in the workspace. The PDF is the authoritative print output.
- **Section management:** Standard/custom section visibility and reading order are editable without destructive content mutation. Custom content remains in the CV document and its original source format.
- **Reusable designs:** Library stores appearance only under an independent key. Portable JSON contains no CV text, contact records, applications or private profile IDs. Import requires format validation and user approval.
- **Safety:** Existing Group A revision-guarded IndexedDB writes, explicit master-edit approval, undo and local history remain in place. The design library is separate localStorage; no migration, cloud sync, payment, server or external AI invocation is introduced.

## Boundaries and deferred issues

1. The layout engine uses Helvetica/Times-like estimated character metrics. Preview and PDF consume the same line placement, but **font rasterization and unsupported Unicode can still differ**; Word's own layout engine may repaginate.
2. Sidebar-inspired templates intentionally export as an ATS-friendly single reading column. A genuine two-column layout requires a separately verified export and reading-order design.
3. Custom decorative corner marks are supported by preview/PDF but deliberately omitted in editable DOCX, with an export warning.
4. LocalStorage-based design presets are not a cross-tab transactional database; use the portable JSON file to move designs. Do not promise conflict-free concurrent modifications.
5. Full accessibility, native Microsoft Word/print fidelity, cross-browser and physical-phone acceptance remain open until separately tested. CI and synthetic-browser checks are not user device signoff.

## Required engineering checks

- Node unit and integration regression suites for Group A–E, including the added advanced design test matrix.
- Native Chromium browser interaction across phone, tablet and desktop layouts, keyboard and accessibility audits.
- Focused on-page name, contact, experience and summary edits; Undo synchronization; precision-to-preset handoff.
- Custom section creation, hidden content preservation, movement among standard sections and PDF text order.
- PDF/DOCX generation, layout/page counts, family accent parity and export warnings.
- Named design save/apply and the explicit download/validate/import round trip without private CV data.
- Storage denied/quota, conflicting tab, offline PWA and real-device acceptance before any merge or public release.

**Release gate: NO-GO until evidence is reviewed and the owner authorizes promotion.**
