/* E26 — bounded rasterization of one PDF page for explicitly requested local OCR.
 * No PDF scripts, external fetches, cloud, file persistence, or automatic CV writes.
 * PDF.js and its worker source are embedded into this standalone HTML.
 */
(function(root){
 'use strict';
 const MAX_PDF=8*1024*1024,MAX_PAGES=50,MAX_PIXELS=1450000,MAX_OUTPUT=6*1024*1024;
 let workerURL=null;
 function base64(id){
  const encoded=document.getElementById(id)?.textContent?.trim();
  if(!encoded||encoded.length>30*1024*1024)throw Error('Bundled PDF renderer is unavailable');
  const parts=[];for(let i=0;i<encoded.length;i+=65532)parts.push(atob(encoded.slice(i,i+65532)));
  return parts.join('');
 }
 function ensure(){
  const pdf=root.ledgerE26Pdfjs;
  if(!pdf||typeof pdf.getDocument!=='function')throw Error('Bundled PDF rendering engine has not loaded');
  if(!workerURL){
   workerURL=URL.createObjectURL(new Blob([base64('ledgerE26PdfWorker')],{type:'text/javascript'}));
   pdf.GlobalWorkerOptions.workerSrc=workerURL;
  }
  return pdf;
 }
 function bitmap(canvas){
  return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Cannot encode the selected page')),'image/png'));
 }
 async function renderPage(file,index){
  if(!(file instanceof Blob)||file.size<=0||file.size>MAX_PDF||!Number.isInteger(index)||index<1||index>MAX_PAGES)
   throw Error('Choose a PDF no larger than 8 MB and a page between 1 and '+MAX_PAGES);
  if(!String(await file.slice(0,8).text()).startsWith('%PDF-'))throw Error('File lacks a valid PDF header');
  const pdfjs=ensure();
  let task=null,doc=null,canvas=null;
  try{
   task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),
    isEvalSupported:false,disableAutoFetch:true,disableStream:true,
    useSystemFonts:true,disableFontFace:true,stopAtErrors:true});
   doc=await task.promise;
   if(doc.numPages<1||doc.numPages>MAX_PAGES)throw Error('PDF page count exceeds the 50-page safety limit');
   if(index>doc.numPages)throw Error('Requested PDF page is outside this document');
   const page=await doc.getPage(index);
   const basic=page.getViewport({scale:1});
   if(!Number.isFinite(basic.width)||!Number.isFinite(basic.height)||basic.width<5||basic.height<5
     ||basic.width>20000||basic.height>20000)throw Error('PDF page dimensions are unsafe');
   const scale=Math.min(1.75,Math.sqrt(MAX_PIXELS/(basic.width*basic.height)));
   if(scale<0.1)throw Error('PDF page too large to render at safe resolution');
   const viewport=page.getViewport({scale});
   const width=Math.ceil(viewport.width),height=Math.ceil(viewport.height);
   if(width*height>MAX_PIXELS+4000)throw Error('Rendered page exceeds safe pixel count');
   canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
   if(!ctx)throw Error('Canvas unavailable for offline PDF scanning');
   ctx.fillStyle='white';ctx.fillRect(0,0,width,height);
   await page.render({canvasContext:ctx,viewport,canvas}).promise;
   const png=await bitmap(canvas);
   if(!png.size||png.size>MAX_OUTPUT)throw Error('Rendered page exceeds 6 MB image limit');
   return {image:new File([png],'ledger-scanned-page-'+index+'.png',{type:'image/png'}),
     page:index,pages:doc.numPages,width,height,bytes:png.size};
  }finally{
   if(canvas){canvas.width=1;canvas.height=1}
   try{if(doc)await doc.destroy();else if(task)await task.destroy()}catch{}
  }
 }
 root.addEventListener('pagehide',()=>{if(workerURL){URL.revokeObjectURL(workerURL);workerURL=null}},{once:true});
 root.ledgerE26Pdf=Object.freeze({renderPage,maxPdfBytes:MAX_PDF,maxPages:MAX_PAGES,maxPixels:MAX_PIXELS});
})(window);