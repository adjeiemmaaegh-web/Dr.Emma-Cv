#!/usr/bin/env python3
"""True browser-process restart and same-file synthetic CV persistence on E24."""
from pathlib import Path
from tempfile import TemporaryDirectory
import hashlib
import os
from playwright.sync_api import sync_playwright

APP=Path(__file__).resolve().parents[1]/'development/e24/Ledger_CV_Studio_E24_Offline_Calendar_Timezones.html'
SHA='4d99390d87619839374b60b22220241557f7a6fb966567ea637c8fae5625d52d'
CHANNEL=os.environ.get('LEDGER_BROWSER_CHANNEL','chromium')

def ok(v,label):
    assert v,label
    print('PASS:',label,flush=True)

def main():
    ok(hashlib.sha256(APP.read_bytes()).hexdigest()==SHA,'exact E24 artifact hash')
    errors,requests=[],[]
    with TemporaryDirectory(prefix='ledger_e24_synthetic_') as directory:
        with sync_playwright() as pw:
            def launch():
                return pw.chromium.launch_persistent_context(
                    directory,headless=True,channel=CHANNEL,
                    viewport={'width':1280,'height':800},accept_downloads=True)
            def listen(page):
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.on('request',lambda r:requests.append(r.url) if r.url.startswith(('http://','https://')) else None)
            context=launch()
            page=context.pages[0] if context.pages else context.new_page()
            listen(page)
            page.goto(APP.as_uri(),wait_until='load',timeout=60000)
            ok(page.evaluate('location.protocol')=='file:','genuine file:// origin')
            page.locator('button[data-action="try-demo"]').click()
            page.wait_for_function("state.document.personalInfo.title==='Store Manager'",timeout=30000)
            before=page.evaluate("""() => ({
                title:state.document.personalInfo.title,
                first:state.document.personalInfo.firstName,
                experience:state.document.experience.length
            })""")
            ok(before['first']=='John' and before['experience']>=1,'real app demo CV populated')
            page.wait_for_timeout(700)
            context.close()
            context=launch()
            page=context.pages[0] if context.pages else context.new_page()
            listen(page)
            page.goto(APP.as_uri(),wait_until='load',timeout=60000)
            page.wait_for_function("state.document.personalInfo.title==='Store Manager'",timeout=30000)
            after=page.evaluate("""() => ({
                title:state.document.personalInfo.title,
                first:state.document.personalInfo.firstName,
                experience:state.document.experience.length
            })""")
            ok(after==before,'exact synthetic CV shape survives full browser-process restart')
            ok(not errors,'no uncaught JavaScript exceptions')
            ok(not requests,'no unexpected HTTP(S) traffic')
            context.close()
    print('E24 browser restart PASS on hosted browser, not owner Windows 11 acceptance.',flush=True)

if __name__=='__main__':
    main()
