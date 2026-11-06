#!/usr/bin/env python3
"""Real-file Chromium E20 synthetic DOCX + native Chromium PDF verification.

A4/Letter XML, Zip and text-extractable Chromium PDFs. Not Windows Word,
physical device, visual human, or comprehensive 30-template release acceptance.
"""
import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import zipfile
import xml.etree.ElementTree as ET

import fitz
from playwright.sync_api import sync_playwright

APP = Path(__file__).resolve().parents[1] / "development/e20/Ledger_CV_Studio_E20_Offline_Calendar_Import_2026-11-06.html"
SHA = "e95d851702931d1c4d0b4b3445d4db9d9a6051014529abf067e672576982848f"
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def check(ok, label):
    if not ok:
        raise AssertionError(label)
    print("PASS:", label, flush=True)


def main():
    check(hashlib.sha256(APP.read_bytes()).hexdigest() == SHA, "E20 identity retained")
    with TemporaryDirectory(prefix="ledger_e20_export_") as tmp:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            context = browser.new_context(accept_downloads=True)
            page = context.new_page()
            errors, external = [], []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on("request", lambda r: external.append(r.url)
                    if r.url.startswith(("http://", "https://")) else None)
            page.goto(APP.as_uri(), wait_until="load", timeout=45000)
            check(page.evaluate("location.protocol") == "file:", "genuine local file source")
            page.locator('button[data-action="try-demo"]').click()
            check(page.evaluate("state.document.personalInfo.title") == "Store Manager",
                  "synthetic built-in CV loaded in application")
            expected = {
                "A4": (11906, 16838, 595.3, 841.9),
                "Letter": (12240, 15840, 612.0, 792.0),
            }

            for paper, (twip_width, twip_height, pdf_width, pdf_height) in expected.items():
                with page.expect_download(timeout=20000) as dl:
                    page.evaluate("(p)=>downloadDocx(p)", paper)
                docx = Path(tmp) / (paper + ".docx")
                dl.value.save_as(str(docx))
                with zipfile.ZipFile(docx) as archive:
                    check(archive.testzip() is None, paper + " Word ZIP CRC")
                    root = ET.fromstring(archive.read("word/document.xml"))
                    body = " ".join(node.text or "" for node in root.findall(".//w:t", NS))
                    size = root.find(".//w:pgSz", NS)
                    check(size is not None, paper + " Word paper element present")
                    check(int(size.attrib["{" + NS["w"] + "}w"]) == twip_width and
                          int(size.attrib["{" + NS["w"] + "}h"]) == twip_height,
                          paper + " Word page dimensions correct")
                    check("John" in body and "Smith" in body and "Store Manager" in body,
                          paper + " Word exported applicant data exists")
                    check("Tesco" in body, paper + " Word exported experience exists")

                html = page.evaluate("(p)=>window.ledgerE1VisualExport.build(p)", paper)
                printable = context.new_page()
                printable.set_content(html, wait_until="load", timeout=25000)
                pdf = printable.pdf(format=paper, print_background=True)
                printable.close()
                check(pdf.startswith(b"%PDF-") and pdf.rstrip().endswith(b"%%EOF"),
                      paper + " native Chromium PDF structure")
                with fitz.open(stream=pdf, filetype="pdf") as document:
                    check(document.page_count >= 1, paper + " native PDF has pages")
                    check(abs(document[0].rect.width - pdf_width) < 2 and
                          abs(document[0].rect.height - pdf_height) < 2,
                          paper + " native PDF page dimensions")
                    extracted = "\n".join(p.get_text() for p in document).lower()
                    for text in ("john smith", "store manager", "tesco"):
                        check(text in extracted, paper + " native PDF selectable text: " + text)
                print("EVIDENCE:", paper, "DOCX bytes", docx.stat().st_size,
                      "Chromium PDF bytes", len(pdf), flush=True)

            check(not errors, "no uncaught application JavaScript errors")
            check(not external, "no external HTTP(S) requests")
            context.close()
            browser.close()
    print("RESULT: real-file Linux Chromium A4/Letter native PDF and DOCX package checks PASS; production NO-GO.")


if __name__ == "__main__":
    main()
