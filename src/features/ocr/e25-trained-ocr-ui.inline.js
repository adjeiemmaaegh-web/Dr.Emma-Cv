
  // E25: optional rights-reviewed trained English OCR, kept independent of E18
  // experimental recognizer. Never auto-apply to a saved CV or upload a file.
  if(typeof global.ledgerE25TrainedOCR?.recognize==='function'){
   const trained=document.createElement('button');trained.type='button';
   trained.textContent='Try trained English OCR (offline · review required)';
   trained.setAttribute('aria-label','Try bundled trained offline English OCR; review all extracted text before importing');
   trained.onclick=async()=>{
    if(review.ta.value.trim()&&!global.confirm('Replace the current review draft with a new trained OCR draft? The saved CV is unchanged until you explicitly approve.'))return;
    const beforeText=review.ta.value,beforeTurn=turn;
    trained.disabled=true;ocrStatus.textContent='Running bundled trained English OCR in a local worker. No file is uploaded.';
    try{
     const result=await global.ledgerE25TrainedOCR.recognize(file,{rotation:beforeTurn});
     if(!review.panel.isConnected||!isCurrent())return;
     if(review.ta.value!==beforeText||turn!==beforeTurn){
      ocrStatus.textContent='The review text or rotation changed during OCR; no text was overwritten.';return;
     }
     if(result.text.trim().length<20){ocrStatus.textContent='Trained OCR did not recover enough readable text. Use manual transcription.';return;}
     review.ta.value=result.text.slice(0,MAX_IMPORTED_TEXT);
     review.ta.dispatchEvent(new Event('input',{bubbles:true}));
     ocrGuard.markMachineDraft();
     ocrStatus.textContent='Trained English OCR produced '+result.lines+' tentative lines. Check every name, date, employer, number and contact field against the original before import.';
     review.ta.focus();
    }catch(error){if(review.panel.isConnected)ocrStatus.textContent='Trained OCR unavailable: '+String(error.message||error)+'. Use manual transcription.';}
    finally{if(review.panel.isConnected)trained.disabled=false;}
   };
   toolbar.append(trained);
  }
