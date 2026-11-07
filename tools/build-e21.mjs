import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// E21 is built from immutable E20 and one auditable source patch.
// This command is for development; end users open the standalone HTML directly.
const root=path.resolve(import.meta.dirname,'..');
const base=fs.readFileSync(path.join(root,'development/e20/Ledger_CV_Studio_E20_Offline_Calendar_Import_2026-11-06.html'),'utf8');
const patch=fs.readFileSync(path.join(root,'development/e21/source/docx_hidden_patch.js'),'utf8');
const expected='9d27f843eeee774d081fcc936b87da3196ab28d4f4bb94939a5d5e6a215689d2';
let app=base;
function change(before,after,label){
  const index=app.indexOf(before);
  if(index===-1||app.indexOf(before,index+1)!==-1)throw Error('E21 build anchor missing/ambiguous: '+label);
  app=app.slice(0,index)+after+app.slice(index+before.length);
}
function replaceFunction(begin,end,content){
 const at=app.indexOf(begin),until=app.indexOf(end,at+begin.length);
 if(at<0||until<0||app.indexOf(begin,at+1)>=0)throw Error('E21 style filter anchors missing/ambiguous');
 app=app.slice(0,at)+content+app.slice(until);
}
replaceFunction('function omitHiddenRuns(doc){','function supplementalText(xml,label){',patch);
change('function supplementalText(xml,label){','function supplementalText(xml,label,styles){','supplemental styles argument');
change(' omitHiddenRuns(doc);\n const out=[];', ' const hiddenCount=omitHiddenRuns(doc,styles);\n const out=[];', 'supplemental filtering');
change(" return global.ledgerE7DocxText(wrapped).trim();\n}\n// Markup-compatibility",
 " return {text:global.ledgerE7DocxText(wrapped).trim(),hiddenCount};\n}\n// Markup-compatibility",'supplemental return');
change(' const hiddenCount=omitHiddenRuns(doc);\n const serializer=new XMLSerializer();',
 ' const styles=await hiddenStyleMap(zip);\n let hiddenCount=omitHiddenRuns(doc,styles);\n const serializer=new XMLSerializer();','styles load before extraction');
change('  const extracted=supplementalText(raw,name);\n  total+=extracted.length;',
 '  const supplementary=supplementalText(raw,name,styles);\n  hiddenCount+=supplementary.hiddenCount;\n  const extracted=supplementary.text;\n  total+=extracted.length;', 'supplemental hidden count');
const marker=" if(header.length)warnings.push('Header text placed before the body; verify duplicated first-page content');";
change(marker," if(hiddenCount&&!warnings.some(w=>w.startsWith('Hidden text')))warnings.push('Hidden text runs were excluded; check the source Word file');\n if(styles.missing.size)warnings.push('Some Word styles could not be resolved; verify text visibility against the original Word file before importing');\n"+marker,'style warnings');
change('hasOmissions:!!(textBoxes.length||alternates.length||embeddedText.length||hiddenCount)||warnings.some(',
 'hasOmissions:!!(textBoxes.length||alternates.length||embeddedText.length||hiddenCount||styles.missing.size)||warnings.some(', 'omission boundary');
const sha=crypto.createHash('sha256').update(app).digest('hex');
if(sha!==expected)throw Error('E21 unexpected generated SHA-256 '+sha);
const released=fs.readFileSync(path.join(root,'development/e21/Ledger_CV_Studio_E21_Style_Safe_Docx_Import.html'),'utf8');
if(app!==released)throw Error('E21 delivered HTML differs from reproducible source');
const out=path.join(root,'dist');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'Ledger_CV_Studio_E21_Style_Safe_Docx_Import.html'),app);
console.log('PASS: reproduced exact E21 standalone HTML, SHA-256 '+sha);
