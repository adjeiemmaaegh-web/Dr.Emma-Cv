#!/usr/bin/env python3
"""Independent Stage F20 native extraction of all synthetic template/paper exports.
Requires pdfinfo and pdftotext (Poppler), Python standard-library DOCX XML.
Does not imply Microsoft Office/LibreOffice visual fidelity or human approval.
"""
import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile

folder=Path(os.environ.get('F20_OUTPUT','')).resolve()
if not folder.is_dir() or not (folder/'manifest.json').is_file():
 raise SystemExit('F20_OUTPUT/manifest.json required (generate synthetic matrix first)')
manifest=json.loads((folder/'manifest.json').read_text())
assert manifest['schema']=='ledger-f20-native-export-matrix'
assert len(manifest['files'])==120
expected=['Ada Example','Operations Manager','ada@example.test','Acme Retail',
          'Bolt Stores','BA Business','Stock control','Scheduling']
def clean(s):
 return re.sub(r'\s+',' ',s).lower().strip()
def command(*args):
 return subprocess.run(args,check=True,capture_output=True,text=True,timeout=30).stdout
def docx_read(blob):
 with zipfile.ZipFile(io.BytesIO(blob)) as z:
  names=z.namelist()
  assert 'word/document.xml' in names
  assert '[Content_Types].xml' in names
  root=ET.fromstring(z.read('word/document.xml'))
  ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
  pieces=[]
  for paragraph in root.findall('.//w:body/w:p',ns):
   pieces.append(''.join(n.text or '' for n in paragraph.findall('.//w:t',ns)))
  size=root.find('.//w:sectPr/w:pgSz',ns)
  assert size is not None
  w=float(size.attrib['{'+ns['w']+'}w'])/20.0
  h=float(size.attrib['{'+ns['w']+'}h'])/20.0
  return '\n'.join(pieces),(w,h)
results=[]
for row in manifest['files']:
 name=row['name']
 if Path(name).name!=name:raise AssertionError('Unsafe filename in manifest')
 blob=(folder/name).read_bytes()
 assert len(blob)==row['size'],(name,'size')
 assert hashlib.sha256(blob).hexdigest()==row['sha256'],(name,'digest')
 paper=row['paper']
 expected_size=(595.28,841.89) if paper=='A4' else (612,792)
 if row['format']=='pdf':
  assert blob.startswith(b'%PDF-'),name
  details=command('pdfinfo',str(folder/name))
  text=command('pdftotext','-raw',str(folder/name),'-')
  pages=re.search(r'^Pages:\s*(\d+)',details,re.M)
  assert pages and int(pages.group(1))>=1,(name,'pdfinfo')
  dims=re.search(r'Page size:\s*([\d.]+) x ([\d.]+) pts',details)
  assert dims,(name,'size info')
  size=tuple(float(dims.group(i)) for i in (1,2))
 else:
  assert blob[:2]==b'PK',name
  text,size=docx_read(blob)
 assert abs(size[0]-expected_size[0])<2 and abs(size[1]-expected_size[1])<2,(name,'paper',size,expected_size)
 normalized=clean(text)
 missing=[term for term in expected if clean(term) not in normalized]
 order_ok=normalized.find('acme retail')<normalized.find('bolt stores')
 results.append({'file':name,'format':row['format'],'paper':paper,'template':row['template'],
  'fieldCount':len(expected),'fieldsFound':len(expected)-len(missing),
  'missing':missing,'experienceOrder':order_ok,'nativeExtractChars':len(text)})
fails=[r for r in results if r['missing'] or not r['experienceOrder']]
total=len(expected)*len(results)
preserved=sum(r['fieldsFound'] for r in results)
report={'schema':'ledger-f20-native-parser-evidence','version':1,
 'status':'PASS' if not fails else 'FAIL','scope':'synthetic native extraction only',
 'sourceManifestSha256':hashlib.sha256((folder/'manifest.json').read_bytes()).hexdigest(),
 'cases':len(results),'checkedCriticalFields':total,
 'preservedCriticalFields':preserved,'fieldPreservation':preserved/total,
 'reportedMissing':fails[:20], 'pdfCases':sum(r['format']=='pdf' for r in results),
 'docxCases':sum(r['format']=='docx' for r in results),
 'caveats':['Not native Microsoft Word visual inspection','No real applicant documents',
  'Synthetic Latin-text-only corpus','Not proof of ATS acceptance or competitor parity']}
(folder/'native-parser-evidence.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['reportedMissing','caveats']},indent=2))
if fails:
 print('Failed items:',json.dumps(fails[:15],indent=2),file=sys.stderr)
 raise SystemExit(1)
