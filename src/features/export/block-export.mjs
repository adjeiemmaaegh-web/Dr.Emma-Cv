/**
 * Generic block -> PDF/DOCX/text export so other workstreams (cover letters, interview packs) reuse Group B's renderer
 * instead of copying it. blocks: [{kind:'name'|'title'|'contact'|'section-title'|'entry-head'|'line'|'bullet',text,right?,links?,keepWithNext?}]
 * Added by Group D on B's behalf (cross-owner change, see docs/workstreams/career/README.md); B to review.
 */
import {paginate,pagesToText} from '../documents/layout.mjs';
import {renderPdf} from '../documents/pdf-writer.mjs';
import {renderDocx} from '../documents/docx-writer.mjs';
import {resolveStyle,PAPER_SIZES} from '../templates/registry.mjs';
import {MIME,RENDERER_VERSION} from './export-service.mjs';
export function renderBlocksArtifact({blocks,appearance={},title='Document',sourceId,sourceRevision=0},format){
 if(format!=='pdf'&&format!=='docx')throw Object.assign(new Error('Unsupported export format'),{code:'INVALID'});
 if(!Array.isArray(blocks)||!blocks.length)throw Object.assign(new Error('Nothing to export'),{code:'INVALID'});
 const style=resolveStyle(appearance);
 const full=blocks.map(b=>({links:[],keepWithNext:false,...b}));
 const {pages,paper}=paginate(full,style);
 const text=pagesToText(pages.length?pages:[[]]);
 const out=format==='pdf'?renderPdf({pages,paper,style,title}):renderDocx({blocks:full,style,paper:PAPER_SIZES[style.paper]||paper,title});
 return {format,mime:MIME[format],bytes:out.bytes,sourceVariantId:sourceId,sourceRevision,pageCount:pages.length||1,text,warnings:out.warnings,rendererVersion:RENDERER_VERSION};
}
