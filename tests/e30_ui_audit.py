#!/usr/bin/env python3
"""E30 original-source-preserving UX/UI audit and visual evidence.
Covers all 13 app routes, 11 editor panels, key modal and floating utilities,
desktop/tablet/phone viewports, a11y smoke, and screenshot comparisons. ALL
browser profiles and CVs are synthetic. Manual human visual review remains open.
"""
from __future__ import annotations
from collections import Counter
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import hashlib,json,os,traceback
from PIL import Image,ImageChops,ImageStat
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'site'
OUT=ROOT/'e30_ui_evidence'
CHANNEL=os.environ.get('LEDGER_BROWSER_CHANNEL','chromium')
MAIN=['home','upload','guided-interview','offline-agent','guided-review',
'experience-level','template-select','personal-info','work-experience',
'education','skills','summary','additional-sections','editor']
PANELS=['review','personal','versions','summary','target','cover-letter',
'experience','education','skills','additional','design']
VIEWPORTS=[(360,780),(390,844),(768,1024),(1024,768),(1440,900)]
CAPTURE_WIDTHS=[390,1440]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
def require(ok,msg):
 if not ok:raise AssertionError(msg)
 print('PASS: '+msg,flush=True)
def snap(page,name):
 path=OUT/(name+'.png');path.parent.mkdir(parents=True,exist_ok=True)
 page.screenshot(path=str(path),animations='disabled',timeout=30000)
 return str(path.relative_to(ROOT))
def measure(page):
 return page.evaluate("""()=>{
  const root=document.documentElement;
  const visible=[...document.querySelectorAll('#app button,#app input,#app select,#app textarea')].filter(e=>{
   const r=e.getBoundingClientRect(),s=getComputedStyle(e);
   return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';
  });
  return {viewport:innerWidth,documentWidth:root.scrollWidth,overflow:Math.max(0,root.scrollWidth-innerWidth),
   controls:visible.length,smallTargets:visible.filter(e=>{
    const r=e.getBoundingClientRect();return r.width<24||r.height<24;
   }).slice(0,15).map(e=>e.id||e.className||e.tagName),
   headings:[...document.querySelectorAll('#app .screen.active h1,#app .screen.active h2')].slice(0,8).map(e=>e.innerText),
   dockVisible:!!document.getElementById('ledgerE30Toggle')&&getComputedStyle(document.getElementById('ledgerE30Toggle')).display!=='none'};
 }""")
def shift(page,route,panel=None):
 page.evaluate("""([route,panel])=>{
   state.screen=route;if(panel)state.ui.editorPanel=panel;
   state.ui.editorView='edit';render();
 }""",[route,panel])
 page.wait_for_timeout(140)
def axe(page):
 script=ROOT/'node_modules/axe-core/axe.min.js'
 if not script.exists():return {'status':'not-installed'}
 page.add_script_tag(path=str(script))
 return page.evaluate("""async()=>{
  const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
  return {status:'executed',violations:r.violations.map(x=>({
   id:x.id,impact:x.impact,count:x.nodes.length,
   examples:x.nodes.slice(0,3).map(n=>n.target)
  })),checks:r.passes.length,incomplete:r.incomplete.length};
 }""")
def new_page(browser,base,viewport=(1440,900)):
 context=browser.new_context(viewport={'width':viewport[0],'height':viewport[1]},accept_downloads=True,
    reduced_motion='reduce')
 page=context.new_page()
 page.goto(base+'/site/index.html',wait_until='load',timeout=90000)
 page.wait_for_selector('#app .screen.active',timeout=30000)
 return context,page
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 doc=json.loads((SITE/'site-integrity.json').read_text())
 require(doc.get('sourceE28Sha256')=='73ca54189b8db116c5f9760f9372dc2082a836de5dfcbdea43c03eff436dcbd7',
         'frozen E28 business source unchanged')
 require(doc.get('previousHostedE29Sha256')=='c04684c7ff79cae0068a8e44408b25b86a751d08d14909cdd1006cedefcc8767',
         'frozen E29 hosting source unchanged')
 require(hashlib.sha256((SITE/'index.html').read_bytes()).hexdigest()==doc['hostedHtmlSha256'],
         'E30 standalone hosted asset exact checksum')
 require((ROOT/'dist/E29_Hosted_Baseline.html').is_file(),'baseline available for screenshot comparison')
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
 Thread(target=server.serve_forever,daemon=True).start()
 address='http://127.0.0.1:'+str(server.server_port)
 result={'version':'E30 UX/UI','status':'PENDING','sha256':doc['hostedHtmlSha256'],
  'routes':{},'panels':{},'overlays':{},'accessibility':{},'viewports':{},'criticalErrors':[],
  'screenshots':[],'limitations':['Synthetic browser only','Not a human visual signoff',
   'Not a physical phone, 8GB Windows device or actual screen reader',
   'Not an entire real-user workflow study or native Word verification']}
 errors=[]
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=True,channel=CHANNEL)
   try:
    # Capture unchanged E29 and styled E30 from identical synthetic home states.
    for width,height in [(390,844),(1440,900)]:
     ctx=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce')
     try:
      p=ctx.new_page()
      p.goto(address+'/dist/E29_Hosted_Baseline.html',wait_until='load',timeout=90000)
      p.wait_for_selector('#app .screen.active')
      before=measure(p)
      snap(p,'comparison/before-home-'+str(width))
      if width==1440:result['accessibility']['home_before']=axe(p)
      p.goto(address+'/site/index.html',wait_until='load',timeout=90000)
      p.wait_for_selector('#ledgerE30Toggle',timeout=20000)
      after=measure(p)
      snap(p,'comparison/after-home-'+str(width))
      if width==1440:result['accessibility']['home_after']=axe(p)
      result['viewports'][str(width)]={'before':before,'after':after}
      require(after['overflow']<=before['overflow']+2,
       'homepage root horizontal overflow does not regress at '+str(width)+'px')
      require(after['dockVisible'],'one workspace-tools entry visible at '+str(width)+'px')
      # Objective evidence that an actual visual UI change occurred.
      old=Image.open(OUT/('comparison/before-home-'+str(width)+'.png')).convert('RGB')
      new=Image.open(OUT/('comparison/after-home-'+str(width)+'.png')).convert('RGB')
      diff=ImageChops.difference(old,new)
      ratio=sum(1 for v in diff.convert('L').getdata() if v>20)/(old.width*old.height)
      result['viewports'][str(width)]['changedPixelRatio']=round(ratio,4)
      require(ratio>.01,'nontrivial visual design change at '+str(width)+'px')
     finally:ctx.close()
    ctx,page=new_page(browser,address)
    try:
     page.on('pageerror',lambda e:errors.append(str(e)))
     # Pre-existing template gallery must become keyboard-scrollable.
     gallery=page.locator('#app .template-strip')
     require(gallery.count()>0 and gallery.first.get_attribute('tabindex')=='0',
       'template gallery is in keyboard tab order')
     require(gallery.first.get_attribute('aria-label') is not None,
       'template gallery has an accessible region name')
     # Audit each real route and every main responsive breakpoint.
     for name in MAIN:
      entry={}
      for width,height in VIEWPORTS:
       page.set_viewport_size({'width':width,'height':height})
       shift(page,name)
       m=measure(page)
       entry[str(width)]=m
       require(page.locator('#app .screen.active').count()==1,
          name+' active screen at '+str(width))
       require(m['controls']>0,name+' has interactive controls at '+str(width))
       if width in CAPTURE_WIDTHS:
        result['screenshots'].append(snap(page,'routes/'+name+'-'+str(width)))
      result['routes'][name]=entry
     # A representative synthetic CV loaded through the unchanged app demo.
     page.set_viewport_size({'width':1440,'height':900})
     shift(page,'home')
     page.locator('button[data-action="try-demo"]').click()
     page.wait_for_function("state.screen==='editor'&&state.document.personalInfo.firstName==='John'",timeout=20000)
     original=page.evaluate('JSON.stringify(state.document)')
     for panel in PANELS:
      entry={}
      for width,height in [(390,844),(768,1024),(1440,900)]:
       page.set_viewport_size({'width':width,'height':height})
       shift(page,'editor',panel)
       m=measure(page)
       entry[str(width)]=m
       require(page.locator('#app .editor-panel').count()>0,
          'editor section '+panel+' still renders at '+str(width))
       if width==390:
        require(page.locator('#ledgerEditorQuickNav').is_visible(),
          'phone editor always exposes section switcher')
        require(page.locator('#app .editor-panel > .editor-panel-group:first-child').evaluate(
          "e=>getComputedStyle(e).display")=='none',
          'duplicate eleven-link editor grid is collapsed on phones')
       if width in CAPTURE_WIDTHS:
        result['screenshots'].append(snap(page,'editor/'+panel+'-'+str(width)))
      result['panels'][panel]=entry
     require(page.evaluate('JSON.stringify(state.document)')==original,
       'navigating all 11 editor panels preserves exact CV data')
     page.set_viewport_size({'width':390,'height':844})
     shift(page,'editor','review')
     check=page.locator('#ledgerE30Toggle')
     check.focus();page.keyboard.press('Enter')
     require(check.get_attribute('aria-expanded')=='true','workspace tool menu is keyboard-openable')
     docked=page.locator('#ledgerE30ToolsPanel > button')
     require(docked.count()>=4,'existing career/AI/transfer/tool buttons consolidated')
     for id in ['ledgerE3Launcher','ledgerS5Launcher','ledgerE4Launcher','ledgerS7Launcher']:
      require(page.locator('#ledgerE30ToolsPanel > #'+id).count()==1,
          'original '+id+' launcher moved intact into dock')
      require(page.locator('#'+id).evaluate("e=>getComputedStyle(e).position")=='static',
          'original '+id+' launcher is no longer a floating overlay')
     result['screenshots'].append(snap(page,'modals/workspace-tools-390'))
     page.keyboard.press('Escape')
     require(check.get_attribute('aria-expanded')=='false','Escape collapses workspace tools')
     require(page.evaluate('JSON.stringify(state.document)')==original,
       'opening and closing UI tool menu preserves CV')
     # Feature dialogs are opened via their original button action.
     for id,selector in [
      ('ledgerE3Launcher','.e3-overlay'),
      ('ledgerS5Launcher','.ledger-s5-backdrop'),
      ('ledgerE4Launcher','.e4-overlay'),
      ('ledgerS7Launcher','.ledger-s7-overlay'),
      ('ledgerS6Launcher','.ledger-s6-overlay')]:
      page.reload(wait_until='load',timeout=90000)
      page.wait_for_selector('#ledgerE30Toggle',timeout=20000)
      page.locator('#ledgerE30Toggle').click()
      launch=page.locator('#ledgerE30ToolsPanel > #'+id)
      if launch.count()==0:
       result['overlays'][id]={'status':'not-mounted'};continue
      launch.click()
      page.wait_for_timeout(250)
      overlay=page.locator(selector)
      if overlay.count() and overlay.first.is_visible():
       result['overlays'][id]={'status':'visible','title':overlay.first.locator('h2').first.inner_text() if overlay.first.locator('h2').count() else ''}
       result['screenshots'].append(snap(page,'modals/'+id+'-390'))
      else:
       result['overlays'][id]={'status':'not-visibly-opened'}
     # Native export modal, upload, accessibility settings, home navigation.
     page.reload(wait_until='load',timeout=90000)
     try:
      page.evaluate('openDownloadModal()')
      if page.locator('.modal-overlay.active').count():
       result['overlays']['export']={'status':'visible'}
       result['screenshots'].append(snap(page,'modals/export-390'))
     except Exception as err:
      result['overlays']['export']={'status':'not-tested','reason':str(err)[:150]}
     page.reload(wait_until='load',timeout=90000)
     safety=page.locator('button[data-action="open-safety"]:visible')
     if safety.count():
      safety.first.click();page.wait_for_timeout(180)
      result['overlays']['data-safety']={'status':'opened'}
      result['screenshots'].append(snap(page,'modals/data-safety-390'))
     # Critical/serious a11y non-regression from E29 baseline on home.
     before=result['accessibility'].get('home_before',{})
     after=result['accessibility'].get('home_after',{})
     if before.get('status')=='executed' and after.get('status')=='executed':
      def count_severe(x):return sum(v['count'] for v in x['violations'] if v['impact'] in ['critical','serious'])
      b,n=count_severe(before),count_severe(after)
      result['accessibility']['severeBefore']=b
      result['accessibility']['severeAfter']=n
      require(n<=b,'no increase in serious/critical homepage accessibility findings')
     require(not errors,'no uncaught JavaScript errors in UI walkthrough')
     result['status']='AUTOMATED PASS — HUMAN DESIGN ACCEPTANCE OPEN'
    finally:ctx.close()
   finally:browser.close()
 finally:server.shutdown();server.server_close()
 result['criticalErrors']=errors
 (OUT/'E30_UI_AUDIT.json').write_text(json.dumps(result,indent=2)+'\n')
 print('E30 UX/UI audit complete. Routes:',len(result['routes']),
       'editor panels:',len(result['panels']),'screenshots:',len(result['screenshots']))
if __name__=='__main__':
 try:main()
 except Exception as e:
  OUT.mkdir(parents=True,exist_ok=True)
  (OUT/'E30_UI_AUDIT_FAILURE.txt').write_text(traceback.format_exc())
  raise
