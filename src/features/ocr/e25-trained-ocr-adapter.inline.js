
/* E25 trained OFFLINE English OCR adapter — explicit local user opt-in only.
 * The engine and model are bundled, never fetched during normal use.
 * Results are untrusted text; every line requires source comparison.
 */
(function(root){
 'use strict';
 const MAX_IMAGE_BYTES=6*1024*1024;
 const packed=id=>{
  const el=document.getElementById(id);
  if(!el||!el.textContent)throw Error('Bundled trained OCR asset unavailable: '+id);
  const b64=el.textContent.trim();
  const output=new Uint8Array(Math.floor(b64.length*3/4));
  let offset=0;
  for(let i=0;i<b64.length;i+=65532){
   const chunk=atob(b64.slice(i,i+65532));
   for(let j=0;j<chunk.length;j++)output[offset++]=chunk.charCodeAt(j);
  }
  return output.subarray(0,offset).buffer;
 };
 async function recognize(file,options={}){
  if(!(file instanceof Blob)||file.size<=0||file.size>MAX_IMAGE_BYTES
    ||!/^image\/(png|jpeg|webp)$/i.test(file.type||''))throw Error('Use a PNG, JPEG or WebP no larger than 6 MB');
  const safety=root.ledgerE2ImageSafety?.inspect
   ?await root.ledgerE2ImageSafety.inspect(file):{autoOcrAllowed:false,reason:'Image preflight unavailable'};
  if(!safety.autoOcrAllowed)throw Error(safety.reason||'Image preflight rejected');
  const rotation=Number(options.rotation??0);
  if(![0,90,180,270].includes(rotation))throw Error('Unsupported rotation');
  if(typeof root.Worker!=='function'||typeof root.WebAssembly!=='object'||typeof root.createImageBitmap!=='function')
   throw Error('This browser does not support a fully offline trained OCR worker');
  let bitmap,workerURL,ocr;
  try{
   const source=packed('ledgerE25Worker');
   const sourceText=new TextDecoder().decode(source);
   workerURL=URL.createObjectURL(new Blob([sourceText],{type:'text/javascript'}));
   const bounded=(promise,what)=>new Promise((resolve,reject)=>{
    const t=setTimeout(()=>reject(Error(what+' timed out; worker error: '+String(root.__ledgerE25WorkerError||'none reported'))),45000);
    Promise.resolve(promise).then(v=>{clearTimeout(t);resolve(v)},e=>{clearTimeout(t);reject(e)});
   });
   ocr=new OCRClient({workerURL,wasmBinary:packed(supportsFastBuild()?'ledgerE25Wasm':'ledgerE25FallbackWasm'),
    createWorker(url){const w=new Worker(url);w.addEventListener('error',e=>{root.__ledgerE25WorkerError=String(e.message||'unreported')});return w}
   });
   await bounded(ocr.loadModel(packed('ledgerE25English')),'Trained OCR initialization');
   bitmap=await createImageBitmap(file);
   let image=bitmap;
   if(rotation){
    const canvas=document.createElement('canvas');
    canvas.width=rotation%180===0?bitmap.width:bitmap.height;
    canvas.height=rotation%180===0?bitmap.height:bitmap.width;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw Error('Canvas transformation unavailable');
    ctx.translate(canvas.width/2,canvas.height/2);
    ctx.rotate(rotation*Math.PI/180);
    ctx.drawImage(bitmap,-bitmap.width/2,-bitmap.height/2);
    image=ctx.getImageData(0,0,canvas.width,canvas.height);
   }
   await ocr.loadImage(image);
   const text=String(await bounded(ocr.getText(),'Trained OCR recognition')||'').slice(0,120000);
   return {text,lines:text.split(/\r?\n/).filter(Boolean).length,rotationApplied:rotation,
    engine:'trained-offline-tesseract-wasm-0.11.0',notice:'English model only. Compare every detail with the source image before importing.'};
  }finally{
   bitmap?.close?.();
   try{await ocr?.destroy?.()}catch{}
   if(workerURL)URL.revokeObjectURL(workerURL);
  }
 }
 root.ledgerE25TrainedOCR=Object.freeze({recognize,available:true,
  model:'tessdata_fast English; local only; no cloud or network'});
})(window);
