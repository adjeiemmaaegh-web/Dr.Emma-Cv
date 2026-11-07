#!/usr/bin/env python3
"""E22: synthetic 30-template A4/Letter + long CV print-to-PDF regression.

Real file:// on GitHub Actions. Never reads real CV data. The test does NOT
grant human visual, Windows 11 hardware, Word, mobile or production acceptance.
"""
import hashlib
import json
import os
import re
from pathlib import Path
from tempfile import TemporaryDirectory

import fitz
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'development/e22/Ledger_CV_Studio_E22_Monogram_Print_Pagination.html'
EXPECTED='3b0669421bf2977be18034ea57cd50aa8315a7007fcf32c9aa68015750bb33ef'
PAPERS={'A4':(595.3,841.9),'Letter':(612.0,792.0)}
LOCAL_FALLBACK=os.environ.get('LEDGER_LOCAL_SET_CONTENT')=='1'
CHANNEL=os.environ.get('LEDGER_BROWSER_CHANNEL')
EXECUTABLE=os.environ.get('LEDGER_BROWSER_PATH')
REPORT=os.environ.get('LEDGER_AUDIT_REPORT')

def expect(ok, msg):
    if not ok:
        raise AssertionError(msg)

def review_pdf(data, paper, template, fixture):
    width,height=PAPERS[paper]
    with fitz.open(stream=data,filetype='pdf') as doc:
        expect(1 <= len(doc) <= 14, f'{fixture}/{template}/{paper}: unexpected PDF page count {len(doc)}')
        flat=[]
        offpaper=[]
        empty=[]
        for index,pg in enumerate(doc):
            expect(abs(pg.rect.width-width)<2 and abs(pg.rect.height-height)<2,
                f'{fixture}/{template}/{paper}: page {index+1} size mismatch: {pg.rect}')
            txt=pg.get_text('text')
            if len(txt.strip())<20:
                empty.append(index+1)
            flat.append(txt)
            for block in pg.get_text('dict')['blocks']:
                if block.get('type')!=0:
                    continue
                bounds=block.get('bbox',())
                if len(bounds)==4 and (bounds[0]<-3 or bounds[1]<-3 or
                                        bounds[2]>pg.rect.width+3 or bounds[3]>pg.rect.height+3):
                    offpaper.append([index+1,*[round(x,1) for x in bounds]])
        expect(not empty,f'{fixture}/{template}/{paper}: sparse or empty pages {empty}')
        expect(not offpaper,f'{fixture}/{template}/{paper}: text beyond paper boundary: {offpaper[:4]}')
        plain=re.sub(r'\s+',' ',' '.join(flat)).lower()
        for token in ('john smith','store manager','tesco'):
            expect(token in plain,f'{fixture}/{template}/{paper}: lost {token}')
        if fixture=='long':
            expect(len(doc)>=4,f'{fixture}/{template}/{paper}: expected 4+ pages, got {len(doc)}')
            for i in range(18):
                expect(f'role index {i}' in plain,f'{fixture}/{template}/{paper}: job {i} lost')
            expect('sentinel_last_role_yx774' in plain,f'{fixture}/{template}/{paper}: final job omitted')
        return {'fixture':fixture,'template':template,'paper':paper,'pages':len(doc),
                'bytes':len(data),'offpaper':len(offpaper),'sha256':hashlib.sha256(data).hexdigest()}

def main():
    expect(hashlib.sha256(APP.read_bytes()).hexdigest()==EXPECTED,'E22 app SHA-256 mismatch')
    with TemporaryDirectory(prefix='ledger_e22_templates_') as profile,sync_playwright() as pw:
        launch={'headless':True,'accept_downloads':True}
        if CHANNEL:
            launch['channel']=CHANNEL
        if EXECUTABLE:
            launch['executable_path']=EXECUTABLE
            launch['args']=['--no-sandbox']
        if LOCAL_FALLBACK:
            browser=pw.chromium.launch(**{k:v for k,v in launch.items() if k!='accept_downloads'})
            context=browser.new_context(accept_downloads=True)
        else:
            browser=None
            context=pw.chromium.launch_persistent_context(profile,**launch)
        errors,remote=[],[]
        try:
            page=context.pages[0] if context.pages else context.new_page()
            page.on('pageerror',lambda err:errors.append(str(err)))
            page.on('request',lambda req:remote.append(req.url) if req.url.startswith(('http://','https://')) else None)
            if LOCAL_FALLBACK:
                page.evaluate("() => {const m=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}})}")
                page.set_content(APP.read_text(encoding='utf-8'),wait_until='load',timeout=45000)
                expect(page.evaluate('location.protocol')=='about:','unexpected local test origin')
            else:
                page.goto(APP.as_uri(),wait_until='load',timeout=45000)
                expect(page.evaluate('location.protocol')=='file:','not a native file:// test')
            page.locator('button[data-action="try-demo"]').click()
            page.wait_for_function("state.screen==='editor' && state.document.personalInfo.firstName==='John'",timeout=15000)
            templates=page.evaluate("TEMPLATES.map(({id,color})=>({id,color:color||null}))")
            expect(len(templates)==30 and len({x['id'] for x in templates})==30,'expected all 30 unique template IDs')
            output=context.new_page()
            output.on('pageerror',lambda err:errors.append(str(err)))
            output.on('request',lambda req:remote.append(req.url) if req.url.startswith(('http://','https://')) else None)
            report=[]
            for fixture in ('standard','long'):
                if fixture=='long':
                    page.evaluate("""() => {
                      const base=state.document.experience[0];
                      state.document.experience=Array.from({length:18},(_,i)=>({
                        ...base,id:'synthetic-'+i,title:'Role index '+i,employer:i===0?'Tesco':'Synthetic Employer '+i,
                        description:'<ul>'+Array.from({length:9},(_,j)=>
                          '<li>Synthetic contribution '+i+'-'+j+' across service, leadership, budgeting, governance and operational improvement in a representative long-form CV.</li>'
                        ).join('')+'</ul>'
                      }));
                      state.document.experience[17].title='Role index 17 SENTINEL_LAST_ROLE_YX774';
                    }""")
                for template in templates:
                    page.evaluate("t=>{state.appearance.template=t.id;if(t.color)state.appearance.color=t.color;}",template)
                    for paper in PAPERS:
                        html=page.evaluate('p=>ledgerE1VisualExport.build(p)',paper)
                        expect('ledger-e1-visual-export' in html,f'{fixture}/{template["id"]}/{paper}: missing print layout')
                        output.set_content(html,wait_until='load',timeout=45000)
                        pdf=output.pdf(format=paper,print_background=True)
                        result=review_pdf(pdf,paper,template['id'],fixture)
                        report.append(result)
                        print(f'PASS: {fixture}/{template["id"]}/{paper} {result["pages"]} page(s)',flush=True)
            output.close()
            expect(len(report)==120,'expected 120 native print outputs')
            expect(not remote,'HTTP(S) network request observed: '+str(remote[:3]))
            expect(not errors,'page exceptions observed: '+str(errors[:3]))
            result={'status':'PASS','appSha256':EXPECTED,'cases':len(report),
                    'fixtureTypes':['standard','long'],
                    'sourceProtocol':'about:blank MOCK' if LOCAL_FALLBACK else 'file://',
                    'browserChannel':CHANNEL or 'Chromium','caseResults':report,
                    'limitations':['Not a human visual layout approval','Not native Microsoft Word',
                                   'Not physical Windows 11 or mobile device acceptance',
                                   'Not provider or offline OCR signoff'],'production':'NO-GO'}
            if REPORT:
                target=Path(REPORT);target.parent.mkdir(parents=True,exist_ok=True)
                target.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
            print('PASS: 120/120 template, print and content cases; no page errors/network; production NO-GO')
        finally:
            context.close()
            if browser:
                browser.close()

if __name__=='__main__':
    main()
