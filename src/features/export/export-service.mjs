/** DocumentRenderer contract implementation (Group A `DocumentArtifact`). Pure: no storage, no network. */
import {layoutDocument,pagesToText} from '../documents/layout.mjs';
import {renderPdf} from '../documents/pdf-writer.mjs';
import {renderDocx} from '../documents/docx-writer.mjs';
import {validLegacyDocument} from '../../domain/storage/legacy-shape.mjs';
import {cvPhotoBytes} from '../documents/cv-photo.mjs';
export const MIME=Object.freeze({pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
export const RENDERER_VERSION=1;
export function renderPreview(document,appearance){
 const l=layoutDocument(document,appearance);
 return {pages:l.pages,text:pagesToText(l.pages),pageCount:l.pages.length,warnings:l.warnings,paper:l.paper,photo:document.personalInfo?.photo||null};
}
/**
 * @param variant ResumeVariant-like {id,revision,name,document,appearance}
 * @returns DocumentArtifact + {pageCount,text,warnings,rendererVersion}
 */
export function renderDocumentArtifact(variant,format){
 if(format!=='pdf'&&format!=='docx')throw Object.assign(new Error('Unsupported export format'),{code:'INVALID'});
 if(!variant||!validLegacyDocument(variant.document))throw Object.assign(new Error('Invalid CV document'),{code:'INVALID'});
 const l=layoutDocument(variant.document,variant.appearance||{});
 const photo=cvPhotoBytes(variant.document.personalInfo?.photo);
 const title=[variant.document.personalInfo.firstName,variant.document.personalInfo.lastName,'CV'].filter(Boolean).join(' ');
 const out=format==='pdf'?renderPdf({pages:l.pages,paper:l.paper,style:l.style,title,photo}):renderDocx({blocks:l.blocks,style:l.style,paper:l.paper,title,photo});
 return {format,mime:MIME[format],bytes:out.bytes,sourceVariantId:variant.id,sourceRevision:variant.revision,
  pageCount:format==='pdf'?out.pageCount:l.pages.length,text:pagesToText(l.pages),
  warnings:[...l.warnings,...out.warnings],rendererVersion:RENDERER_VERSION};
}

/** Adapter for Group A's asynchronous DocumentRenderer contract. */
export function createDocumentRenderer(){
 return Object.freeze({async render(request,signal){
  if(signal?.aborted)throw Object.assign(new Error('Export cancelled'),{name:'AbortError'});
  if(!request||!Number.isSafeInteger(request.sourceRevision)||typeof request.sourceVariantId!=='string')
   throw Object.assign(new Error('Invalid document render request'),{code:'INVALID'});
  const variant={id:request.sourceVariantId,revision:request.sourceRevision,
   document:request.document,appearance:request.appearance||{}};
  if(request.format==='html'){
   if(!validLegacyDocument(variant.document))throw Object.assign(new Error('Invalid CV document'),{code:'INVALID'});
   const preview=renderPreview(variant.document,variant.appearance);
   const esc=text=>String(text).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
   const html='<!doctype html><html lang="en"><meta charset="utf-8"><title>CV</title><body><main><pre>'+esc(preview.text)+'</pre></main></body></html>';
   return {format:'html',mime:'text/html',bytes:new TextEncoder().encode(html),
    sourceVariantId:variant.id,sourceRevision:variant.revision};
  }
  const artifact=renderDocumentArtifact(variant,request.format);
  if(signal?.aborted)throw Object.assign(new Error('Export cancelled'),{name:'AbortError'});
  return artifact;
 }});
}
