#!/usr/bin/env python3
"""E25 real-file app workflow: OCR is review-only, and cannot silently overwrite CV.

Uses a fresh profile with synthetic image only. Browser/OS-specific acceptance remains open.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import importlib.util

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'dist/Ledger_CV_Studio_E25_Trained_Offline_OCR.html'
source=ROOT/'tests/e25_native_trained_ocr.py'
spec=importlib.util.spec_from_file_location('ledger_e25_fixture',source)
fixture_module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture_module)

def check(ok,msg):
    assert ok,msg
    print('PASS:',msg,flush=True)

def main():
    remote,errors=[],[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True)
        context=browser.new_context(accept_downloads=True)
        try:
            page=context.new_page()
            page.set_default_timeout(120000)
            page.on('pageerror',lambda e: errors.append(str(e)))
            page.on('request',lambda r:remote.append(r.url) if r.url.startswith(('https://','http://')) else None)
            page.goto(APP.resolve().as_uri(),wait_until='load',timeout=60000)
            page.wait_for_function('window.ledgerE25TrainedOCR?.available===true',timeout=30000)
            check(bool(page.locator('#app').inner_text().strip()),'application screen rendered')
            page.locator('button[data-action="go-upload"]').first.click()
            page.locator('#importFile').set_input_files({
                'name':'synthetic-image-cv.png','mimeType':'image/png',
                'buffer':bytes(fixture_module.fixture())
            })
            panel=page.locator('.ledger-e2-import')
            panel.wait_for(timeout=20000)
            trained=page.get_by_role('button',name='Try bundled trained offline English OCR; review all extracted text before importing')
            trained.wait_for(timeout=30000)
            prior=page.evaluate('JSON.stringify(state.document)')
            check(not page.locator('.ledger-ocr-verification').is_visible(),
                  'OCR acknowledgement is hidden before recognition')
            trained.click()
            status=page.locator('.ledger-e9-image-review p[role="status"]').first
            page.wait_for_function("""() => [...document.querySelectorAll('.ledger-e9-image-review p[role="status"]')]
              .some(x=>x.textContent.includes('Trained English OCR produced'))""",timeout=90000)
            recognized=panel.locator('textarea').input_value()
            check('JOHN SMITH' in recognized.upper() and '2026' in recognized,
                  'trained OCR populates only review textarea')
            check(page.evaluate('JSON.stringify(state.document)')==prior,
                  'recognition does not change CV data')
            check(page.locator('.ledger-ocr-verification').is_visible(),
                  'machine-generated text triggers explicit verification group')
            import_button=page.get_by_role('button',name='Import reviewed text into a new CV')
            import_button.click()
            alert=page.locator('.ledger-ocr-verification [role="alert"]')
            check(alert.is_visible(),'unacknowledged import blocked')
            check(page.evaluate('JSON.stringify(state.document)')==prior,
                  'blocked import leaves previously saved CV intact')
            acknowledgement=page.get_by_role('checkbox',name='I checked all OCR text against the original image')
            acknowledgement.check()
            check(acknowledgement.is_checked(),'explicit user OCR acknowledgment available')
            # Do not accept an imported document in this synthetic safety test.
            cancel=page.locator('[data-e2-close]').first
            cancel.click()
            check(page.evaluate('JSON.stringify(state.document)')==prior,
                  'cancel after OCR and acknowledgment leaves existing CV unchanged')
            check(not remote,'no HTTP(S) traffic in image import or trained OCR')
            check(not errors,'no uncaught browser JavaScript errors')
        finally:
            context.close()
            browser.close()
    print('E25 review-only trained OCR UI regression PASS; production remains NO-GO.',flush=True)

if __name__=='__main__':
    main()
