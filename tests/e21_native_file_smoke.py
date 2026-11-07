#!/usr/bin/env python3
"""Bounded E20 native file:// smoke on an isolated, disposable Chromium profile.

This is NOT Windows/Edge, real CV persistence, cross-tab conflict, or production
acceptance. It never inspects, imports, or alters an existing user profile.
"""
import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
E20 = ROOT / "development" / "e21"
APP = E20 / "Ledger_CV_Studio_E21_Style_Safe_Docx_Import.html"
QA = E20 / "Ledger_CV_Studio_E21_Offline_QA.html"
EXPECTED = "9d27f843eeee774d081fcc936b87da3196ab28d4f4bb94939a5d5e6a215689d2"


def require(condition, description):
    if not condition:
        raise AssertionError(description)
    print("PASS: " + description, flush=True)


def listen(page, errors, requests):
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on(
        "request",
        lambda request: requests.append(request.url)
        if request.url.startswith(("http://", "https://"))
        else None,
    )


def open_app(page, errors, requests):
    listen(page, errors, requests)
    page.goto(APP.as_uri(), wait_until="load", timeout=45000)
    page.wait_for_function(
        "document.querySelector('#app') && document.querySelector('.screen.active')",
        timeout=25000,
    )
    require(page.evaluate("location.protocol") == "file:", "genuine file:// app load")
    require("Ledger" in page.title(), "Ledger title is present")
    require(bool(page.locator("#app").inner_text().strip()), "app shell contains visible text")
    require(not errors, "no uncaught JavaScript exceptions during app boot")


def main():
    require(hashlib.sha256(APP.read_bytes()).hexdigest() == EXPECTED, "app hash matches E20 delivery")
    require(QA.exists(), "frozen standalone offline QA is present")
    errors = []
    external = []
    key = "ledger_qa_probe_native_ci_" + uuid4().hex
    token = uuid4().hex

    with TemporaryDirectory(prefix="ledger_e20_native_") as profile:
        with sync_playwright() as p:
            def launch():
                return p.chromium.launch_persistent_context(
                    profile,
                    headless=True,
                    viewport={"width": 1280, "height": 800},
                    accept_downloads=True,
                )

            context = launch()
            try:
                page = context.pages[0] if context.pages else context.new_page()
                open_app(page, errors, external)
                # The app's own demo creates synthetic CV data via its normal
                # version/save path. This is distinct from the isolated probe.
                page.locator('button[data-action="try-demo"]').click()
                page.wait_for_function(
                    "document.querySelector('#app')?.textContent?.includes('Store Manager')",
                    timeout=25000,
                )
                require("Store Manager" in page.locator("#app").inner_text(),
                        "app-created synthetic demo CV appears in editor")

                page.evaluate("([key,value]) => localStorage.setItem(key,value)", [key, token])
                require(page.evaluate("key => localStorage.getItem(key)", key) == token,
                        "isolated app-profile storage write/read")

                page.goto(QA.as_uri(), wait_until="load", timeout=45000)
                page.locator("#run").click()
                page.wait_for_function("!document.querySelector('#run').disabled", timeout=45000)
                require(page.locator("#results .fail").count() == 0,
                        "offline QA browser capability probes have no failure")
                require("offline file mode" in page.locator("#results").inner_text().lower(),
                        "QA ran actual file:// mode capability probe")
                page.locator("#sourceFile").set_input_files(str(APP))
                page.wait_for_function(
                    "document.querySelector('#fileCheck').textContent.includes('release match=true')",
                    timeout=45000,
                )
                require(page.locator("#fileCheck").inner_text().startswith("PASS:"),
                        "offline QA validates exact app SHA-256 and feature markers")

                page.locator("#restartStart").click()
                page.wait_for_function(
                    "document.querySelector('#restartStatus').textContent.startsWith('STARTED:')",
                    timeout=30000,
                )
                require(not external, "no HTTP(S) network requests from app or offline QA")
                context.close()

                context = launch()
                page = context.pages[0] if context.pages else context.new_page()
                page.goto(APP.as_uri(), wait_until="load", timeout=45000)
                page.wait_for_function(
                    "document.querySelector('#app')?.textContent?.includes('Store Manager')",
                    timeout=25000,
                )
                require("Store Manager" in page.locator("#app").inner_text(),
                        "actual synthetic app CV persisted across browser process restart")
                require(page.evaluate("key => localStorage.getItem(key)", key) == token,
                        "app-profile localStorage survived browser process restart")
                page.evaluate("key => localStorage.removeItem(key)", key)
                listen(page, errors, external)
                page.goto(QA.as_uri(), wait_until="load", timeout=45000)
                page.locator("#restartVerify").click()
                page.wait_for_function(
                    "document.querySelector('#restartStatus').textContent.startsWith('PASS:')",
                    timeout=30000,
                )
                require("Both isolated storage records survived" in page.locator("#restartStatus").inner_text(),
                        "QA localStorage + IndexedDB survived restart and were erased")
                require(not external, "no HTTP(S) network requests after process restart")
                require(not errors, "no observed uncaught JavaScript exceptions")
                print(json.dumps({
                    "test": "e21-native-file-chromium-linux-or-windows",
                    "status": "pass",
                    "app_sha256": EXPECTED,
                    "profile": "temporary-and-deleted",
                    "uses_actual_file_protocol": True,
                    "true_browser_process_restart": True,
                    "remaining_gates": [
                        "Windows Chrome and Edge",
                        "real user CV save and error recovery",
                        "cross-tab conflict and quota failures",
                        "PDF/DOCX fidelity",
                        "screen reader/mobile/RTL",
                        "authorized BYOK",
                    ],
                    "production": "NO-GO",
                }, indent=2), flush=True)
            finally:
                context.close()


if __name__ == "__main__":
    main()
