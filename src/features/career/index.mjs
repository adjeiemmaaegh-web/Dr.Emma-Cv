/** Group D public surface (Stages 13-16). Pure and offline; persistence is the host's job. */
export {createLetterDraft,reviseLetter,setLetterLayout,checkLetterFacts,letterToBlocks,exportLetter,LETTER_LAYOUTS} from '../cover-letter/letter.mjs';
export * as tracker from '../tracker/tracker.mjs';
export {exportBook,exportCsv,reviewBookImport,approveBookImport} from '../tracker/io.mjs';
export {buildQuestions,emptySession,addStory,updateStory,storyCompleteness,startPractice,finishPractice,practiceSummary,exportSession,importSession,clearSession,exportPreparationPack,preparationPackBlocks,COMPETENCIES,REFLECTION_PROMPTS} from '../interview/interview.mjs';
export {fromPastedText,fromOfficialExport,parseCsv,coachLinkedIn,compareWithCv,suggestProfileText,LINKEDIN_LIMITS} from '../linkedin-coach/linkedin.mjs';
export {REGIONS,LOCALES,getRegion,regionChecks,sectionLabels} from '../career-region/regions.mjs';
