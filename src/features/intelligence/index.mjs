/** Group C public surface (Stages 9-12). Pure, offline, no storage access. */
export {RULES} from '../ats/rules.mjs';
export {runAtsChecks,coverageMatrix} from '../ats/engine.mjs';
export {parseJobText} from '../job-match/job-parser.mjs';
export {compareToDocument} from '../job-match/compare.mjs';
export {buildTailoringSuggestions,applyApprovedSuggestions} from '../tailoring/tailor.mjs';
export {analyzeWriting} from '../writing/checks.mjs';
export {createAiPort} from '../writing/ai-port.mjs';
export {detectUnsupportedClaims} from './claims.mjs';
