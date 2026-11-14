#!/usr/bin/env python3
"""E23 genuine file:// synthetic iCalendar interoperability test. No user data."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'development/e23/Ledger_CV_Studio_E23_Calendar_Import_Safety.html'
CHANNEL=os.getenv('LEDGER_BROWSER_CHANNEL','chromium')

def check(value,msg):
    assert value,msg
    print('PASS:',msg,flush=True)

def main():
    errors,remote=[],[]
    calendar=('\ufeffBEGIN:VCALENDAR\r\nVERSION:2.0\r\nMETHOD:REQUEST\r\n'
       'BEGIN:VEVENT\r\nUID:synthetic-E23\r\nDTSTART;VALUE=DATE:20261116\r\n'
       'SUMMARY:Browser synthetic fixture\r\nEND:VEVENT\r\nEND:VCALENDAR')
    canceled=calendar.replace('METHOD:REQUEST','METHOD:CANCEL')
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,channel=CHANNEL)
        try:
            page=browser.new_page()
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('request',lambda r:remote.append(r.url) if r.url.startswith(('http://','https://')) else None)
            page.goto(APP.as_uri(),wait_until='load',timeout=60000)
            check(page.evaluate('location.protocol')=='file:','actual file:// source')
            check(bool(page.locator('#app').inner_text().strip()),'app boot')
            result=page.evaluate('source=>ledgerE20Calendar.parse(source)',calendar)
            check(len(result['events'])==1 and result['events'][0]['date']=='2026-11-16','BOM iCalendar accepted')
            canceled_result=page.evaluate('source=>ledgerE20Calendar.parse(source)',canceled)
            check(not canceled_result['events'] and canceled_result['skipped']==1,'calendar-wide cancellation skipped')
            merged=page.evaluate("""events=>{
                const x=ledgerE20Calendar.merge(ledgerE3Core.blank(),events,[0],'2026-11-11T08:00:00.000Z');
                return {added:x.added,due:x.next.tasks[0].due};
            }""",result['events'])
            check(merged=={'added':1,'due':'2026-11-16'},'local reviewed task model created in memory')
            check(not errors,'no uncaught JavaScript exceptions')
            check(not remote,'no unexpected HTTP(S) requests')
        finally:
            browser.close()
    print('E23 hosted browser QA PASS; production NO-GO.',flush=True)

if __name__=='__main__':
    main()
