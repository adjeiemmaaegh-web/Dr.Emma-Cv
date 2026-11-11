#!/usr/bin/env python3
"""Bounded synthetic trained offline OCR real file:// test. Never uses personal CVs."""
import json
import os
import re
from pathlib import Path
from io import BytesIO
from PIL import Image,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'dist/Ledger_CV_Studio_E25_Trained_Offline_OCR.html'
REPORT=ROOT/'dist/E25_OCR_QA.json'

def check(value,description):
    assert value,description
    print('PASS:',description,flush=True)

def fixture():
    image=Image.new('RGB',(1250,390),'white')
    draw=ImageDraw.Draw(image)
    font_file='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    font=ImageFont.truetype(font_file,52)
    draw.text((70,50),'JOHN SMITH',font=font,fill='black')
    draw.text((70,150),'Store Manager',font=font,fill='black')
    draw.text((70,250),'Experience 2026',font=font,fill='black')
    output=BytesIO()
    image.save(output,format='PNG')
    return list(output.getvalue())

def main():
    check(APP.is_file(),'generated E25 standalone HTML exists')
    manifest=json.loads((ROOT/'dist/E25_MANIFEST.json').read_text())
    errors,external=[],[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True)
        try:
            page=browser.new_page()
            page.set_default_timeout(180000)
            page.on('pageerror',lambda e: errors.append(str(e)))
            page.on('request',lambda r: external.append(r.url) if r.url.startswith(('http://','https://')) else None)
            page.goto(APP.resolve().as_uri(),wait_until='load',timeout=180000)
            check(page.evaluate('location.protocol')=='file:','actual standalone file:// origin')
            page.wait_for_function('window.ledgerE25TrainedOCR?.available===true',timeout=180000)
            check(bool(page.locator('#app').inner_text().strip()),'existing CV application boots')
            data=fixture()
            result=page.evaluate("""async data=>{
                const image=new File([new Uint8Array(data)],'synthetic-fixture.png',{type:'image/png'});
                return await window.ledgerE25TrainedOCR.recognize(image,{rotation:0});
            }""",data)
            observed=re.sub(r'\s+',' ',result['text']).strip().lower()
            print('Synthetic recognized text:',repr(observed[:600]),flush=True)
            for token in ('john','smith','store','manager','experience','2026'):
                check(token in observed,'trained OCR recovered synthetic token: '+token)
            check(result['engine']=='trained-offline-tesseract-wasm-0.11.0','trained engine path, not glyph fallback')
            check(not external,'no HTTP(S) requests during boot/model/OCR')
            check(not errors,'no uncaught JavaScript errors')
            report={'status':'PASS','sourceProtocol':'file://','engine':result['engine'],
                'expected':['JOHN SMITH','Store Manager','Experience 2026'],
                'observedSynthetic':result['text'][:1000],
                'externalRequests':external,'appSha256':manifest['appSha256'],
                'limitations':['Clean printed English synthetic fixture only',
                 'Not scored real scanned resumes','No Word/PDF corpus',
                 'Not owner Windows 11/mobile/accessibility acceptance'],
                'release':'NO-GO'}
            REPORT.write_text(json.dumps(report,indent=2)+'\n')
        finally:
            browser.close()
    print('E25 trained OCR real-file development QA PASS; production remains NO-GO.',flush=True)

if __name__=='__main__':
    main()
