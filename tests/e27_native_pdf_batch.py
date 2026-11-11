#!/usr/bin/env python3
"""E27 transactional PDF batch tests on a real local file:// browser.

All input PDFs are synthetic raster-only documents. These tests do not prove
OCR accuracy on real resumes or owner-device acceptance.
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import os
import re
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'dist/Ledger_CV_Studio_E27_Transactional_PDF_Batch_OCR.html'
MANIFEST=ROOT/'dist/E27_MANIFEST.json'
CHANNEL=os.environ.get('LEDGER_BROWSER_CHANNEL','chromium')
spec=importlib.util.spec_from_file_location('e27_original_e26_fixture',ROOT/'tests/e26_native_scanned_pdf.py')
fixture_module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture_module)

def check(value,label):
 assert value,label
 print('PASS:',label,flush=True)

def open_pdf(page,data):
 page.locator('button[data-action="go-upload"]').first.click()
 page.locator('#importFile').set_input_files({
  'name':'synthetic-raster-cv.pdf','mimeType':'application/pdf','buffer':data})
 panel=page.locator('.ledger-e2-import')
 panel.wait_for(timeout=30000)
 return panel

def main():
 manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
 check(hashlib.sha256(APP.read_bytes()).hexdigest()==manifest['appSha256'],
  'E27 exact built standalone HTML hash')
 data=fixture_module.fixture()
 errors,remote=[],[]
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,channel=CHANNEL)
  context=browser.new_context(accept_downloads=True)
  try:
   page=context.new_page()
   page.set_default_timeout(90000)
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('request',lambda r:remote.append(r.url) if r.url.startswith(('http://','https://')) else None)
   page.goto(APP.resolve().as_uri(),wait_until='load',timeout=120000)
   page.wait_for_function('Boolean(window.ledgerE26Pdf?.renderPage && window.ledgerE25TrainedOCR?.recognize)',timeout=45000)
   check(page.evaluate('location.protocol')=='file:','offline local file origin')
   baseline=page.evaluate('JSON.stringify(state.document)')
   panel=open_pdf(page,data)
   area=panel.locator('textarea')
   frame=page.locator('.ledger-e26-pdf-ocr')
   batch=page.get_by_role('button',name='Read a bounded batch of scanned PDF pages offline')
   stop=page.get_by_role('button',name='Stop PDF OCR after current page without modifying the review draft')
   batch.wait_for(timeout=15000)
   check(stop.is_disabled(),'stop control disabled when not scanning')
   page.locator('.ledger-e26-pdf-ocr input[type="number"]').nth(1).fill('1')
   page.locator('.ledger-e26-pdf-ocr input[type="number"]').nth(2).fill('6')
   batch.click()
   check('no more than five' in frame.locator('p[role="status"]').first.inner_text(),
      'range over five pages fails before PDF decoding')
   check(area.input_value().strip()=='','invalid range does not mutate review')
   page.locator('.ledger-e26-pdf-ocr input[type="number"]').nth(2).fill('2')

   # Instruct the first OCR call to wait so the stop control is deterministic.
   page.evaluate("""()=>{
    window.__e27Original=window.ledgerE25TrainedOCR;
    window.__e27Release=null;window.__e27Waiting=false;
    window.ledgerE25TrainedOCR={recognize:async(...args)=>{
      window.__e27Waiting=true;
      await new Promise(resolve=>{window.__e27Release=resolve});
      return window.__e27Original.recognize(...args);
    }};
   }""")
   batch.click()
   page.wait_for_function('window.__e27Waiting===true',timeout=30000)
   check(not stop.is_disabled(),'stop control enabled during OCR')
   stop.click()
   page.evaluate('window.__e27Release()')
   page.wait_for_function("""()=>document.querySelector('.ledger-e26-pdf-ocr p[role="status"]')
    ?.textContent.includes('not applied')""",timeout=60000)
   check(area.input_value()=='','stopped multi-page OCR commits zero partial text')
   check(page.evaluate('JSON.stringify(state.document)')==baseline,'stop leaves existing CV unchanged')

   # Failed second page must not insert text recognized on the first page.
   page.evaluate("""()=>{
    let n=0;window.ledgerE25TrainedOCR={recognize:(...args)=>{
      n++;if(n===2)throw Error('Synthetic second-page OCR failure');
      return window.__e27Original.recognize(...args);
    }};
   }""")
   batch.click()
   page.wait_for_function("""()=>document.querySelector('.ledger-e26-pdf-ocr p[role="status"]')
    ?.textContent.includes('Synthetic second-page OCR failure')""",timeout=60000)
   check(area.input_value()=='','failed page two rolls back the whole batch')
   check('No scanned pages added' in frame.inner_text(),'failed batch does not mark pages as imported')

   # Concurrent manual edits take precedence over an in-flight batch.
   page.evaluate("""()=>{
    window.__e27Waiting=false;
    let n=0;window.ledgerE25TrainedOCR={recognize:async(...args)=>{
      n++;
      if(n===1){window.__e27Waiting=true;await new Promise(resolve=>{window.__e27Release=resolve});}
      return window.__e27Original.recognize(...args);
    }};
   }""")
   batch.click()
   page.wait_for_function('window.__e27Waiting===true',timeout=30000)
   area.fill('MANUAL CONTENT MAY NOT BE OVERWRITTEN')
   page.evaluate('window.__e27Release()')
   page.wait_for_function("""()=>document.querySelector('.ledger-e26-pdf-ocr p[role="status"]')
    ?.textContent.includes('discarded')""",timeout=60000)
   check(area.input_value()=='MANUAL CONTENT MAY NOT BE OVERWRITTEN',
     'manual text edit wins against concurrent OCR')
   area.fill('')

   # Restore real bundled trained engine and recognize two actual PDF pages.
   page.evaluate('window.ledgerE25TrainedOCR=window.__e27Original')
   batch.click()
   page.wait_for_function("""()=>document.querySelector('.ledger-e26-pdf-ocr p[role="status"]')
    ?.textContent.includes('OCR draft from pages 1')""",timeout=90000)
   content=area.input_value().upper()
   check(all(token in content for token in ['JANE','DOE','ALICE','BROWN','2026','2027']),
     'real two-page trained OCR merges text in reading order')
   check(content.index('JANE')<content.index('ALICE'),'page order preserved')
   check('[SCANNED PDF PAGE' not in content,'PDF metadata not mixed into CV text')
   check('Pages added in this review: 1, 2.' in frame.inner_text(),
     'accessible page provenance displayed outside CV source text')
   check(page.evaluate('JSON.stringify(state.document)')==baseline,
     'completed batch does not automatically write CV')

   # Duplicate-page guard must not reimport page one through the single-page button.
   previous=area.input_value()
   page.get_by_role('button',name='Read selected scanned PDF page using bundled offline English OCR').click()
   check('already in this review' in frame.inner_text(),'duplicate page is rejected')
   check(area.input_value()==previous,'duplicate attempt leaves review text byte-identical')

   # The existing OCR acknowledgement still blocks unreviewed import.
   import_button=page.get_by_role('button',name='Import reviewed text into a new CV')
   import_button.click()
   check(page.locator('.ledger-ocr-verification [role="alert"]').is_visible(),
     'machine OCR text cannot bypass explicit verification gate')
   check(page.evaluate('JSON.stringify(state.document)')==baseline,
     'unacknowledged batch cannot change stored CV')
   page.get_by_role('checkbox',name='I checked all OCR text against the original image').check()
   panel.locator('.ledger-e12-import-option input').check()
   import_button.click()
   page.wait_for_function("state.screen==='editor'",timeout=30000)
   imported=page.evaluate("""()=>({
    first:state.document.personalInfo.firstName,
    last:state.document.personalInfo.lastName,
    sections:state.document.customSections||[]
   })""")
   check('JANE' in (imported['first']+' '+imported['last']).upper(),
      'approved OCR batch populates real structured CV name')
   check(any('JANE' in str(x.get('content','')).upper() and 'ALICE' in str(x.get('content','')).upper()
    for x in imported['sections']),'complete multi-page source preserved on request')
   page.reload(wait_until='load',timeout=60000)
   persisted=page.evaluate('()=>state.document.customSections||[]')
   check(any('JANE' in str(x.get('content','')).upper() and 'ALICE' in str(x.get('content','')).upper()
      for x in persisted),'explicitly imported pages survive actual browser reload')

   # Repeat legacy single-page acceptance in an isolated browser profile.
   # The current page is an editor after import/reload, not the home upload page.
   fresh=browser.new_context(accept_downloads=True)
   try:
    spare=fresh.new_page()
    spare.on('pageerror',lambda e:errors.append(str(e)))
    spare.on('request',lambda r:remote.append(r.url) if r.url.startswith(('http://','https://')) else None)
    spare.goto(APP.resolve().as_uri(),wait_until='load',timeout=120000)
    other_before=spare.evaluate('JSON.stringify(state.document)')
    second=open_pdf(spare,data)
    spare.get_by_role('button',name='Read selected scanned PDF page using bundled offline English OCR').click()
    spare.wait_for_function("""()=>document.querySelector('.ledger-e26-pdf-ocr p[role="status"]')
     ?.textContent.includes('OCR draft from page 1')""",timeout=90000)
    check('JANE' in second.locator('textarea').input_value().upper(),
      'original single-page PDF OCR action remains functional')
    spare.locator('[data-e2-close]').first.click()
    check(spare.evaluate('JSON.stringify(state.document)')==other_before,
      'canceling a single-page OCR review preserves its existing CV')
   finally:
    fresh.close()

   check(not remote,'no external HTTP(S) requests during full workflow')
   check(not errors,'no uncaught JavaScript exceptions')
   report={'status':'PASS','appSha256':manifest['appSha256'],'fileOrigin':True,
    'syntheticRasterPages':2,'cancellationAtomic':True,'failedPageAtomic':True,
    'concurrentEditSafe':True,'duplicateGuard':True,'approvalGate':True,
    'approvedImportReloaded':True,'externalHttpRequests':remote,
    'limitations':['Only clean synthetic English CV pages evaluated',
      'Cancellation is cooperative; an in-flight page finishes before stop',
      'Not real Windows 11 owner-device signoff, Safari/mobile or real document quality'],
    'release':'NO-GO'}
   (ROOT/'dist/E27_QA.json').write_text(json.dumps(report,indent=2)+'\n')
  finally:
   context.close();browser.close()
 print('E27 transactional multi-page offline PDF OCR tests PASS; production NO-GO.',flush=True)

if __name__=='__main__':
 main()
