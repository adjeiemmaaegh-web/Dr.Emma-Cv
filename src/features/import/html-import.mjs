/** HTML/DOCX -> plain text for review. Hidden or omitted content is reported, never silently imported. */
import {unzipEntries,bytesToText} from '../documents/zip.mjs';
const ENT={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
const dec=s=>s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(m,e)=>{if(e[0]==='#'){const n=e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):parseInt(e.slice(1),10);return n>8&&n<0x110000?String.fromCodePoint(n):'';}return ENT[e.toLowerCase()]??m;});
export function htmlToImportText(html){
 const warnings=[];let h=String(html).replace(/<!--[\s\S]*?-->/g,'');
 h=h.replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi,'');
 const hiddenRx=/<([a-z0-9]+)\b[^>]*(?:\bhidden\b|aria-hidden\s*=\s*["']true["']|style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0)[^"']*["'])[^>]*>[\s\S]*?<\/\1>/gi;
 let hidden=0;h=h.replace(hiddenRx,()=>{hidden++;return '';});
 if(hidden)warnings.push(hidden+' hidden element(s) were omitted from the import.');
 h=h.replace(/<li[^>]*>/gi,'\n• ').replace(/<\/t[dh]>/gi,'  ').replace(/<\/(p|div|tr|ul|ol|h\d|section|header|footer|table)>|<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,'');
 const text=dec(h).split('\n').map(l=>l.replace(/[ \t]+/g,' ').trim()).join('\n').replace(/\n{3,}/g,'\n\n').trim();
 return {text,warnings};
}
const rx={vanish:/<w:vanish\b(?![^>]*w:val="(?:0|false)")[^>]*\/?>/};
function xmlToText(xml,warnings,label){
 let hidden=0;
 const paras=xml.split(/<\/w:p>/).map(p=>{
  const isList=/<w:numPr>/.test(p);
  let t='';
  for(const r of p.split(/<w:r[ >]/).slice(1)){
   if(rx.vanish.test(r)){hidden++;continue;}
   t+=[...r.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g)].map(m=>m[1]!==undefined?dec(m[1]):m[0]==='<w:tab/>'?'  ':'\n').join('');
  }
  t=t.trim();return t?(isList?'• '+t:t):'';
 }).filter(x=>x!=='');
 if(hidden)warnings.push(hidden+' hidden text run(s) in '+label+' were omitted.');
 return paras.join('\n');
}
/** Reads body, headers and footers; reports tables/text boxes limitations. inflate is injectable for tests/Node. */
export async function docxToImportText(bytes,{inflate}={}){
 const files=await unzipEntries(bytes,{want:n=>/^word\/(document|header\d*|footer\d*)\.xml$/.test(n),inflate});
 const warnings=[];
 const body=files.get('word/document.xml');
 if(!body)throw new Error('Not a Word document (word/document.xml missing)');
 const parts=[];
 const xml=bytesToText(body);
 if(/<w:txbxContent/.test(xml))warnings.push('Text boxes were found; their order may not match the visual layout.');
 if(/<w:tbl>/.test(xml))warnings.push('Tables were found; review column text order.');
 for(const [name,data] of [...files].sort(([a],[b])=>a.localeCompare(b))){
  const label=name.replace('word/','');
  const t=xmlToText(bytesToText(data),warnings,label);
  if(!t)continue;
  if(name!=='word/document.xml')warnings.push('Text from '+label+' was added; review it for repeated contact details.');
  parts.push(name==='word/document.xml'?{o:1,t}:{o:name.startsWith('word/header')?0:2,t});
 }
 parts.sort((a,b)=>a.o-b.o);
 return {text:parts.map(p=>p.t).join('\n'),warnings};
}
