#!/usr/bin/env python3
"""E24 hosted genuine file:// browser and UI iCalendar acceptance using synthetic data."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'development/e24/Ledger_CV_Studio_E24_Offline_Calendar_Timezones.html'
CHANNEL=os.environ.get('LEDGER_BROWSER_CHANNEL','chromium')

def ics(dt,uid='synthetic-e24'):
    return ('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'
        'BEGIN:VEVENT\r\nUID:'+uid+'\r\n'+dt+'\r\n'
        'SUMMARY:Sample calendar interview follow-up\r\n'
        'END:VEVENT\r\nEND:VCALENDAR')

def check(condition,label):
    assert condition,label
    print('PASS:',label,flush=True)

def main():
    errors,requests=[],[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,channel=CHANNEL)
        try:
            context=browser.new_context(timezone_id='Pacific/Honolulu')
            page=context.new_page()
            page.on('pageerror',lambda err: errors.append(str(err)))
            page.on('request',lambda req: requests.append(req.url) if req.url.startswith(('http://','https://')) else None)
            page.goto(APP.resolve().as_uri(),wait_until='load',timeout=60000)
            check(page.evaluate('location.protocol')=='file:','actual local file origin')
            check(bool(page.locator('#app').inner_text().strip()),'single HTML application boots')
            good=ics('DTSTART;TZID=America/New_York:20260101T001500')
            parsed=page.evaluate('txt=>ledgerE20Calendar.parse(txt)',good)
            check(parsed['events'][0]['date']=='2025-12-31','IANA zone converted to browser-local day')
            ambiguous=ics('DTSTART;TZID=America/New_York:20261101T013000','synthetic-ambiguous')
            x=page.evaluate('txt=>ledgerE20Calendar.parse(txt)',ambiguous)
            check(len(x['events'])==0 and x['skipped']==1,'DST ambiguous event skipped')
            # Test the actual review-first UI, not only a public parser function.
            page.locator('#ledgerE3Launcher').click()
            page.locator('[data-e3-tab="tasks"]').click()
            page.locator('#e20CalendarFile').set_input_files({
                'name':'synthetic-sample.ics',
                'mimeType':'text/calendar',
                'buffer':good.encode('utf-8'),
            })
            page.locator('#e20CalendarReview').wait_for(timeout=15000)
            check('2025-12-31' in page.locator('#e20CalendarReview').inner_text(),
                'UI review shows converted date before any write')
            count_before=page.evaluate('JSON.parse(localStorage.getItem(ledgerE3Core.KEY)||"null")?.tasks?.length||0')
            page.locator('#e20CalendarConsent').check()
            page.locator('[data-e20-import]').click()
            stored=page.evaluate("""()=>JSON.parse(localStorage.getItem(ledgerE3Core.KEY)||'null')""")
            check(stored is not None and len(stored['tasks'])==count_before+1 and stored['tasks'][-1]['due']=='2025-12-31',
                'consented UI import persists exactly one local date-only task')
            # A subsequent cancellation notice must not create extra tasks.
            canceled=good.replace('VERSION:2.0','VERSION:2.0\r\nMETHOD:CANCEL')
            page.locator('#e20CalendarFile').set_input_files({
                'name':'synthetic-cancel.ics','mimeType':'text/calendar','buffer':canceled.encode('utf-8')
            })
            page.locator('#e20CalendarReview').wait_for(timeout=15000)
            check('0 supported events' in page.locator('#e20CalendarReview').inner_text(),
                'cancellation notice reviewed as zero importable tasks')
            check(page.locator('[data-e20-import]').is_disabled(),
                'no import action offered for calendar-wide cancellation')
            count_after=page.evaluate('JSON.parse(localStorage.getItem(ledgerE3Core.KEY)).tasks.length')
            check(count_after==len(stored['tasks']),'cancel notice cannot mutate existing task count')
            check(not errors,'no uncaught JavaScript exceptions')
            check(not requests,'no external HTTP(S) traffic')
            context.close()
        finally:
            browser.close()
    print('E24 browser/UI tests PASS; production remains NO-GO.',flush=True)

if __name__=='__main__':
    main()
