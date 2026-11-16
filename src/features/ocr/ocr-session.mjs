/**
 * Group B Stage 8: cancellable, bounded, all-or-nothing OCR batch -> review text.
 * The recognition engine is injected (existing offline Tesseract adapter or a test double); no network access here.
 * engine.recognize(image,{signal}) -> Promise<{text:string,confidence?:number}>
 */
import {parseResumeText,createImportReview} from '../import/text-import.mjs';
export const OCR_LIMITS=Object.freeze({maxPages:5,maxImageBytes:6*1024*1024,lowConfidence:0.6,minChars:20});
const abortError=()=>Object.assign(new Error('OCR cancelled'),{code:'CANCELLED',name:'AbortError'});
export async function runOcrBatch({images,engine,signal,limits=OCR_LIMITS,onProgress,sourceName}={}){
 if(!engine||typeof engine.recognize!=='function')throw new TypeError('OCR engine required');
 if(!Array.isArray(images)||!images.length)throw Object.assign(new Error('No pages supplied'),{code:'INVALID'});
 if(images.length>limits.maxPages)throw Object.assign(new Error('At most '+limits.maxPages+' pages per batch'),{code:'INVALID'});
 for(const im of images)if(!im||!(im.byteLength<=limits.maxImageBytes))throw Object.assign(new Error('Image missing or larger than '+limits.maxImageBytes+' bytes'),{code:'INVALID'});
 const texts=[],confs=[],warnings=['OCR output is unverified: check every name, date and number against the source before importing.'];
 for(let i=0;i<images.length;i++){
  if(signal?.aborted)throw abortError();
  onProgress?.({page:i+1,total:images.length});
  let r;
  try{r=await engine.recognize(images[i],{signal});}catch(e){if(signal?.aborted)throw abortError();throw e;}
  if(signal?.aborted)throw abortError();           // discard the in-flight page: all-or-nothing
  const t=String(r?.text??'').trim();
  if(t.length<limits.minChars)throw Object.assign(new Error('Page '+(i+1)+' produced too little text; nothing was imported'),{code:'INVALID'});
  texts.push(t);
  if(typeof r.confidence==='number'){confs.push(r.confidence);
   if(r.confidence<limits.lowConfidence)warnings.push('Page '+(i+1)+' has low recognition confidence ('+Math.round(r.confidence*100)+'%).');}
 }
 const text=texts.join('\n');
 const parsed=parseResumeText(text);parsed.warnings.unshift(...warnings);
 const review=createImportReview(parsed,{sourceName});
 // OCR output can never be pre-accepted; every item stays 'pending' until a person decides.
 return {review,text,pages:images.length,meanConfidence:confs.length?confs.reduce((a,b)=>a+b,0)/confs.length:null};
}
