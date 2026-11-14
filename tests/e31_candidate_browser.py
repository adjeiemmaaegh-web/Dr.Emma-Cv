#!/usr/bin/env python3
"""E31 candidate real HTTP-origin keyboard/mobile smoke; synthetic profile only."""
from pathlib import Path
from functools import partial
import hashlib,http.server,json,threading,os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'site'
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
def main():
 manifest=json.loads((SITE/'site-integrity.json').read_text())
 assert 'E31' in manifest['version']
 assert hashlib.sha256((SITE/'index.html').read_bytes()).hexdigest()==manifest['hostedHtmlSha256']
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(SITE)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 errors=[]
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=True,channel=os.environ.get('LEDGER_BROWSER_CHANNEL','chromium'))
   try:
    for width in (320,390,768,1440):
     ctx=browser.new_context(viewport={'width':width,'height':800},reduced_motion='reduce')
     page=ctx.new_page()
     page.on('pageerror',lambda error:errors.append(str(error)))
     page.goto('http://127.0.0.1:'+str(server.server_port)+'/',wait_until='load',timeout=120000)
     toggle=page.locator('.e30-tools-toggle')
     toggle.wait_for()
     assert page.locator('.e30-tools-dock').get_attribute('data-e31-keyboard')=='ready'
     toggle.click()
     panel=page.locator('.e30-tools-content')
     assert panel.is_visible()
     assert panel.get_attribute('role')=='region'
     assert panel.get_attribute('aria-labelledby')=='e31-tools-heading'
     page.keyboard.press('Escape')
     assert panel.is_hidden()
     toggle.click()
     page.locator('.e30-tools-heading').focus()
     page.evaluate('document.querySelector(".e30-tools-toggle").focus()')
     page.keyboard.press('Tab')
     page.evaluate('document.querySelector("body").focus()')
     page.evaluate('document.activeElement.blur()')
     page.wait_for_timeout(100)
     assert panel.is_hidden(),'Focus exit must collapse E31 panel'
     assert toggle.get_attribute('aria-expanded')=='false'
     assert page.evaluate('document.documentElement.scrollWidth-innerWidth')<=1
     assert page.locator('#app').is_visible()
     ctx.close()
   finally:browser.close()
 finally:server.shutdown();server.server_close()
 assert not errors,errors
 print('PASS E31 candidate keyboard and viewport smoke; synthetic only')
if __name__=='__main__':main()
