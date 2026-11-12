#!/usr/bin/env python3
"""Run unmodified functional acceptance suites against the E30 hosted distribution.
Test harness rewires artifact SHA/path without modifying original test modules.
"""
import importlib.util,hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'site/index.html'
MANIFEST=ROOT/'site/site-integrity.json'
SUITES={
 'word':'tests/e21_native_docx_style.py',
 'documents':'tests/e20_native_document_acceptance.py',
 'calendar':'tests/e20_native_calendar_acceptance.py',
 'timezones':'tests/e24_native_calendar.py',
 'restart':'tests/e24_native_restart.py',
 'templates':'tests/e22_native_all_templates.py',
 'e27':'tests/e27_native_pdf_batch.py',
 'e26':'tests/e26_native_scanned_pdf.py',
}
def main():
 if len(sys.argv)!=2 or sys.argv[1] not in SUITES:
  raise SystemExit('Usage: python tests/e30_inherited.py '+'|'.join(SUITES))
 data=json.loads(MANIFEST.read_text(encoding='utf-8'))
 sha=data['hostedHtmlSha256']
 assert hashlib.sha256(APP.read_bytes()).hexdigest()==sha,'E30 website integrity mismatch'
 key=sys.argv[1]
 src=ROOT/SUITES[key]
 spec=importlib.util.spec_from_file_location('e30_inherited_'+key,src)
 module=importlib.util.module_from_spec(spec)
 spec.loader.exec_module(module)
 module.APP=APP
 for alias in ['SHA','EXPECTED']:
  if hasattr(module,alias):setattr(module,alias,sha)
 if hasattr(module,'MANIFEST'):
  compat=ROOT/'dist/E30_ACCEPTANCE_MANIFEST.json'
  compat.parent.mkdir(exist_ok=True)
  compat.write_text(json.dumps({'appSha256':sha,'appBytes':len(APP.read_bytes())})+'\n')
  module.MANIFEST=compat
 print('Running original '+src.name+' on real E30 single-file artifact',flush=True)
 module.main()
 print('PASS: original '+key+' test against E30. Real-device acceptance remains open.',flush=True)
if __name__=='__main__':main()
