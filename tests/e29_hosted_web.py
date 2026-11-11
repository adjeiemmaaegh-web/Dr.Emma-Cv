#!/usr/bin/env python3
"""Real HTTP-origin / service worker / offline reload QA on the exact E29
Vercel static site output. Uses synthetic data, no actual user profile.
"""
import hashlib
import http.server
import importlib.util
import json
import os
from pathlib import Path
import threading
from functools import partial
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'site'
CHANNEL=os.environ.get('LEDGER_BROWSER_CHANNEL','chromium')

def check(value,label):
 assert value,label
 print('PASS:',label,flush=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

def main():
 integrity=json.loads((SITE/'site-integrity.json').read_text(encoding='utf-8'))
 html=(SITE/'index.html').read_bytes()
 check(hashlib.sha256(html).hexdigest()==integrity['hostedHtmlSha256'],
   'exact published web HTML checksum verified')
 check(integrity['sourceE28Sha256']=='73ca54189b8db116c5f9760f9372dc2082a836de5dfcbdea43c03eff436dcbd7',
   'verified E28 application remains frozen')
 for filename in ['sw.js','site.webmanifest','favicon.svg','THIRD_PARTY_NOTICES.txt']:
  check((SITE/filename).is_file(),'published static asset '+filename)
 m=json.loads((SITE/'site.webmanifest').read_text(encoding='utf-8'))
 check(m['start_url']=='/' and m['display']=='standalone','installable app metadata')
 config=json.loads((ROOT/'vercel.json').read_text(encoding='utf-8'))
 check(config['outputDirectory']=='site' and config['buildCommand']=='node tools/build-e29-vercel.mjs',
   'Vercel is configured to build verified static distribution')
 spec=importlib.util.spec_from_file_location('synthetic_e29_image',ROOT/'tests/e26_native_scanned_pdf.py')
 fixture=importlib.util.module_from_spec(spec)
 spec.loader.exec_module(fixture)
 picture=fixture.image(['JANE SMITH','Operations Manager','PROJECT 2026'])
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(SITE)))
 thread=threading.Thread(target=server.serve_forever,daemon=True)
 thread.start()
 address='http://127.0.0.1:'+str(server.server_port)+'/'
 network,errors=[],[]
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=True,channel=CHANNEL)
   context=browser.new_context(accept_downloads=True)
   try:
    page=context.new_page()
    page.set_default_timeout(90000)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:network.append(r.url) if
      r.url.startswith(('https://','http://')) and not r.url.startswith(address) else None)
    page.goto(address,wait_until='load',timeout=120000)
    check(page.title().startswith('Ledger CV Studio'),'hosted application document title')
    check(page.locator('#app').is_visible(),'real CV application boots from HTTP origin')
    check(page.evaluate('location.protocol')=='http:','real local hosted HTTP environment')
    check(page.evaluate('Boolean(window.ledgerE25TrainedOCR?.recognize)'),
      'trained English OCR API available without remote model')
    check(page.evaluate('Boolean(window.ledgerE26Pdf?.renderPage)'),
      'bundled PDF rasterizer is present over HTTP')
    check(not page.locator('script[src]').count(),'application retains no external scripts')
    page.evaluate("""()=>localStorage.setItem('ledger_e29_synthetic_persistence_check','synthetic-test-only')""")
    page.reload(wait_until='load',timeout=90000)
    check(page.evaluate("localStorage.getItem('ledger_e29_synthetic_persistence_check')")=='synthetic-test-only',
      'local browser storage persists across website navigation')
    check(bool(page.locator('#app').inner_text().strip()),'app reboots with persistent browser data')
    # Actual WebAssembly trained recognition on hosted origin, not file://.
    recognized=page.evaluate("""async arr=>{
      const data=new Uint8Array(arr);
      const picture=new File([data],'synthetic.png',{type:'image/png'});
      const result=await window.ledgerE25TrainedOCR.recognize(picture);
      return {engine:result.engine,text:result.text};
    }""",list(picture))
    normalized=recognized['text'].upper()
    check(all(token in normalized for token in ['JANE','SMITH','OPERATIONS','2026']),
      'genuine bundled trained English OCR works on hosted origin')
    check(recognized['engine']=='trained-offline-tesseract-wasm-0.11.0',
      'trained wasm OCR used, not heuristic fallback')
    # Loopback HTTP is a secure context for service workers.
    page.wait_for_function("""async ()=>{
      if(!('serviceWorker' in navigator))return false;
      const registration=await navigator.serviceWorker.ready;
      return !!registration && !!(await caches.keys()).find(x=>x.startsWith('ledger-e29-'));
    }""",timeout=25000)
    check(True,'service worker registered and created a versioned static shell cache')
    # Once cached, simulate complete network outage and reload the *website*.
    context.set_offline(True)
    page.reload(wait_until='load',timeout=90000)
    check(page.locator('#app').is_visible(),'installed website renders during offline reload')
    check(page.evaluate("localStorage.getItem('ledger_e29_synthetic_persistence_check')")=='synthetic-test-only',
      'offline reload preserves device-local browser storage')
    check(page.evaluate('Boolean(window.ledgerE25TrainedOCR?.recognize)'),
      'trained offline OCR engine bundled after offline reload')
    context.set_offline(False)
    check(not network,'no outbound HTTP(S) requests during hosted app, OCR and offline reload')
    check(not errors,'no uncaught JavaScript errors on hosted website')
    report={
      'status':'PASS','hostedHtmlSha256':integrity['hostedHtmlSha256'],
      'sourceE28Sha256':integrity['sourceE28Sha256'],
      'hostedHTTP':True,'trainedOCROverHTTP':True,
      'browserStoragePersistence':True,'offlineAfterFirstVisit':True,
      'outboundNetworkRequests':network,'jsErrors':errors,
      'scope':'synthetic CI browser only — NOT production/device acceptance'
    }
    (ROOT/'site/E29_QA.json').write_text(json.dumps(report,indent=2)+'\n')
   finally:
    context.close()
    browser.close()
 finally:
  server.shutdown();server.server_close()
 print('E29 hosted-first-use and post-cache offline browser QA PASS',flush=True)

if __name__=='__main__':
 main()
