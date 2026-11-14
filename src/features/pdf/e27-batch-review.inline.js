/* E27: transactional, user-initiated multi-page scanned PDF OCR in the E2 review.
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
 frame.append(intro,row,batchRow,status,pagesDone);
 const guard=ledgerInstallOCRReviewGuard(review,frame);
 const target=panel.querySelector('.ledger-e2-import');
 if(target)target.prepend(frame);else panel.append(frame);
 let busy=false,stopRequested=false;
 const importedPages=new Set();
 const controls=[single,batch,page,from,to];
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
  stopRequested=false;changeBusy(true);
  const drafts=[];let totalPages=null;
  try{
   for(const number of selected){
    if(stopRequested||!panel.isConnected)throw Error('OCR batch stopped; review text was not changed');
    status.textContent='Reading scanned PDF page '+number+' ('+(drafts.length+1)+' of '+selected.length+'). No text is applied until the entire batch succeeds.';
    const raster=await global.ledgerE26Pdf.renderPage(file,number);
    totalPages=raster.pages;
    if(stopRequested||!panel.isConnected)throw Error('OCR batch stopped; review text was not changed');
    const recognized=await global.ledgerE25TrainedOCR.recognize(raster.image);
    if(stopRequested||!panel.isConnected)throw Error('OCR batch stopped; review text was not changed');
    const text=String(recognized.text||'').trim();
    if(text.length<20)throw Error('Page '+number+' did not contain enough readable text; no batch text was added');
    drafts.push(text);
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
