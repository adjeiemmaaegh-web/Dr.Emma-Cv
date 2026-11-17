/** DocumentRenderer contract implementation (Group A `DocumentArtifact`). Pure: no storage, no network. */
import {layoutDocument,pagesToText} from '../documents/layout.mjs';
import {renderPdf} from '../documents/pdf-writer.mjs';
import {renderDocx} from '../documents/docx-writer.mjs';
import {validLegacyDocument} from '../../domain/storage/legacy-shape.mjs';
export const MIME=Object.freeze({pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
export const RENDERER_VERSION=1;
export function renderPreview(document,appearance){
 const l=layoutDocument(document,appearance);
 return {pages:l.pages,text:pagesToText(l.pages),pageCount:l.pages.length,warnings:l.warnings,paper:l.paper};
}
/**
 * @param variant ResumeVariant-like {id,revision,name,document,appearance}
 * @returns DocumentArtifact + {pageCount,text,warnings,rendererVersion}
 */
export function renderDocumentArtifact(variant,format){
 if(format!=='pdf'&&format!=='docx')throw Object.assign(new Error('Unsupported export format'),{code:'INVALID'});
 if(!variant||!validLegacyDocument(variant.document))throw Object.assign(new Error('Invalid CV document'),{code:'INVALID'});
 const l=layoutDocument(variant.document,variant.appearance||{});
 const title=[variant.document.personalInfo.firstName,variant.document.personalInfo.lastName,'CV'].filter(Boolean).join(' ');
 const out=format==='pdf'?renderPdf({pages:l.pages,paper:l.paper,style:l.style,title}):renderDocx({blocks:l.blocks,style:l.style,paper:l.paper,title});
 return {format,mime:MIME[format],bytes:out.bytes,sourceVariantId:variant.id,sourceRevision:variant.revision,
  pageCount:format==='pdf'?out.pageCount:l.pages.length,text:pagesToText(l.pages),
  warnings:[...l.warnings,...out.warnings],rendererVersion:RENDERER_VERSION};
}
