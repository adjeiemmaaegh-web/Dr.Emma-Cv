# Enhancv 27-check reference: local traceability and evidence limits

Source reviewed **17 November 2026**: https://enhancv.com/resources/resume-checker/
The labels and seven category groups are the website's published comparison reference. This is not Enhancv software, a reproduction of its score, or a claim of functional parity. The product remains offline-first, with no CV uploads and no external scraping/LinkedIn access.

## Mapping

Implemented source: src/features/intelligence/expanded-review.mjs. The original 32 Stage 9 rules remain intact in src/features/ats/rules.mjs, and runAtsChecks() remains backwards-compatible. A *local-check* status means a deterministic check runs with the available data, not that it agrees with a commercial ATS. *limited-check* means only partial/heuristic evidence is possible; *needs-input* means an export or vacancy is absent; *not-verified* means the necessary external comparison is unavailable.

| Category | Published check | Local coverage and specific limitation |
|---|---|---|
| ATS essentials | File format and size | With actual export filename and byte metadata, warn on unknown extensions or >2 MB; employer limits vary |
| ATS essentials | ATS-friendly design | Existing artifact warnings, page count and reading-order checks; no third-party ATS parser proof |
| ATS essentials | Professional email address | Syntax plus cautiously flagged informal prefix; cannot determine recruiter tastes |
| ATS essentials | Header links compliance | Existing dangerous-scheme check; does not open or validate remote links |
| ATS essentials | Resume file name | Optional export filename check; only when name is provided |
| ATS essentials | Dates and links consistency | Existing format, chronology and URL-scheme checks; not online validation |
| Resume sections | Essential sections | Existing experience, education and skills checks; career-dependent exceptions |
| Resume sections | Contact information | Existing name, email, phone and location checks; no external verification |
| Resume sections | Section order | Existing chronology and nonstandard-heading signals; not a universal mandated section order |
| Content | ATS parse rate | **Not verified.** Internal export-text fidelity is not a measured ATS parsing rate |
| Content | Quantifying impact with AI rewrite suggestions | Existing numbers heuristic, no invented values; no automated generative rewrite |
| Content | Repetition of words and phrases | Existing repeated-opening check and a new adjacent duplicate-word flag |
| Content | Spelling and grammar | Limited English typo, repeated word and punctuation patterns, not full grammar/spellcheck |
| Content | Bullet length and consistency | Existing length/count rules plus punctuation consistency |
| Job tailoring | Hard skills match | Deterministic phrase aliases in pasted requirements, evidence location; missing mentions are not absence of skill |
| Job tailoring | Soft skills match | As above, but soft skills and work examples distinguished from a skills-list mention |
| Job tailoring | Action verbs | Existing conservative verb checks; finite English vocabulary |
| Job tailoring | Tailored job title | Comparing CV headline and supplied target role; career changers legitimately differ |
| Recruiter red flags | Resume credibility | Limited absolute-claim review; **never** alleges dishonesty |
| Recruiter red flags | Interview risk signals | Missing work evidence and incomplete facts; no prediction of interviews |
| Recruiter red flags | Peer benchmarking | **Not verified.** No consenting, representative peer data or validity test |
| Recruiter red flags | LinkedIn profile match | **Not verified.** Profile link does not provide profile contents |
| Bias & discrimination | Age and date bias | Cautious optional birth-date/age signal only; does not infer applicant age or suitability |
| Bias & discrimination | Employment gaps | Conservative chronological month intervals; merges overlapping roles, respects partial dates and neutral reasons |
| Seniority & impact | Career progression | Heuristic same-employer title advancement only, labelled as *possible*, never proof of promotion |
| Seniority & impact | Skills evidence | Distinguishes mentioned skills from role/project examples; facts still unverified |
| Seniority & impact | Leadership signals | Team example + optional authentic scope; explicit leadership requirement triggers truthful prompt |

## Workflow and behavior

1. analyzeResumeReadiness({document,appearance,artifact?,fileName?,job?,now?}) runs pre-existing rules, local risk checks, optional vacancy skills, and sorts corrections by **critical/high/medium/low** priority. Each finding supplies a specific reason, an action, source context and optional editor path.
2. analyzeJobSkills(job,document) returns required/preferred **hard and soft skills** separately, supported by actual text excerpts. It differentiates *described* in role/project, *mentioned* in a skills list or summary, and *not-found*. Phrase aliases require word boundaries and discard obvious negated/learning-only mentions. It does not invent accomplishments or infer abilities from job title.
3. compareToDocument retains its established lexical results and now includes skillEvidence. Older consumers remain compatible. The career journey UI displays the skill findings and the CV check UI displays prioritized corrections and the full 27-row scope register.
4. No function returns a job match percentage, ATS pass likelihood, hiring probability, peer ranking, or validated score. A score needs a versioned, consented, independently labelled corpus, representative roles/markets/languages, blinded human annotation, calibrated error thresholds, per-subgroup monitoring, and repeatable external ATS parsing tests. No such evidence is present.

## Second review: evidence integrity and stronger feedback (17 November 2026)

The second review explicitly corrected false-positive paths and a browser-visibility regression:

- **Evidence threshold:** A requirement is not marked `evidenced` solely because a headline, summary, or skills list shares its terms. Stronger textual coverage must occur together in an experience/project bullet or relevant structured education/certification entry; even then, the claims remain self-reported and require human review. Other cases are `partial`, `no-evidence`, or `not-assessable`. This intentionally downgrades an earlier inventory example that combined a skills-list mention with a stock-count bullet.
- **Negated skill language:** Phrases such as `No SQL experience`, `Learning Python`, and `SQL is not required` are not positive proof. The lexicon distinguishes `C++`, `C#`, and `.NET` by unique IDs, adds further technical and business skills, and demands an action in the same clause as a role/project skill phrase for `described` status.
- **Alternative skills:** A simple, explicit `Python or SQL` is analyzed as an alternative group; the unselected option is not treated as a second mandatory missing skill when another is present in the CV. `Python and SQL` remains two separate requirements. Long, ambiguous job-advert wording is **not** interpreted as a complete Boolean skills grammar.
- **Numerical scope:** Team-size and years-of-experience wording is surfaced with source text and a caution; a smaller figure does **not** prove that the applicant fails the threshold. Dates are not silently converted to years of relevant experience.
- **Chronology and leadership:** Definite future start/end dates and conflicting `current`/end-date metadata are flagged; partial-year dates and overlapping roles are treated conservatively. Same-employer title changes are inferred as possible progression only for readable ordered periods without substantial overlap, not as validated promotions.
- **Practical corrections:** New English typo hints (e.g., `managment`, `experiance`, `recieved`) remain review-only. Prioritized corrections are visible before collapsible technical detail; the interface explicitly states that the result **is not a score**.

The 27-row matrix remains a *scope and limitations register*, not a claim that 27 independently validated checker engines exist. Genuine exported PDF/DOCX parsing, third-party ATS benchmark evidence, calibrated ranking, demographic fairness, real candidate feedback and multilingual grammar accuracy remain unverified.

## Regression and acceptance

Run node --test tests/intelligence/*.test.mjs, node --test tests/career/*.test.mjs and node --test tests/experience/journeys.test.mjs. CI: .github/workflows/ats-diagnostics.yml.

Synthetic tests cover exact 27/7 inventory, no-score contract, whole-phrase and negation false positives, hard/soft job priority, skills-only evidence, overlapping employment, partial-year gap handling, incorrect chronology, grammar and credibility, leadership, contextual missing data, and backward compatibility.

**Not yet accepted:** native browser, real CV corpus, exported document parser cross-validation, international skills taxonomy, full grammar accuracy, expert rubric review, score calibration, independent LinkedIn/profile verification, peer benchmarking and real applicant fairness evaluation. These remain explicit gaps, not silent passes. Do not market 27 independently validated checks or "passes all ATS" as a result of this branch.
