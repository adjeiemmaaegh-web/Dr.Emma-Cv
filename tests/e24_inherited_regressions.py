#!/usr/bin/env python3
"""Run frozen legacy regression harnesses against E24, without modifying their own baselines.

Every run uses synthetic data. The old E20/E21/E22 files stay byte-identical.
This is not an owner-device signoff or proof of real Microsoft Word fidelity.
"""
import importlib.util
import os
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'development/e24/Ledger_CV_Studio_E24_Offline_Calendar_Timezones.html'
SHA='4d99390d87619839374b60b22220241557f7a6fb966567ea637c8fae5625d52d'
SUITES={
 'docx':'tests/e21_native_docx_style.py',
 'documents':'tests/e20_native_document_acceptance.py',
 'calendar':'tests/e20_native_calendar_acceptance.py',
 'print':'tests/e22_native_all_templates.py',
}

def main():
 if len(sys.argv)!=2 or sys.argv[1] not in SUITES:
  raise SystemExit('Usage: python tests/e24_inherited_regressions.py '+ '|'.join(SUITES))
 from hashlib import sha256
 assert sha256(APP.read_bytes()).hexdigest()==SHA,'E24 checksum mismatch'
 key=sys.argv[1]
 source=ROOT/SUITES[key]
 spec=importlib.util.spec_from_file_location('ledger_e24_inherited_'+key,source)
 module=importlib.util.module_from_spec(spec)
 spec.loader.exec_module(module)
 module.APP=APP
 if hasattr(module,'EXPECTED'):module.EXPECTED=SHA
 if hasattr(module,'SHA'):module.SHA=SHA
 print('E24 inherited '+key+' regression via exact file:// '+str(APP),flush=True)
 module.main()
 print('E24 inherited '+key+' PASS; original legacy test is unchanged; production NO-GO.',flush=True)

if __name__=='__main__':
 main()
