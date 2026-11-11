#!/usr/bin/env python3
"""Run inherited genuine-file acceptance suites against built E28, without editing
or weakening the original E20–E27 tests. This does NOT establish release acceptance.
"""
import importlib.util
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'dist/Ledger_CV_Studio_E28_Offline_Visual_PDF_OCR.html'
MANIFEST=ROOT/'dist/E28_MANIFEST.json'
SUITES={
 'e27':'tests/e27_native_pdf_batch.py',
 'e26':'tests/e26_native_scanned_pdf.py',
 'word':'tests/e21_native_docx_style.py',
 'documents':'tests/e20_native_document_acceptance.py',
 'calendar':'tests/e20_native_calendar_acceptance.py',
 'timezones':'tests/e24_native_calendar.py',
 'restart':'tests/e24_native_restart.py',
 'templates':'tests/e22_native_all_templates.py'
}

def main():
 if len(sys.argv)!=2 or sys.argv[1] not in SUITES:
  raise SystemExit('Usage: python tests/e28_inherited.py '+'|'.join(SUITES))
 import hashlib,json
 manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
 checksum=manifest['appSha256']
 assert hashlib.sha256(APP.read_bytes()).hexdigest()==checksum,'E28 file checksum mismatch'
 name=sys.argv[1]
 spec=importlib.util.spec_from_file_location('e28_original_suite_'+name,ROOT/SUITES[name])
 suite=importlib.util.module_from_spec(spec)
 spec.loader.exec_module(suite)
 suite.APP=APP
 for key in ['SHA','EXPECTED']:
  if hasattr(suite,key):setattr(suite,key,checksum)
 if hasattr(suite,'MANIFEST'):suite.MANIFEST=MANIFEST
 print('E28 inherited '+name+' from original '+SUITES[name]+' against actual file:// E28',flush=True)
 suite.main()
 print('E28 inherited '+name+' PASS. Device signoff and production release still NO-GO',flush=True)

if __name__=='__main__':
 main()
