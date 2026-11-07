#!/usr/bin/env python3
"""E21 synthetic Word hidden-style privacy regression, true local file origin."""
import io
import zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'development/e21/Ledger_CV_Studio_E21_Style_Safe_Docx_Import.html'
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

def run(text, styles=''):
    bio=io.BytesIO()
    with zipfile.ZipFile(bio, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('word/document.xml',
            '<w:document xmlns:w="'+W+'"><w:body><w:p><w:r><w:t>Jane Analyst</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Visible job experience</w:t></w:r></w:p>'+text+'</w:body></w:document>')
        if styles:
            z.writestr('word/styles.xml','<w:styles xmlns:w="'+W+'">'+styles+'</w:styles>')
    return list(bio.getvalue())

def para(text, rpr='', ppr=''):
    return '<w:p>'+ppr+'<w:r>'+rpr+'<w:t>'+text+'</w:t></w:r></w:p>'

def style(id, typ='character', parent='', visibility='<w:vanish/>'):
    based = '<w:basedOn w:val="'+parent+'"/>' if parent else ''
    return '<w:style w:type="'+typ+'" w:styleId="'+id+'">'+based+'<w:rPr>'+visibility+'</w:rPr></w:style>'

def check(condition, label):
    assert condition, label
    print('PASS: '+label, flush=True)

def main():
    errors,remote=[],[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True)
        page=browser.new_page()
        page.on('pageerror',lambda error: errors.append(str(error)))
        page.on('request',lambda req: remote.append(req.url) if req.url.startswith(('http://','https://')) else None)
        page.goto(APP.resolve().as_uri(),wait_until='load',timeout=45000)
        check(page.evaluate('location.protocol')=='file:', 'actual file:// E21 app')
        check(bool(page.locator('#app').inner_text().strip()), 'standalone E21 app boot')
        scenarios=[
           ('character',run(para('PRIVATE_CHARACTER','<w:rPr><w:rStyle w:val="Private"/></w:rPr>')+
             para('Explicit override visible','<w:rPr><w:rStyle w:val="Private"/><w:vanish w:val="0"/></w:rPr>'),style('Private')),
             'PRIVATE_CHARACTER','Explicit override visible',True),
           ('paragraph',run(para('PRIVATE_PARAGRAPH',ppr='<w:pPr><w:pStyle w:val="HiddenPara"/></w:pPr>'),style('HiddenPara',typ='paragraph')),
             'PRIVATE_PARAGRAPH','Jane Analyst',True),
           ('inherited',run(para('PRIVATE_INHERITED','<w:rPr><w:rStyle w:val="Derived"/></w:rPr>'),style('Base')+style('Derived',parent='Base',visibility='')),
             'PRIVATE_INHERITED','Visible job experience',True),
           ('direct',run(para('PRIVATE_DIRECT','<w:rPr><w:vanish/></w:rPr>')),
             'PRIVATE_DIRECT','Visible job experience',True),
           ('missing-style',run(para('Manual visibility review','<w:rPr><w:rStyle w:val="Unknown"/></w:rPr>')),
             None,'Manual visibility review',True),
           ('regular-visible',run(para('Ordinary visible style','<w:rPr><w:rStyle w:val="Plain"/></w:rPr>'),style('Plain',visibility='<w:b/>')),
             None,'Ordinary visible style',False),
        ]
        for name,source,private,visible,omitted in scenarios:
            result=page.evaluate("""async values => {
               const zip=await JSZip.loadAsync(new Uint8Array(values));
               const info=await ledgerE11DocxAudit.inspect(zip);
               return {text:info.text,warnings:info.warnings,hasOmissions:info.hasOmissions};
            }""",source)
            check((private is None or private not in result['text']) and visible in result['text'] and
                  result['hasOmissions'] is omitted,name+' visible/hidden content and omission flag')
            if omitted:
                check(bool(result['warnings']),name+' manual warning')
        bad=run(para('Cyclic style','<w:rPr><w:rStyle w:val="A"/></w:rPr>'),
            style('A',parent='B')+style('B',parent='A'))
        result=page.evaluate("""async v => {
           try {const zip=await JSZip.loadAsync(new Uint8Array(v));
             await ledgerE11DocxAudit.inspect(zip);return 'accepted';}
           catch(e){return String(e.message||e);}
        }""",bad)
        check('cyclic' in result,'style inheritance cycle rejected')
        check(not errors,'no unhandled runtime errors')
        check(not remote,'no HTTP(S) network requests')
        browser.close()
    print('RESULT: E21 DOCX privacy checks PASS; production remains NO-GO.',flush=True)

if __name__ == '__main__':
    main()
