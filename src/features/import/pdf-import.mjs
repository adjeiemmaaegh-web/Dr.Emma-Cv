/**
 * Offline PDF text extraction adapter. The caller supplies a locally bundled PDF.js
 * getDocument function; this module never loads a CDN, fetches a URL or saves a CV.
 * Raster PDF OCR is opt-in and supplied by a local OCR adapter.
 */
import {parseResumeText,createImportReview,IMPORT_LIMITS} from './text-import.mjs';
import {contractError} from '../../contracts/platform.mjs';
export const PDF_IMPORT_LIMITS=Object.freeze({maxBytes:24*1024*1024,maxPages:40,maxItemsPerPage:60000,minUsefulCharacters:16});

const text=v=>typeof v==='string'?v:'';
const checkBytes=bytes=>{
 if(!(bytes instanceof Uint8Array)||bytes.length===0||bytes.length>PDF_IMPORT_LIMITS.maxBytes)
  throw contractError('INVALID','Select a PDF file under 24 MB');
 if(String.fromCharCode(...bytes.subarray(0,5))!=='%PDF-')
  throw contractError('INVALID','File does not start with a PDF header');
};
function sourceLines(items){
 const rows=[];let row='',prior=null;
 const finish=()=>{if(row.trim())rows.push(row.trim());row='';prior=null;};
 for(const item of items){
  const part=text(item.str);if(!part){if(item.hasEOL)finish();continue;}
  const x=Number(item.transform?.[4]),y=Number(item.transform?.[5]);
  if(prior&&Number.isFinite(y)&&Number.isFinite(prior.y)&&Math.abs(y-prior.y)>3)finish();
  else if(prior&&Number.isFinite(x)&&Number.isFinite(prior.x)&&x-prior.x>Math.max(3,(prior.width||0)+3)
      &&row&&!/\s$/.test(row)&&!/^\s/.test(part))row+=' ';
  row+=part;
  prior={x,y,width:Number(item.width)||0};
  if(item.hasEOL)finish();
 }
 finish();return rows;
}
/** Warn, rather than silently rearrange, when PDF text order is visually ambiguous. */
function hasLayoutAmbiguity(items){
 const positions=items.filter(x=>text(x.str).trim()&&Number.isFinite(x.transform?.[4])&&Number.isFinite(x.transform?.[5]));
 for(let i=1;i<positions.length;i++){
  if(positions[i].transform[5]>positions[i-1].transform[5]+25)return true;
 }
 return false;
}
export async function pdfToImportText(bytes,{getDocument,ocrPage,allowOcr=false,onPage}={}){
 checkBytes(bytes);
 if(typeof getDocument!=='function')throw contractError('UNAVAILABLE','A locally bundled PDF text engine is required; no online PDF service is used.');
 const warnings=[],pages=[];let pdf,task;
 try{
  task=getDocument({data:new Uint8Array(bytes),disableAutoFetch:true,disableStream:true,stopAtErrors:true});
  pdf=await (task?.promise??task);
  if(!Number.isSafeInteger(pdf?.numPages)||pdf.numPages<1||pdf.numPages>PDF_IMPORT_LIMITS.maxPages)
   throw contractError('INVALID','PDF page count is invalid or exceeds 40 pages');
  let totalChars=0,lines=0;
  for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
   const page=await pdf.getPage(pageNumber);
   const content=await page.getTextContent({disableCombineTextItems:false});
   if(!Array.isArray(content?.items)||content.items.length>PDF_IMPORT_LIMITS.maxItemsPerPage)
    throw contractError('INVALID','PDF text layer exceeds per-page limits');
   let extracted=sourceLines(content.items).join('\n'),method='selectable-text',confidence=null;
   if(hasLayoutAmbiguity(content.items))warnings.push('Page '+pageNumber+' has ambiguous multi-column or out-of-order content; compare it with the original PDF.');
   if(!extracted.trim()){
    warnings.push('Page '+pageNumber+' has no selectable text. It may require offline OCR.');
    if(allowOcr&&typeof ocrPage==='function'){
     const result=await ocrPage({page,pageNumber});
     extracted=text(result?.text).trim();confidence=Number.isFinite(result?.confidence)?result.confidence:null;
     method=extracted?'opt-in-offline-ocr':'no-text';
     warnings.push('Page '+pageNumber+' OCR needs human verification'+(confidence===null?' (confidence not supplied).':'; reported confidence '+confidence+'.'));
    }else method='no-text';
   }
   // A scanned CV can contain a tiny selectable page-number overlay while the
   // substantive qualifications are raster images. Do not mark that page as
   // faithfully extracted merely because its text layer is nonempty.
   if(extracted.trim()&&extracted.replace(/\s/g,'').length<PDF_IMPORT_LIMITS.minUsefulCharacters){
    warnings.push('Page '+pageNumber+' has only a sparse text layer. It might hide an image-only CV page; manually transcribe the complete page or supply verified local OCR.');
    method='sparse-text';
   }
   totalChars+=extracted.length;
   lines+=extracted.split('\n').length;
   if(totalChars>IMPORT_LIMITS.maxChars||lines>IMPORT_LIMITS.maxLines)
    throw contractError('INVALID','PDF text exceeds the import limits; nothing was imported or saved.');
   const entry={page:pageNumber,text:extracted,method,confidence};
   pages.push(entry);
   if(typeof onPage==='function')await onPage(Object.freeze({...entry}));
   page.cleanup?.();
  }
  const sourceText=pages.map(p=>p.text).join('\n').trim();
  if(!sourceText)warnings.push('No PDF text was recoverable. Nothing can be imported without a local OCR review.');
  const missingPages=pages.filter(p=>!p.text.trim()||p.method==='sparse-text').map(p=>p.page);
  if(missingPages.length)warnings.push('Import blocked: PDF page(s) '+missingPages.join(', ')+' had missing or suspiciously sparse text; importing the partial CV could lose information.');
  return {text:sourceText,pages,warnings,missingPages,complete:missingPages.length===0,requiresUserConfirmation:true};
 }finally{
  await pdf?.destroy?.();
  if(!pdf)await task?.destroy?.();
 }
}
/** Output is a non-persisted proposal. Approval still goes through approveImportReview. */
export async function createPdfImportReview(bytes,{getDocument,ocrPage,allowOcr=false,onPage,sourceName='selected.pdf',idFactory,now}={}){
 const extracted=await pdfToImportText(bytes,{getDocument,ocrPage,allowOcr,onPage});
 const parsed=parseResumeText(extracted.text);
 parsed.warnings.unshift(...extracted.warnings);
 const review=createImportReview(parsed,{sourceName,idFactory,now});
 return {...review,status:extracted.complete?review.status:'blocked',
  warnings:review.warnings,missingPages:extracted.missingPages,pages:extracted.pages,format:'pdf',userReviewed:false};
}

/**
 * Manual recovery for scanned/image-only PDF pages.
 * No OCR, no inferred facts and no CV write. All missing page transcriptions must
 * be explicitly supplied and confirmed before a new ImportReview is proposed.
 */
export function reviewPdfManualTranscription(review,{transcriptions={},confirmed=false,idFactory,now}={}){
 if(confirmed!==true)throw contractError('UNCONFIRMED','Confirm complete manual transcription of missing PDF pages.');
 if(review?.format!=='pdf'||!Array.isArray(review.pages)||!Array.isArray(review.missingPages)||!review.missingPages.length)
  throw contractError('INVALID','Select an incomplete reviewed PDF first.');
 const missing=new Set(review.missingPages);
 const pages=review.pages.map(p=>{
  if(!missing.has(p.page))return {...p};
  const typed=transcriptions[p.page];
  if(typeof typed!=='string'||!typed.trim()||typed.length>IMPORT_LIMITS.maxChars)
   throw contractError('INVALID','Every missing PDF page needs a complete manual transcription.');
  return {...p,text:typed.trim(),method:'user-transcribed',confidence:null};
 });
 const combined=pages.map(p=>p.text).join('\n');
 const parsed=parseResumeText(combined);
 parsed.warnings.unshift('PDF page(s) '+[...missing].join(', ')+
  ' were manually transcribed by the user, NOT OCR-verified. Check every name, date and qualification against the original page.',
  ...(review.warnings||[]).filter(x=>!/Import blocked: PDF page/.test(x)));
 const proposal=createImportReview(parsed,{sourceName:review.sourceName,idFactory,now});
 return {...proposal,format:'pdf',pages,missingPages:[],transcribedPages:[...missing],userReviewed:false};
}
