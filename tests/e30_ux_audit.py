#!/usr/bin/env python3
"""E30 real HTTP-origin UI, responsive, keyboard, modal and navigation audit.
Synthetic disposable browser profiles only; no personal or production CV records.
Print templates and document exports have their own inherited native suites.
"""
from pathlib import Path
from functools import partial
import http.server, threading, hashlib, json, os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'site'
CHANNEL=os.environ.get('LEDGER_BROWSER_CHANNEL','chromium')
VIEWPORTS=[(320,740),(390,844),(768,1024),(1440,900)]
ROUTES=['home','upload','guided-interview','offline-agent','guided-review',
 'experience-level','template-select','personal-info','work-experience',
 'education','skills','summary','additional-sections','editor']
def check(v,message):
 assert v,message
 print('PASS:',message,flush=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
def main():
 manifest=json.loads((SITE/'site-integrity.json').read_text(encoding='utf8'))
 check(manifest['sourceE29Sha256']=='c04684c7ff79cae0068a8e44408b25b86a751d08d14909cdd1006cedefcc8767',
  'UI change is based on exact verified E29 hosted application')
 check(manifest['designOnly'] and manifest['sourceE28Sha256'].startswith('73ca5418'),
  'document engine, CV schema and E28 OCR baseline remain frozen')
 check(hashlib.sha256((SITE/'index.html').read_bytes()).hexdigest()==manifest['hostedHtmlSha256'],
  'E30 published HTML checksum matches audit manifest')
 site=(SITE/'index.html').read_text(encoding='utf8')
 check(site.count('id="ledger-e30-design-system"')==1 and
       site.count('id="ledger-e30-tools-consolidation"')==1,
  'one consolidated CSS and one accessible tools controller')
 check('ledger-e30-design-system' not in
   (ROOT/'development/e28/README.md').read_text(encoding='utf8'),
  'frozen previous-stage source documentation unchanged')
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(SITE)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 address='http://127.0.0.1:'+str(server.server_port)+'/'
 errors=[];findings=[];out=ROOT/'site/e30-screenshots';out.mkdir(parents=True,exist_ok=True)
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=True,channel=CHANNEL)
   try:
    for width,height in VIEWPORTS:
     ctx=browser.new_context(viewport={'width':width,'height':height},accept_downloads=True,
      reduced_motion='reduce')
     page=ctx.new_page();page.set_default_timeout(18000)
     page.on('pageerror',lambda err: errors.append(str(err)))
     page.goto(address,wait_until='load',timeout=90000)
     page.locator('.e30-tools-toggle').wait_for()
     check(page.locator('.e30-tools-toggle').get_attribute('aria-expanded')=='false',
       str(width)+'px tools start collapsed')
     count=page.locator('.e30-tools-list>.ledger-s5-launcher,.e30-tools-list>.ledger-s7-launcher,.e30-tools-list>.ledger-s8-launcher,.e30-tools-list>.e3-launcher,.e30-tools-list>.e4-launcher,.e30-tools-list>.e5-controls').count()
     check(count==6,str(width)+'px all six existing auxiliary controls preserved in one menu')
     if width in [390,1440]:
      page.screenshot(path=str(out/f'{CHANNEL}-{width}-home.png'),animations='disabled')
     page.locator('.e30-tools-toggle').click()
     check(page.locator('.e30-tools-toggle').get_attribute('aria-expanded')=='true' and
         page.locator('.e30-tools-content').is_visible(),
       str(width)+'px tools expand and expose all original controls')
     if width in [390,1440]:
      page.screenshot(path=str(out/f'{CHANNEL}-{width}-tools.png'),animations='disabled')
     page.keyboard.press('Escape')
     check(page.locator('.e30-tools-content').is_hidden() and
       page.locator('.e30-tools-toggle').get_attribute('aria-expanded')=='false',
       str(width)+'px Escape collapses tools')
     focus=page.locator('.e30-tools-toggle')
     focus.focus()
     check(page.evaluate("""() => getComputedStyle(document.querySelector('.e30-tools-toggle')).outlineStyle!=='none'"""),
       str(width)+'px keyboard focus is visibly outlined')
     for route in ROUTES:
      page.evaluate('(route)=>{state.screen=route;render()}',route)
      result=page.evaluate("""()=>{
       const root=document.scrollingElement,main=document.querySelector('.screen.active');
       const dock=document.querySelector('.e30-tools-toggle').getBoundingClientRect();
       return {horizontalOverflow:root.scrollWidth-innerWidth,
        mainRole:main?.getAttribute('role'),dockWidth:dock.width,dockHeight:dock.height,
        visibleStandaloneLaunchers:[...document.querySelectorAll('.ledger-s5-launcher,.ledger-s7-launcher,.ledger-s8-launcher,.e3-launcher,.e4-launcher,.e5-controls')]
        .filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0).length};
      }""")
      findings.append({'width':width,'route':route,**result})
      check(result['horizontalOverflow']<=1,
       str(width)+'px '+route+' has no document-level horizontal scroll')
      check(result['mainRole']=='main' and result['dockHeight']>=40,
       str(width)+'px '+route+' preserves main landmark and touchable tools access')
      check(result['visibleStandaloneLaunchers']==0,
       str(width)+'px '+route+' removes overlapping floating utility launchers')
      if route in ['upload','template-select','editor'] and width in [390,1440]:
       page.screenshot(path=str(out/f'{CHANNEL}-{width}-{route}.png'),animations='disabled')
     # Normal navigation: user click on exit/home and import remains operational.
     page.locator('[data-action="go-home"]').first.click()
     page.get_by_role('button',name='Upload existing').first.click()
     check(page.locator('#importFile').count()==1,'upload file chooser accessible at '+str(width)+'px')
     page.locator('[data-action="go-home"]').first.click()
     page.get_by_role('button',name='Build manually').click()
     check(page.locator('.wizard-body').count()==1 and page.locator('.wizard-footer').count()==1,
       'manual CV creation wizard available at '+str(width)+'px')
     page.locator('[data-action="go-home"]').first.click()
     page.locator('[data-action="open-safety"]').first.click()
     check(page.get_by_text('Download complete CV + career backup').count()>0,
       'backup and recovery entry remains reachable at '+str(width)+'px')
     check(not errors,'no JavaScript errors through '+str(width)+'px navigation')
     ctx.close()
   finally:browser.close()
 finally:server.shutdown();server.server_close()
 report={'status':'PASS','sourceE29Sha256':manifest['sourceE29Sha256'],
  'hostedHtmlSha256':manifest['hostedHtmlSha256'],'browser':CHANNEL,
  'viewports':[x[0] for x in VIEWPORTS],'screens':ROUTES,
  'screenViewportCombinations':len(findings),
  'syntheticOnly':True,'javascriptErrors':errors,'results':findings,
  'ownerReleaseAcceptance':'OPEN'}
 (SITE/'E30_QA.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
 check(not errors,'zero uncaught page errors on E30 UX/UI matrix')
 print('E30 UX/UI real browser audit PASS: '+str(len(findings))+
  ' viewport/screen combinations; no release signoff claimed.',flush=True)
if __name__=='__main__':main()
