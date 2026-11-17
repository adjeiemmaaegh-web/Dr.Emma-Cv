/**
 * Offline, user-initiated CV file import. No storage writes, servers or remote APIs.
 * TXT/HTML/DOCX are parsed locally. PDF.js is a bundled same-origin build asset.
 * ImportReview must be explicitly approved into a new independent career profile.
 */
import {parseResumeText,createImportReview} from './text-import.mjs';
import {docxToImportText,htmlToImportText} from './html-import.mjs';
import {createPdfImportReview} from './pdf-import.mjs';
import {contractError} from '../../contracts/platform.mjs';

export const LOCAL_CV_FILE_LIMITS=Object.freeze({
 text:2*1024*1024,html:2*1024*1024,docx:20*1024*1024,pdf:24*1024*1024
});
const EXTENSIONS=Object.freeze({txt:'text',html:'html',htm:'html',docx:'docx',pdf:'pdf'});

/** Only same-origin bundled PDF.js; call after explicit file selection. */
export async function loadBundledPdfEngine({importModule=(url)=>import(url),
 modulePath='/pdf-engine/pdf.mjs',workerPath='/pdf-engine/pdf.worker.mjs'}={}){
 const module=await importModule(modulePath);
 if(typeof module?.getDocument!=='function'||!module?.GlobalWorkerOptions)
  throw contractError('UNAVAILABLE','Bundled PDF engine is unavailable; no document was imported.');
 module.GlobalWorkerOptions.workerSrc=workerPath;
 return module.getDocument;
}
export async function createLocalFileImportReview(file,{getDocument,inflate,idFactory,now}={}){
 if(!file||typeof file.name!=='string'||typeof file.arrayBuffer!=='function')
  throw contractError('INVALID','Select a local CV file first.');
 const ext=file.name.split('.').pop().toLowerCase(),format=EXTENSIONS[ext];
 if(!format)throw contractError('INVALID','Supported CV import files: PDF, DOCX, TXT and HTML.');
 if(!Number.isSafeInteger(file.size)||file.size<1||file.size>LOCAL_CV_FILE_LIMITS[format])
  throw contractError('INVALID','Selected '+format.toUpperCase()+' exceeds the safe local file size.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(bytes.length!==file.size)throw contractError('INVALID','CV file changed during import; select it again.');
 const sourceName=file.name;
 if(format==='pdf'){
  const getPdf=getDocument||await loadBundledPdfEngine();
  return createPdfImportReview(bytes,{getDocument:getPdf,sourceName,idFactory,now});
 }
 let text,warnings=[];
 if(format==='docx'){
  const result=await docxToImportText(bytes,{inflate});
  text=result.text;warnings=result.warnings;
 }else{
  // UTF-8 decoding with a BOM allowance; unreadable binary is not silently guessed.
  let input;
  try{input=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{
   throw contractError('INVALID','Text import must be UTF-8. Convert the file to UTF-8 or use DOCX/PDF.');
  }
  const result=format==='html'?htmlToImportText(input):{text:input,warnings:[]};
  text=result.text;warnings=result.warnings;
 }
 const parsed=parseResumeText(text);
 parsed.warnings.unshift(...warnings);
 const review=createImportReview(parsed,{sourceName,idFactory,now});
 return {...review,format,pages:null,userReviewed:false,originalBytes:file.size};
}
