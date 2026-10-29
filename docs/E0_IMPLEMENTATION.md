# E0 — Reversible source extraction

**Status:** implemented foundation slice; E0 is **not fully complete** and E1 must not be described as completed.

This commit preserves the Stage 8 release HTML unmodified. The five ordered files under `source/legacy/` are **exact-text source fragments**, not yet independent TypeScript modules. `npm run verify:e0` joins them and compares the result byte-for-byte with the committed Stage 8 HTML, failing closed on any mismatch. The output is `dist/Ledger_CV_Studio.html`.

The development build uses Node.js; normal application usage does not. It remains free, browser-only, and offline-first.

## Remaining E0 work

- Inventory actual CV/application storage keys and version migration behavior; audit all write paths.
- Extract cohesive modules with explicit interfaces and tests without altering data persistence semantics.
- Introduce typed schemas, migration fixtures, backup restoration tests, and legitimate secrets scanning.
- Validate resulting artifact under file:// and in a browser. These checks are not claimed by the current exact-file comparison.
- Assess React adoption only after the extraction is stable.

**AI/BYOK:** No API keys belong in Git. Production AI credential entry must be explicit, optional, ephemeral by default, and opt-in for any CV text transmission. A .gitignore does not substitute for secret scanning.

## Verification command

```sh
npm run verify:e0
```

No dependencies are required for this baseline extraction check beyond Node 20+.
