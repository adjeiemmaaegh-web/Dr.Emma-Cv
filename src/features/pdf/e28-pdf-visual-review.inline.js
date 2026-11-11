/* E28: verified visual scanned-page comparison and rotation atop E27 transactional PDF OCR.
 * Only a complete, unchanged and uncancelled batch may update review text.
 * Nothing writes CV storage until the existing explicit import approval.
 */
function e26AttachScannedPdfReview(review,file){
 const panel=review.panel,frame=document.createElement('section');
 frame.className='ledger-e26-pdf-ocr';
 frame.setAttribute('aria-label','Optional offline OCR for scanned PDF pages');
 const intro=document.createElement('p');
 intro.textContent='For image-only PDFs, read one page or up to five consecutive pages locally. Review every name, date and contact field against the PDF; scanned text can be wrong. No page is saved to your CV until you approve import.';
 const row=document.createElement('div');row.className='ledger-e9-image-toolbar';
 const singleLabel=document.createElement('label');
 singleLabel.textContent='PDF page (1–50) ';
 const page=document.createElement('input');page.type='number';page.min='1';page.max='50';page.step='1';page.value='1';page.style.width='5rem';
 singleLabel.append(page);
 const single=document.createElement('button');single.type='button';
 single.textContent='Read selected PDF page offline';
 single.setAttribute('aria-label','Read selected scanned PDF page using bundled offline English OCR');
 row.append(singleLabel,single);
 const batchRow=document.createElement('div');batchRow.className='ledger-e9-image-toolbar';
 const fromLabel=document.createElement('label');fromLabel.textContent='From page ';
 const from=document.createElement('input');from.type='number';from.min='1';from.max='50';from.step='1';from.value='1';from.style.width='5rem';fromLabel.append(from);
 const toLabel=document.createElement('label');toLabel.textContent='Through page ';
 const to=document.createElement('input');to.type='number';to.min='1';to.max='50';to.step='1';to.value='2';to.style.width='5rem';toLabel.append(to);
 const batch=document.createElement('button');batch.type='button';
 batch.textContent='Read up to five PDF pages offline';
 batch.setAttribute('aria-label','Read a bounded batch of scanned PDF pages offline');
 const stop=document.createElement('button');stop.type='button';
 stop.textContent='Stop after current page';
 stop.setAttribute('aria-label','Stop PDF OCR after current page without modifying the review draft');
 stop.disabled=true;batchRow.append(fromLabel,toLabel,batch,stop);
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 status.textContent='PDF remains on your device. The trained English OCR requires manual verification before import.';
 const pagesDone=document.createElement('p');
 pagesDone.setAttribute('role','status');pagesDone.setAttribute('aria-live','polite');
 pagesDone.textContent='No scanned pages added to this review yet.';
 // E28: real bitmap orientation is applied *before* OCR, and the reference
 // image shown to the reviewer is the identical oriented bitmap.
 const rotationLabel=document.createElement('label');
 rotationLabel.textContent='PDF scan orientation for OCR ';
 const rotation=document.createElement('select');
 rotation.setAttribute('aria-label','PDF scan rotation before offline OCR');
 for(const [degrees,description] of [[0,'As scanned (0°)'],[90,'Rotate clockwise 90°'],[180,'Rotate 180°'],[270,'Rotate clockwise 270°']]){
  const option=document.createElement('option');option.value=String(degrees);option.textContent=description;
  rotation.append(option);
 }
 rotationLabel.append(rotation);
 const preview=document.createElement('section');
 preview.className='ledger-e28-pdf-reference';
 preview.setAttribute('aria-label','Scanned PDF visual comparison reference');
 preview.hidden=true;
 const previewTitle=document.createElement('p');
 previewTitle.textContent='Original scanned page — visual reference only. Compare it with OCR text below; it is never saved into the CV.';
 const previewBar=document.createElement('div');previewBar.className='ledger-e9-image-toolbar';
 const pickLabel=document.createElement('label');pickLabel.textContent='Reference page ';
 const pick=document.createElement('select');pick.setAttribute('aria-label','Select scanned PDF page image to verify');
 pickLabel.append(pick);
 const zoomOut=document.createElement('button');zoomOut.type='button';zoomOut.textContent='Zoom image out';
 const zoomIn=document.createElement('button');zoomIn.type='button';zoomIn.textContent='Zoom image in';
 const zoomReset=document.createElement('button');zoomReset.type='button';zoomReset.textContent='Reset image zoom';
 const previewMeta=document.createElement('p');previewMeta.setAttribute('role','status');previewMeta.setAttribute('aria-live','polite');
 const previewWindow=document.createElement('div');
 previewWindow.style.cssText='overflow:auto;max-height:360px;border:1px solid #a5abb4;border-radius:6px;background:#f7f8fa;padding:8px';
 const previewImage=document.createElement('img');
 previewImage.alt='Local scanned PDF page for manual OCR comparison';
 previewImage.style.cssText='display:block;height:auto;max-width:none;width:100%;';
 previewWindow.append(previewImage);
 previewBar.append(pickLabel,zoomOut,zoomIn,zoomReset);
 preview.append(previewTitle,previewBar,previewMeta,previewWindow);
 frame.append(intro,row,batchRow,rotationLabel,status,pagesDone,preview);
 const guard=ledgerInstallOCRReviewGuard(review,frame);
 const target=panel.querySelector('.ledger-e2-import');
 if(target)target.prepend(frame);else panel.append(frame);
 let busy=false,stopRequested=false;
 const importedPages=new Set();
 const controls=[single,batch,page,from,to,rotation];
 const visiblePages=[];
 const MAX_VISIBLE=5;let zoom=1;
 function releaseVisuals(){
  for(const item of visiblePages)URL.revokeObjectURL(item.url);
  visiblePages.length=0;
  previewImage.removeAttribute('src');pick.replaceChildren();preview.hidden=true;
 }
 // Closing by Cancel, Escape or replacing the active dialog must release
 // all retained Blob URLs and their image data, not just leave a hidden node.
 const observer=new MutationObserver(()=>{
  if(!panel.isConnected){releaseVisuals();observer.disconnect()}
 });
 observer.observe(document.body,{subtree:true,childList:true});
 function showReference(){
  const item=visiblePages.find(x=>String(x.page)===pick.value)||visiblePages.at(-1);
  if(!item){preview.hidden=true;return}
  preview.hidden=false;previewImage.src=item.url;
  previewImage.alt='PDF page '+item.page+' rotated '+item.degrees+' degrees for checking OCR transcription';
  previewImage.style.width=Math.round(100*zoom)+'%';
  previewMeta.textContent='Page '+item.page+' — rotated '+item.degrees+'° before OCR; zoom '+Math.round(zoom*100)+'%. Only the newest five recognized page images remain in memory.';
 }
 function retainVisuals(pages){
  for(const p of pages){
   const url=URL.createObjectURL(p.blob);
   visiblePages.push({page:p.page,url,degrees:p.degrees});
   if(visiblePages.length>MAX_VISIBLE){
    const removed=visiblePages.shift();URL.revokeObjectURL(removed.url);
   }
  }
  pick.replaceChildren();
  for(const item of visiblePages){
   const option=document.createElement('option');
   option.value=String(item.page);option.textContent='Page '+item.page;
   pick.append(option);
  }
  pick.value=String(visiblePages.at(-1).page);
  zoom=1;showReference();
 }
 pick.addEventListener('change',()=>{zoom=1;showReference()});
 zoomIn.addEventListener('click',()=>{zoom=Math.min(3,Math.round((zoom+0.25)*100)/100);showReference()});
 zoomOut.addEventListener('click',()=>{zoom=Math.max(0.5,Math.round((zoom-0.25)*100)/100);showReference()});
 zoomReset.addEventListener('click',()=>{zoom=1;showReference()});
 async function orientedBlob(blob,degrees){
  if(degrees===0)return blob;
  if(![90,180,270].includes(degrees))throw Error('Unsupported scan rotation');
  if(typeof createImageBitmap!=='function')throw Error('Local image rotation is unsupported in this browser');
  const image=await createImageBitmap(blob);
  let canvas=null;
  try{
   const w=image.width,h=image.height;
   if(!w||!h||w*h>1454000)throw Error('Rotated image exceeds safe dimensions');
   canvas=document.createElement('canvas');
   canvas.width=degrees%180===0?w:h;canvas.height=degrees%180===0?h:w;
   const ctx=canvas.getContext('2d',{alpha:false});
   if(!ctx)throw Error('Cannot rotate PDF image locally');
   ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   if(degrees===90)ctx.translate(canvas.width,0);
   else if(degrees===180)ctx.translate(canvas.width,canvas.height);
   else ctx.translate(0,canvas.height);
   ctx.rotate(degrees*Math.PI/180);ctx.drawImage(image,0,0);
   const converted=await new Promise((resolve,reject)=>
    canvas.toBlob(v=>v?resolve(v):reject(Error('Could not encode rotated PDF image')),'image/png'));
   if(!converted.size||converted.size>6*1024*1024)throw Error('Rotated PDF image exceeds the 6 MB safety limit');
   return new File([converted],'rotated-scanned-pdf-page.png',{type:'image/png'});
  }finally{
   image.close?.();if(canvas){canvas.width=1;canvas.height=1}
  }
 }
 const approval=panel.querySelector('.ledger-e2-buttons button');
 const approval=panel.querySelector('.ledger-e2-buttons button');
 approval?.addEventListener('click',event=>{
  if(!busy)return;
  event.preventDefault();event.stopImmediatePropagation();
  status.textContent='OCR is still running. Stop or finish the batch before importing.';
 },true);
 function valid(n){return Number.isInteger(n)&&n>=1&&n<=50}
 function labelFor(list){return list.length===1?'page '+list[0]:'pages '+list[0]+'–'+list[list.length-1]}
 function changeBusy(active){
  busy=active;
  for(const control of controls)control.disabled=active;
  stop.disabled=!active;
 }
 stop.addEventListener('click',()=>{
  if(!busy)return;
  stopRequested=true;stop.disabled=true;
  status.textContent='Stopping after the current page. No part of this batch will be added to your review.';
 });
 async function run(first,last){
  if(busy||!panel.isConnected)return;
  if(!valid(first)||!valid(last)||last<first||last-first+1>5){
   status.textContent='Choose valid whole-number pages from 1 to 50, in order, with no more than five per batch.';
   return;
  }
  const selected=Array.from({length:last-first+1},(_,i)=>first+i);
  const duplicate=selected.find(p=>importedPages.has(p));
  if(duplicate!==undefined){
   status.textContent='Page '+duplicate+' is already in this review. To read it again, reopen the PDF import rather than silently duplicating its text.';
   return;
  }
  const initial=review.ta.value;
  if(initial.trim()&&!global.confirm('Append OCR from '+labelFor(selected)+' to the current review? The existing CV remains unchanged until you explicitly import.'))return;
  if(!global.ledgerE26Pdf?.renderPage||!global.ledgerE25TrainedOCR?.recognize){
   status.textContent='The bundled PDF or trained OCR engine is unavailable. Keep using reviewed manual text.';
   return;
  }
  const degrees=Number(rotation.value);
  if(![0,90,180,270].includes(degrees)){status.textContent='Choose a valid image rotation.';return}
  stopRequested=false;changeBusy(true);
  const drafts=[],visuals=[];let totalPages=null;
  try{
   for(const number of selected){
    if(stopRequested||!panel.isConnected)throw Error('OCR batch stopped; review text was not changed');
    status.textContent='Reading scanned PDF page '+number+' ('+(drafts.length+1)+' of '+selected.length+'). No text is applied until the entire batch succeeds.';
    const raster=await global.ledgerE26Pdf.renderPage(file,number);
    totalPages=raster.pages;
    if(stopRequested||!panel.isConnected)throw Error('OCR batch stopped; review text was not changed');
    const scan=await orientedBlob(raster.image,degrees);
    if(stopRequested||!panel.isConnected)throw Error('OCR batch stopped; review text was not changed');
    const recognized=await global.ledgerE25TrainedOCR.recognize(scan);
    if(stopRequested||!panel.isConnected)throw Error('OCR batch stopped; review text was not changed');
    const text=String(recognized.text||'').trim();
    if(text.length<20)throw Error('Page '+number+' did not contain enough readable text; no batch text was added');
    drafts.push(text);
    visuals.push({page:number,blob:scan,degrees});
  }
  if(!panel.isConnected)return;
  if(stopRequested){status.textContent='OCR batch stopped; review text was not changed.';return}
  if(review.ta.value!==initial){
   status.textContent='You edited the review while OCR ran. The whole batch was discarded to preserve your changes.';
   return;
  }
  // Preserve exact original review text. Never place PDF page metadata inside CV text.
  const separator=initial?initial.endsWith('\n\n')?'':initial.endsWith('\n')?'\n':'\n\n':'';
  const candidate=initial+separator+drafts.join('\n\n');
  if(candidate.length>MAX_IMPORTED_TEXT){
   status.textContent='The combined review would exceed 120,000 characters. Nothing was appended or truncated.';
   return;
  }
  review.ta.value=candidate;
  review.ta.dispatchEvent(new Event('input',{bubbles:true}));
  guard.markMachineDraft();
  selected.forEach(number=>importedPages.add(number));
  retainVisuals(visuals);
  pagesDone.textContent='Pages added in this review: '+[...importedPages].sort((a,b)=>a-b).join(', ')+'.';
  status.textContent='OCR draft from '+labelFor(selected)+' of '+totalPages+' added to review. Compare every field against the PDF before importing.';
  review.ta.focus();
  }catch(err){
   if(panel.isConnected)status.textContent='Offline PDF OCR was not applied: '+String(err?.message||err)+'. Your review draft is unchanged.';
  }finally{
   if(panel.isConnected)changeBusy(false);
   busy=false;stopRequested=false;
  }
 }
 single.addEventListener('click',()=>run(Number(page.value),Number(page.value)));
 batch.addEventListener('click',()=>run(Number(from.value),Number(to.value)));
}
