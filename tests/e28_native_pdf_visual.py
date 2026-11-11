#!/usr/bin/env python3
"""E28 real file:// scanned-PDF visual verification and oriented English OCR.

Uses deliberately synthetic CV data only. It tests a genuine raster-only sideways
PDF, corrects its bitmap before recognition, compares the *same* oriented bitmap
in the review UI, and ensures Blob URLs disappear when the dialog closes.
"""
from io import BytesIO
from pathlib import Path
import hashlib
import importlib.util
import json
import os

import fitz
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'dist/Ledger_CV_Studio_E28_Offline_Visual_PDF_OCR.html'
MANIFEST=ROOT/'dist/E28_MANIFEST.json'
CHANNEL=os.environ.get('LEDGER_BROWSER_CHANNEL','chromium')
spec=importlib.util.spec_from_file_location('e28_fixture',ROOT/'tests/e26_native_scanned_pdf.py')
fixture_module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture_module)

def check(condition,description):
 assert condition,description
 print('PASS:',description,flush=True)

def sideways_pdf():
 raw=fixture_module.image([
   'JANE SMITH',
   'Operations Manager',
   'PROJECT 2026'
 ])
 normal=Image.open(BytesIO(raw))
 sideways=normal.transpose(Image.Transpose.ROTATE_90)
 out=BytesIO()
 sideways.save(out,format='PNG')
 document=fitz.open()
 page=document.new_page(width=sideways.width,height=sideways.height)
 page.insert_image(page.rect,stream=out.getvalue())
 check(not page.get_text().strip(),'sideways PDF has no selectable text')
 data=document.tobytes(garbage=4,deflate=True)
 document.close()
 return data

def main():
 check(APP.exists(),'E28 standalone HTML exists')
 manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
 check(hashlib.sha256(APP.read_bytes()).hexdigest()==manifest['appSha256'],
    'E28 standalone exact SHA-256 identity')
 source=sideways_pdf()
 network,errors=[],[]
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,channel=CHANNEL)
  context=browser.new_context(accept_downloads=True)
  try:
   page=context.new_page()
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('request',lambda r:network.append(r.url) if r.url.startswith(('https://','http://')) else None)
   page.set_default_timeout(90000)
   page.goto(APP.resolve().as_uri(),wait_until='load',timeout=120000)
   page.wait_for_function('Boolean(window.ledgerE26Pdf?.renderPage && window.ledgerE25TrainedOCR?.recognize)',timeout=45000)
   check(page.evaluate('location.protocol')=='file:','genuine local file origin')
   original=page.evaluate('JSON.stringify(state.document)')
   page.evaluate("""()=>{
    window.__e28Revoked=[];
    const original=URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL=(url)=>{window.__e28Revoked.push(url);original(url)};
   }""")
   page.locator('button[data-action="go-upload"]').first.click()
   page.locator('#importFile').set_input_files({
      'name':'synthetic-sideways-2026.pdf','mimeType':'application/pdf','buffer':source
   })
   panel=page.locator('.ledger-e2-import')
   panel.wait_for(timeout=30000)
   frame=page.locator('.ledger-e26-pdf-ocr')
   rotation=frame.get_by_role('combobox',name='PDF scan rotation before offline OCR')
   check(rotation.input_value()=='0','PDF recognition rotation starts as scanned')
   viewer=page.locator('.ledger-e28-pdf-reference')
   check(viewer.is_hidden(),'unreviewed PDF page preview is not shown')
   rotation.select_option('90')
   page.get_by_role('button',name='Read selected scanned PDF page using bundled offline English OCR').click()
   page.wait_for_function("""()=>document.querySelector('.ledger-e26-pdf-ocr p[role="status"]')
     ?.textContent.includes('OCR draft from page 1')""",timeout=90000)
   text=panel.locator('textarea').input_value().upper()
   check(all(token in text for token in ['JANE','SMITH','OPERATIONS','2026']),
     'rotated synthetic page is recognized by real trained English OCR')
   check(page.evaluate('JSON.stringify(state.document)')==original,
     'trained recognition does not silently change the CV')
   check(viewer.is_visible(),'visual PDF page reference shown after successful OCR')
   reference=viewer.locator('img')
   reference.wait_for()
   page.wait_for_function("""()=>{const image=document.querySelector('.ledger-e28-pdf-reference img');
      return !!image && image.complete && image.naturalWidth>0}""",timeout=15000)
   preview=reference.evaluate("""img=>({
      src:img.src,alt:img.alt,ready:img.complete,width:img.naturalWidth,
      height:img.naturalHeight
   })""")
   check(preview['src'].startswith('blob:') and preview['ready'] and preview['width']>0,
     'review displays a real locally rendered PDF image via Blob URL')
   check(preview['width']>preview['height'] and 'rotated 90' in preview['alt'],
     'visual reference is the same landscape-oriented bitmap recognized by OCR')
   check('Page 1 — rotated 90°' in viewer.inner_text(),
     'reference records corrected orientation without changing CV source text')
   check('SCANNED PDF PAGE' not in text,'PDF page metadata excluded from applicant data')
   viewer.get_by_role('button',name='Zoom image in').click()
   check('zoom 125%' in viewer.inner_text(),'reference supports accessible incremental zoom')
   viewer.get_by_role('button',name='Reset image zoom').click()
   check('zoom 100%' in viewer.inner_text(),'reference zoom can be reset')
   picker=viewer.get_by_role('combobox',name='Select scanned PDF page image to verify')
   check(picker.locator('option').count()==1,'only one successfully OCRed page is retained')
   check(page.get_by_role('checkbox',name='I checked all OCR text against the original image').is_visible(),
     'OCR source comparison still requires explicit review acknowledgment')
   page.get_by_role('button',name='Import reviewed text into a new CV').click()
   check(page.locator('.ledger-ocr-verification [role="alert"]').is_visible(),
     'image comparison does not bypass the OCR review gate')
   check(page.evaluate('JSON.stringify(state.document)')==original,
     'blocked OCR import leaves CV byte-identical')
   page.locator('[data-e2-close]').first.click()
   page.wait_for_function("""url=>Array.isArray(window.__e28Revoked) &&
      window.__e28Revoked.includes(url)""",arg=preview['src'],timeout=10000)
   check(page.evaluate('JSON.stringify(state.document)')==original,
     'canceling visual reference leaves current CV unchanged')
   check(not network,'PDF decode, rotated OCR and visual reference used zero HTTP(S) requests')
   check(not errors,'no uncaught JavaScript page errors')
   report={'status':'PASS','appSha256':manifest['appSha256'],'protocol':'file://',
    'fixture':'raster-only synthetic sideways English CV page','rotationDegrees':90,
    'trainedOCRCorrectedSidewaysScan':True,'identicalBitmapPresentedForHumanReview':True,
    'blobUrlRevokedOnCancel':True,'originalCVPreserved':True,
    'priorManualAcknowledgementGate':True,'externalRequests':network,
    'limits':['No real noisy/rotated customer scan corpus','Owner-device acceptance pending',
      'Physical Windows 11 and 8GB memory not verified','Arabic/RTL OCR unverified',
      'No accessibility or screen reader signoff'],'production':'NO-GO'}
   (ROOT/'dist/E28_QA.json').write_text(json.dumps(report,indent=2)+'\n')
  finally:
   context.close()
   browser.close()
 print('E28 true offline bitmap-rotation + visual-verification QA PASS; production NO-GO',flush=True)

if __name__=='__main__':
 main()
