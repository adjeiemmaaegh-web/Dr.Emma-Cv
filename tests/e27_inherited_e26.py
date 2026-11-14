#!/usr/bin/env python3
"""Run frozen E26 raster-PDF OCR consent regression on the new E27 artifact."""
import importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('ledger_e27_inherited_e26',ROOT/'tests/e26_native_scanned_pdf.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.APP=ROOT/'dist/Ledger_CV_Studio_E27_Transactional_PDF_Batch_OCR.html'
module.MANIFEST=ROOT/'dist/E27_MANIFEST.json'
if __name__=='__main__':
 print('Testing E27 under the genuine frozen E26 file-origin acceptance suite',flush=True)
 module.main()
 print('Inherited E26 raster PDF+CV acceptance PASS; production remains NO-GO.',flush=True)
