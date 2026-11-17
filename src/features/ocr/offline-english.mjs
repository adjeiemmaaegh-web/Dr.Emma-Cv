/**
 * Lazy, locally packaged trained English OCR for the hosted CV review.
 * User opt-in only; no remote host, CDN, document upload or profile write.
 * Uses the same pinned tesseract-wasm 0.11.0 engine/model as E25, without
 * modifying the frozen legacy single-HTML artifacts.
 */
import {contractError} from '../../contracts/platform.mjs';

export const OFFLINE_ENGLISH_OCR_LIMITS=Object.freeze({
 maxPagesPerReview:5,maxPixels:1450000,maxImageBytes:6*1024*1024,
 maxTextChars:120000,timeoutMs:60000
});
const asError=(message)=>contractError('UNAVAILABLE',message);
const base='/ocr-engine/';
async function localAsset(name,type='arrayBuffer'){
 const url=base+name;
 const result=await fetch(url,{credentials:'same-origin',cache:'force-cache',
  signal:AbortSignal.timeout(OFFLINE_ENGLISH_OCR_LIMITS.timeoutMs)});
 if(!result.ok||new URL(result.url).origin!==location.origin)
  throw asError('A bundled local OCR resource is missing; no remote OCR is allowed.');
 return type==='text'?result.text():result.arrayBuffer();
}
const timeout=(promise,label)=>new Promise((resolve,reject)=>{
 const time=setTimeout(()=>reject(asError(label+' exceeded the offline OCR time limit')),OFFLINE_ENGLISH_OCR_LIMITS.timeoutMs);
 Promise.resolve(promise).then(value=>{clearTimeout(time);resolve(value);},error=>{clearTimeout(time);reject(error);});
});
function raster(page){
 return (async()=>{
  const basic=page.getViewport({scale:1});
  if(!Number.isFinite(basic.width)||!Number.isFinite(basic.height)||basic.width<5||basic.height<5||
     basic.width>20000||basic.height>20000)throw contractError('INVALID','Unsafe PDF page dimensions');
  const scale=Math.min(1.75,Math.sqrt(OFFLINE_ENGLISH_OCR_LIMITS.maxPixels/(basic.width*basic.height)));
  if(scale<0.1)throw contractError('INVALID','PDF page is too large for bounded offline OCR');
  const viewport=page.getViewport({scale});
  const canvas=document.createElement('canvas');
  canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  if(canvas.width*canvas.height>OFFLINE_ENGLISH_OCR_LIMITS.maxPixels+4000)
   throw contractError('INVALID','Rendered PDF pixels exceed the offline OCR limit');
  try{
   const context=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
   if(!context)throw asError('Canvas rendering is unavailable for offline OCR');
   context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);
   await timeout(page.render({canvasContext:context,viewport,canvas}).promise,'PDF page rendering');
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(asError('Could not encode the PDF page')),'image/png'));
   if(!blob.size||blob.size>OFFLINE_ENGLISH_OCR_LIMITS.maxImageBytes)
    throw contractError('INVALID','Rendered PDF image exceeds 6 MB');
   return blob;
  }finally{canvas.width=1;canvas.height=1;}
 })();
}
export async function createOfflineEnglishPdfOcrSession({onProgress}={}){
 if(typeof Worker!=='function'||typeof WebAssembly!=='object'||typeof createImageBitmap!=='function')
  throw asError('Offline English OCR requires a modern browser with WebAssembly, Workers and image decoding');
 const mod=await import('/ocr-engine/client.mjs');
 if(typeof mod.OCRClient!=='function'||typeof mod.supportsFastBuild!=='function')
  throw asError('The bundled OCR client is incomplete');
 const files=await Promise.all([
  localAsset('worker.js','text'),
  localAsset(mod.supportsFastBuild()?'tesseract-core.wasm':'tesseract-core-fallback.wasm'),
  localAsset('eng.traineddata')
 ]);
 const workerUrl=URL.createObjectURL(new Blob([files[0]],{type:'text/javascript'}));
 let client=null,closed=false,pagesRead=0;
 try{
  client=new mod.OCRClient({
   workerURL:workerUrl,wasmBinary:files[1],
   createWorker:url=>new Worker(url)
  });
  await timeout(client.loadModel(files[2]),'English OCR model initialization');
 }catch(error){
  try{await timeout(client?.destroy?.(),'OCR worker shutdown')}catch{}
  URL.revokeObjectURL(workerUrl);
  throw error;
 }
 async function recognizePage({page,pageNumber}){
  if(closed)throw asError('The offline OCR session is closed');
  if(++pagesRead>OFFLINE_ENGLISH_OCR_LIMITS.maxPagesPerReview)
   throw contractError('INVALID','At most five scanned PDF pages can be recognized per review. Use explicit manual transcription for others.');
  onProgress?.('Running local English OCR for scanned PDF page '+pageNumber+' ('+pagesRead+'/5).');
  const blob=await raster(page);
  const bitmap=await createImageBitmap(blob);
  try{
   await timeout(client.loadImage(bitmap),'OCR image loading');
   const value=String(await timeout(client.getText(),'OCR recognition')||'').trim();
   if(value.length>OFFLINE_ENGLISH_OCR_LIMITS.maxTextChars)
    throw contractError('INVALID','OCR result exceeds the safe review length');
   if(value.replace(/\s/g,'').length<16)
    throw contractError('INVALID','OCR found too little meaningful text. Verify the original page manually.');
   return {text:value,confidence:null,engine:'trained-tesseract-wasm-0.11.0',
    notice:'English-only machine transcription; no accuracy guarantee'};
  }finally{bitmap.close?.();}
 }
 async function close(){
  if(closed)return;closed=true;
  try{await timeout(client.destroy(),'OCR worker shutdown')}catch{}
  URL.revokeObjectURL(workerUrl);
 }
 return {recognizePage,close,engine:'trained-tesseract-wasm-0.11.0',pagesLimit:OFFLINE_ENGLISH_OCR_LIMITS.maxPagesPerReview};
}
