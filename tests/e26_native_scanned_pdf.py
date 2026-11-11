#!/usr/bin/env python3
"""Actual file:// raster-only PDF -> bundled trained English OCR, including UI consent.

Every fixture is generated here from synthetic test data. No actual applicant documents,
network providers, remote OCR, or persistent user browser profiles are accessed.
"""
from pathlib import Path
from io import BytesIO
import hashlib
import json
import os
import re
import tempfile

import fitz
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'dist/Ledger_CV_Studio_E26_Scanned_PDF_Offline_OCR.html'
MANIFEST=ROOT/'dist/E26_MANIFEST.json'
CHANNEL=os.environ.get('LEDGER_BROWSER_CHANNEL','chromium')

def check(ok, label):
    assert ok, label
    print('PASS:',label,flush=True)

def image(words):
    canvas=Image.new('RGB',(1320,540),'white')
    pen=ImageDraw.Draw(canvas)
    font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    if not Path(font_path).exists():
        font_path='C:/Windows/Fonts/arial.ttf'
    font=ImageFont.truetype(font_path,54)
    for i,line in enumerate(words):
        pen.text((100,70+150*i),line,fill='black',font=font)
    buf=BytesIO()
    canvas.save(buf,format='PNG')
    return buf.getvalue()

def fixture():
    pdf=fitz.open()
    samples=[
        ['JANE DOE','Operations Manager','PROJECT 2026'],
        ['ALICE BROWN','Quality Inspector','PROJECT 2027'],
    ]
    for rows in samples:
        page=pdf.new_page(width=900,height=420)
        page.insert_image(page.rect,stream=image(rows))
        check(page.get_text().strip()=='','synthetic PDF page is genuinely raster-only')
    content=pdf.tobytes(garbage=4,deflate=True)
    pdf.close()
    check(content.startswith(b'%PDF-'),'synthetic two-page PDF has correct format')
    return content

def main():
    check(APP.exists(),'one-file E26 development artifact exists')
    manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
    check(hashlib.sha256(APP.read_bytes()).hexdigest()==manifest['appSha256'],'exact E26 build identity')
    pdf=fixture()
    errors,external=[],[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,channel=CHANNEL)
        try:
            ctx=browser.new_context(accept_downloads=True)
            page=ctx.new_page()
            page.set_default_timeout(90000)
            page.on('pageerror',lambda e: errors.append(str(e)))
            page.on('request',lambda r: external.append(r.url) if r.url.startswith(('http://','https://')) else None)
            page.goto(APP.resolve().as_uri(),wait_until='load',timeout=120000)
            page.wait_for_function('Boolean(window.ledgerE26Pdfjs?.getDocument && window.ledgerE26Pdf?.renderPage && window.ledgerE25TrainedOCR?.recognize)',timeout=120000)
            check(page.evaluate('location.protocol')=='file:','real standalone file:// origin')
            check(bool(page.locator('#app').inner_text().strip()),'CV application booted')

            probe=page.evaluate("""async bytes=>{
               const file=new File([new Uint8Array(bytes)],'synthetic-2page.pdf',{type:'application/pdf'});
               const results=[];
               for(const i of [1,2]){
                  const raster=await ledgerE26Pdf.renderPage(file,i);
                  const recognized=await ledgerE25TrainedOCR.recognize(raster.image);
                  results.push({page:i,text:recognized.text,pages:raster.pages,width:raster.width,height:raster.height,engine:recognized.engine});
               }
               let invalid='';
               try{await ledgerE26Pdf.renderPage(file,3)}catch(e){invalid=String(e.message)}
               let notPdf='';
               try{await ledgerE26Pdf.renderPage(new File(['NOT PDF'],'fake.pdf',{type:'application/pdf'}),1)}catch(e){notPdf=String(e.message)}
               return {results,invalid,notPdf};
            }""",list(pdf))
            check(len(probe['results'])==2,'both raster-only pages processed independently')
            checks=[('jane','operations','2026'),('alice','quality','2027')]
            for i,result in enumerate(probe['results']):
                text=re.sub(r'\s+',' ',result['text']).lower()
                check(all(word in text for word in checks[i]),'page '+str(i+1)+' trained OCR recovered synthetic details')
                check(result['pages']==2 and result['engine']=='trained-offline-tesseract-wasm-0.11.0','trained local engine confirmed')
                check(result['width']*result['height']<=1454000,'bounded raster image memory')
            check('outside' in probe['invalid'],'invalid page number rejected')
            check('PDF header' in probe['notPdf'],'invalid PDF file rejected before parsing')

            page.locator('button[data-action="go-upload"]').first.click()
            original=page.evaluate('JSON.stringify(state.document)')
            page.locator('#importFile').set_input_files({
                'name':'synthetic-2page.pdf','mimeType':'application/pdf','buffer':pdf
            })
            panel=page.locator('.ledger-e2-import')
            panel.wait_for(timeout=30000)
            button=page.get_by_role('button',name='Read selected scanned PDF page using bundled offline English OCR')
            button.wait_for(timeout=30000)
            check(page.locator('.ledger-e26-pdf-ocr').count()==1,'scanned PDF option exposed in local review dialog')
            check(page.evaluate('JSON.stringify(state.document)')==original,'opening PDF review does not change existing CV')
            button.click()
            page.wait_for_function("""()=>document.querySelector('.ledger-e26-pdf-ocr p[role="status"]')?.textContent.includes('OCR draft from page 1')""",timeout=90000)
            content=panel.locator('textarea').input_value()
            check('JANE' in content.upper() and '2026' in content,'PDF OCR text written to editable review, not CV')
            check(page.evaluate('JSON.stringify(state.document)')==original,'OCR extraction does not commit document')
            checkbox=page.get_by_role('checkbox',name='I checked all OCR text against the original image')
            check(checkbox.is_visible() and not checkbox.is_checked(),'OCR verification gate visible and unchecked')
            page.get_by_role('button',name='Import reviewed text into a new CV').click()
            check(page.locator('.ledger-ocr-verification [role="alert"]').is_visible(),
                  'unacknowledged PDF OCR import blocked')
            check(page.evaluate('JSON.stringify(state.document)')==original,
                  'blocked PDF OCR import never modifies CV')
            checkbox.check()
            check(checkbox.is_checked(),'explicit acknowledgement may be given')
            page.locator('[data-e2-close]').first.click()
            check(page.evaluate('JSON.stringify(state.document)')==original,
                  'cancel after trained PDF OCR leaves original CV intact')
            check(not external,'no external HTTP(S) requests during PDF decode and OCR')
            check(not errors,'no uncaught JavaScript errors')
            ctx.close()
        finally:
            browser.close()
    output={'status':'PASS','sourceProtocol':'file://','engine':'trained-offline-tesseract-wasm-0.11.0',
     'appSha256':manifest['appSha256'],'syntheticPages':2,'pdfWasRasterOnly':True,
     'pageCountCheck':True,'ocrReviewConsent':True,'networkRequests':external,
     'limitations':['Clean 2-page synthetic English scanned-PDF only',
       'Real-world scan/layout accuracy not scored','No physical owner-device signoff',
       'No Arabic, complex Word, mobile or screen reader validation'],
     'release':'NO-GO'}
    (ROOT/'dist/E26_QA.json').write_text(json.dumps(output,indent=2)+'\n',encoding='utf-8')
    print('E26 scanned PDF true-file trained OCR and review-gate PASS; release NO-GO.',flush=True)

if __name__=='__main__':
    main()
