#!/usr/bin/env python3
"""Native Chromium E20 calendar workflow. Synthetic data and disposable profile only.

Linux Playwright file:// acceptance is NOT Windows/Edge, production, real-device,
screen-reader, external calendar-client, or provider compatibility signoff.
"""
import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory

from playwright.sync_api import sync_playwright

APP = Path(__file__).resolve().parents[1] / "development/e20/Ledger_CV_Studio_E20_Offline_Calendar_Import_2026-11-06.html"
EXPECTED = "e95d851702931d1c4d0b4b3445d4db9d9a6051014529abf067e672576982848f"
BASE = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ledger E20 native QA//EN"]


def assert_pass(condition, label):
    if not condition:
        raise AssertionError(label)
    print("PASS:", label, flush=True)


def calendar(events):
    rows = list(BASE)
    for uid, date, title, extra in events:
        rows += [
            "BEGIN:VEVENT", "UID:" + uid, "DTSTART;VALUE=DATE:" + date,
            "SUMMARY:" + title, *extra, "END:VEVENT",
        ]
    return ("\r\n".join(rows + ["END:VCALENDAR", ""])).encode("utf-8")


def choose(page, filename, data):
    page.locator("#e20CalendarFile").set_input_files(
        {"name": filename, "mimeType": "text/calendar", "buffer": data}
    )
    page.locator("#e20CalendarReview").wait_for(timeout=25000)


def tracker(page):
    page.locator("#ledgerE3Launcher").click()
    page.locator('[data-e3-tab="tasks"]').click()
    assert_pass(page.locator("#e20CalendarFile").count() == 1, "calendar importer reachable through UI")


def launch(playwright, profile):
    return playwright.chromium.launch_persistent_context(
        profile, headless=True, viewport={"width": 390, "height": 844},
        accept_downloads=True,
    )


def main():
    assert_pass(hashlib.sha256(APP.read_bytes()).hexdigest() == EXPECTED, "E20 immutable release identity")
    errors, external = [], []
    events = calendar([
        ("e20-native-a@example.test", "20261205", "Synthetic <b>Interview</b>",
         ["DESCRIPTION:Private review\\nDo not upload"]),
        ("e20-native-b@example.test", "20261208", "Prepare application", []),
        ("e20-native-c@example.test", "20261209", "Recurring ignored", ["RRULE:FREQ=DAILY;COUNT=2"]),
    ])
    with TemporaryDirectory(prefix="ledger_e20_calendar_native_") as profile:
        with sync_playwright() as playwright:
            ctx = launch(playwright, profile)

            def observe(page):
                page.on("pageerror", lambda e: errors.append(str(e)))
                page.on("request", lambda r: external.append(r.url)
                        if r.url.startswith(("http://", "https://")) else None)

            try:
                page = ctx.pages[0] if ctx.pages else ctx.new_page()
                observe(page)
                page.goto(APP.as_uri(), wait_until="load", timeout=45000)
                assert_pass(page.evaluate("location.protocol") == "file:", "genuine file:// application origin")
                key = page.evaluate("window.ledgerE3Core.KEY")
                tracker(page)
                assert_pass(page.evaluate("(k)=>localStorage.getItem(k)", key) is None, "clean synthetic career store")

                choose(page, "test.ics", events)
                assert_pass("2 supported events; 1 skipped" in page.locator("#e20CalendarReview").inner_text(), "recurrence omitted")
                assert_pass(page.locator("#e20CalendarReview b").count() == 0, "untrusted title escaped")
                assert_pass(page.locator("[data-e20-import]").is_disabled(), "consent required before writes")
                assert_pass(page.evaluate("(k)=>localStorage.getItem(k)", key) is None, "review does not write")
                page.locator("[data-e20-cancel]").click()
                assert_pass(page.evaluate("(k)=>localStorage.getItem(k)", key) is None, "cancel does not write")

                choose(page, "test.ics", events)
                page.locator('[data-e20-select="1"]').uncheck()
                page.locator("#e20CalendarConsent").check()
                page.locator("[data-e20-import]").click()
                first = json.loads(page.evaluate("(k)=>localStorage.getItem(k)", key))
                assert_pass(len(first["tasks"]) == 1, "selective import wrote exactly one task")
                assert_pass(first["tasks"][0]["due"] == "2026-12-05", "exact all-day date retained")
                assert_pass(first["tasks"][0]["applicationId"] == "", "calendar task remains unlinked")

                original = page.evaluate("(k)=>localStorage.getItem(k)", key)
                choose(page, "rescheduled.ics", calendar([
                    ("e20-native-a@example.test", "20261228", "Unapproved reschedule", []),
                ]))
                page.locator("#e20CalendarConsent").check()
                page.locator("[data-e20-import]").click()
                assert_pass(page.evaluate("(k)=>localStorage.getItem(k)", key) == original,
                            "same UID cannot reschedule or duplicate existing task")

                choose(page, "fresh.ics", calendar([
                    ("e20-native-d@example.test", "20261213", "New reminder", []),
                ]))
                other = ctx.new_page()
                observe(other)
                other.goto(APP.as_uri(), wait_until="load", timeout=45000)
                tracker(other)
                other.locator("[data-e3-task-for]").first.click()
                other.locator('#e3TaskForm input[name="title"]').fill("Other tab approved reminder")
                other.locator('#e3TaskForm input[name="due"]').fill("2026-12-20")
                other.locator('#e3TaskForm button[type="submit"]').click()
                assert_pass("Saved locally" in other.locator("#e3Message").inner_text(),
                            "second genuine tab saved through app UI")
                other.close()
                changed = page.evaluate("(k)=>localStorage.getItem(k)", key)
                page.locator("#e20CalendarConsent").check()
                page.locator("[data-e20-import]").click()
                assert_pass(page.evaluate("(k)=>localStorage.getItem(k)", key) == changed,
                            "stale first tab cannot overwrite another tab")
                assert_pass("changed" in page.locator("#e3Message").inner_text().lower(),
                            "conflict warning is shown")

                page.locator("#e3Close").click()
                tracker(page)
                choose(page, "denied.ics", calendar([
                    ("e20-native-e@example.test", "20261217", "Quota scenario", []),
                ]))
                page.locator("#e20CalendarConsent").check()
                page.evaluate("""() => {
                    const original = Storage.prototype.setItem;
                    window.restoreSetItem = () => { Storage.prototype.setItem = original };
                    Storage.prototype.setItem = function(k, v) {
                      if (k === window.ledgerE3Core.KEY) throw new DOMException('QA quota denied', 'QuotaExceededError');
                      return original.call(this, k, v);
                    };
                }""")
                before = page.evaluate("(k)=>localStorage.getItem(k)", key)
                page.locator("[data-e20-import]").click()
                assert_pass(page.evaluate("(k)=>localStorage.getItem(k)", key) == before,
                            "storage quota rejection preserves prior career data")
                assert_pass("not saved" in page.locator("#e3Message").inner_text().lower(),
                            "quota rejection reported in UI")
                page.evaluate("window.restoreSetItem()")
                page.locator("#e3Close").click()
                assert_pass(not errors, "no uncaught JavaScript exceptions")
                assert_pass(not external, "no HTTP(S) requests during import and cross-tab operations")

                ctx.close()
                ctx = launch(playwright, profile)
                reopened = ctx.pages[0] if ctx.pages else ctx.new_page()
                reopened.goto(APP.as_uri(), wait_until="load", timeout=45000)
                persisted = json.loads(reopened.evaluate("(k)=>localStorage.getItem(k)", key))
                assert_pass(any(t["title"] == "Other tab approved reminder" for t in persisted["tasks"]),
                            "second-tab task survived full browser restart")
                assert_pass(any(t["id"] == first["tasks"][0]["id"] for t in persisted["tasks"]),
                            "imported calendar task survived full browser restart")
                print("RESULT: Linux Chromium real file:// calendar workflow PASS. Production NO-GO.", flush=True)
            finally:
                ctx.close()


if __name__ == "__main__":
    main()
