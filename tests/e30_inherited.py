#!/usr/bin/env python3
"""Run unchanged historical native tests against E30 hosted HTML."""
import hashlib,importlib.util,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'site/index.html'
SUITES={'hosted':'tests/e29_hosted_web.py','docx':'tests/e21_native_docx_style.py',
        'export':'tests/e20_native_document_acceptance.py','templates':'tests/e22_native_all_templates.py'}
def main():
 if len(sys.argv)!=2 or sys.argv[1] not in SUITES:
  raise SystemExit('Usage: python tests/e30_inherited.py '+'|'.join(SUITES))
 report=json.loads((ROOT/'site/site-integrity.json').read_text())
 sha=hashlib.sha256(APP.read_bytes()).hexdigest()
 assert report['hostedHtmlSha256']==sha,'E30 artifact checksum mismatch'
 key=sys.argv[1]
 spec=importlib.util.spec_from_file_location('e30_original_'+key,ROOT/SUITES[key])
 suite=importlib.util.module_from_spec(spec);spec.loader.exec_module(suite)
 if hasattr(suite,'APP'):suite.APP=APP
 if hasattr(suite,'EXPECTED'):suite.EXPECTED=sha
 if hasattr(suite,'SHA'):suite.SHA=sha
 print('E30 inherited '+key+' on exact hosted artifact',flush=True)
 suite.main()
 print('E30 inherited '+key+' PASS; release acceptance remains open',flush=True)
if __name__=='__main__':main()
