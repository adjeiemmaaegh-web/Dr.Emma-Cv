/* E26: scanned PDF pages receive exactly the same review and explicit OCR
 * acknowledgement as photographed CVs. An OCR draft never commits automatically.
 * PDF.js is bounded and entirely local; the existing text-PDF importer remains.
 */
function e26AttachScannedPdfReview(review,file){
 const panel=review.panel;
 const frame=document.createElement('section');frame.className='ledger-e26-pdf-ocr';
 frame.setAttribute('aria-label','Optional offline OCR for scanned PDF pages');
 const info=document.createElement('p');
 info.textContent='Scanned or image-only PDF? Pick one page and run offline English OCR. Any extracted text stays in this review box until you explicitly approve the new CV. Complex layouts and other languages may be misread.';
 const row=document.createElement('div');row.className='ledger-e9-image-toolbar';
 const label=document.createElement('label');label.textContent='PDF page (1–50) ';
 const page=document.createElement('input');page.type='number';page.min='1';page.max='50';page.step='1';page.value='1';page.style.width='5rem';
 label.append(page);
 const button=document.createElement('button');button.type='button';button.textContent='Read selected PDF page offline';
 button.setAttribute('aria-label','Read selected scanned PDF page using bundled offline English OCR');
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 status.textContent='PDF remains on your device. Text recognition requires a readable image and manual verification.';
 row.append(label,button);frame.append(info,row,status);
 const guard=ledgerInstallOCRReviewGuard(review,frame);
 const target=panel.querySelector('.ledger-e2-import');
 if(target)target.prepend(frame);else panel.append(frame);
 button.addEventListener('click',async()=>{
  if(!panel.isConnected)return;
  const num=Number(page.value);
  if(!Number.isInteger(num)||num<1||num>50){status.textContent='Choose a whole-number page from 1 to 50.';return}
  const existing=review.ta.value;
  if(existing.trim()&&!global.confirm('Append experimental OCR from PDF page '+num+' to the current review text? The saved CV will not change until you approve.'))return;
  if(!global.ledgerE26Pdf?.renderPage||!global.ledgerE25TrainedOCR?.recognize){
   status.textContent='The bundled PDF/OCR engine is not ready. Reopen this file and retry.';return;
  }
  button.disabled=true;page.disabled=true;status.textContent='Rendering selected PDF page locally and recognizing English text…';
  try{
   const raster=await global.ledgerE26Pdf.renderPage(file,num);
   const draft=await global.ledgerE25TrainedOCR.recognize(raster.image);
   if(!panel.isConnected)return;
   if(review.ta.value!==existing){status.textContent='Review text changed during recognition. The new draft was discarded to avoid overwriting edits.';return}
   if(draft.text.trim().length<20){status.textContent='Not enough readable text was detected. Use manual transcription or choose another page.';return}
   const prefix=existing.trim()?existing.trim()+'\n\n':'';
   // Keep audit metadata in the status, NEVER in editable CV source text.
   // Silently truncating either the original review or OCR draft would lose data.
   const text=prefix+draft.text.trim();
   if(text.length>MAX_IMPORTED_TEXT){status.textContent='The existing review plus OCR output exceeds the 120,000-character limit. Nothing was changed.';return}
   review.ta.value=text;review.ta.dispatchEvent(new Event('input',{bubbles:true}));
   guard.markMachineDraft();
   status.textContent='OCR draft from page '+num+' of '+raster.pages+' added to review. Confirm every field against the PDF before importing.';
   review.ta.focus();
  }catch(err){if(panel.isConnected)status.textContent='Offline PDF OCR unavailable: '+String(err.message||err)+'. Use reviewed manual text instead.'}
  finally{if(panel.isConnected){button.disabled=false;page.disabled=false}}
 });
}