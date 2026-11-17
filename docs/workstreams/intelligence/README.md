# Workstream C — ATS, job matching & writing intelligence (Stages 9–12)

Owner paths: `src/features/{intelligence,ats,job-match,tailoring,writing}/**`, `tests/intelligence/**`, this folder.
Consumes Group A contracts (`JobTarget`, `SuggestionPatch`, `CareerProfile`) and Group B's **public** surface (`src/features/documents/index.mjs`, only in tests, to check a real exported artifact). Everything is pure, offline, and never touches storage or the network by itself.

| Stage | State | What exists | Evidence |
|---|---|---|---|
| 9 ATS diagnostics | AUTOMATED_VERIFIED (synthetic) | 32 named rules (contact, summary, roles, dates, chronology, bullets, skills, headings, layout, export fidelity, links). Each has an explanation, a false-positive policy and a fixture that must trigger it. Export rules read the real Group B `DocumentArtifact` text/warnings. **No score and no pass probability is produced.** | per-rule fixture tests, clean-CV baseline, crash-reporting test, real PDF export integration test |
| 10 Vacancy analysis | AUTOMATED_VERIFIED (synthetic) | `parseJobText` → `JobTarget` (required / preferred / duties, seniority, keywords; raw text retained). `compareToDocument` cites the requirement and the CV text that supports it, or says "no evidence found — this does not mean you lack it". | parser and comparison tests; bounded input |
| 11 Tailoring | AUTOMATED_VERIFIED (synthetic) | Deterministic `SuggestionPatch[]`: skills reordered, bullets reordered within a role (wording unchanged), a summary assembled only from the applicant's own title and matched skills. Gaps become *prompts to the applicant*, never edits. `applyApprovedSuggestions` creates a **new variant** linked to the job, applies only approved items, refuses unsupported facts, and never changes the master. Works with no key and no network. | approval/rejection, master-unchanged, stale-revision, unsupported-fact and no-network tests |
| 12 Writing + optional AI | AUTOMATED_VERIFIED (synthetic) | Local checks: weak openings, first person, passive voice, clichés, missing metric, length, repetition. Rewrites are limited to meaning-preserving edits and always need review. `createAiPort` is provider-independent: `prepare()` shows exactly what would be sent, `execute()` needs a single-use consent bound to that request plus a session-only key, errors are redacted, replies become flagged suggestions. | consent, single-use, key-leak, redaction and unsupported-claim tests |

## Verify
```
node --test tests/intelligence/*.test.mjs     # 47 tests
node --test tests/documents/*.test.mjs        # Group B, still green
```

## Factual-integrity guard (`intelligence/claims.mjs`)
A proposal is flagged `unsupportedFact` if it adds a number, a proper-noun-like term or a credential word not present in the source CV. It flags for human review; it cannot prove truth, and a single capitalised sentence-opening word is deliberately ignored.

## Known limitations (honest list)
- **Enhancv's published 27 checks are now mapped** to existing, expanded, input-dependent and explicitly unsupported local capabilities; see [the traceability and validation register](ENHANCV_27_TRACEABILITY.md). This is not 27 independently validated checks or proprietary scoring parity. `coverageMatrix()` still lists the original 32 verified-per-fixture rules.
- Matching is stemmed term overlap with a tiny synonym table, not semantic understanding. Expect misses (e.g. "supervised staff" vs "line management") and some partial matches that need a human read. No accuracy figure is claimed; there is no labelled corpus yet.
- English only. The action-verb list is finite, so `bullets.verbs` has known false positives (policy stated per rule).
- Local in-browser models are **not** implemented (the roadmap makes them conditional on proven performance). The AI port is an interface with an injected transport; no provider is wired in and no network call exists in this code.
- Single-use consent and the key live in memory per port instance; UI for consent, disclosure and key entry belongs to the host/E.
- Tailoring supports reorder and a templated summary only. Rewording bullets is left to the writing checks and the applicant.

## Integration requests (not done here — other owners' files)
- **A:** add `test:intelligence` to `package.json` and CI; expose `SuggestionPatch` approval via a profile command if wanted.
- **B:** render `SuggestionPatch` diffs (before/after, approve/reject) in the editor; consume `operation` only through `applyApprovedSuggestions`.
- **F:** build the labelled ATS/vacancy corpus and the measured comparisons; C's fixtures are minimal and synthetic.

## Not accepted
No stage is ACCEPTED: no independent corpus evaluation, no external-parser comparison, no human review of suggestion quality, and F's review is outstanding.
