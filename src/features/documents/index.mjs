/** Group B public surface (Stages 5-8). Consumed by Group A's composition root. */
export {editorFeature} from '../editor/editor-module.mjs';
export {createEditor} from '../editor/editor-state.mjs';
export {TEMPLATES,FAMILIES,listTemplates,getTemplate,applyTemplate,normalizeAppearance,resolveStyle,OPTIONS,PAPER_SIZES} from '../templates/registry.mjs';
export {renderDocumentArtifact,renderPreview,createDocumentRenderer,RENDERER_VERSION} from '../export/export-service.mjs';
export {parseResumeText,createImportReview,approveImportReview} from '../import/text-import.mjs';
export {htmlToImportText,docxToImportText} from '../import/html-import.mjs';
export {runOcrBatch,OCR_LIMITS} from '../ocr/ocr-session.mjs';
export {renderBlocksArtifact} from '../export/block-export.mjs';
