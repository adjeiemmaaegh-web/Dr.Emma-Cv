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
/** Resolve styles that hide runs or whole paragraphs, including inherited styles. */
function hiddenStyles(xml){
 const byId=new Map(),hidden=new Set();
 for(const m of xml.matchAll(/<w:style\b([^>]*)>([\s\S]*?)<\/w:style>/g)){
  const id=m[1].match(/\bw:styleId="([^"]+)"/)?.[1];if(!id)continue;
  const parent=m[2].match(/<w:basedOn\b[^>]*w:val="([^"]+)"/)?.[1];
  byId.set(id,{parent,hidden:/<w:(?:vanish|webHidden|specVanish)\b(?![^>]*w:val="(?:0|false)")/.test(m[2])});
 }
 const visit=(id,seen=new Set())=>{
  if(!id||seen.has(id))return false;
  seen.add(id);const value=byId.get(id);
  return !!value&&(value.hidden||visit(value.parent,seen));
 };
 for(const id of byId.keys())if(visit(id))hidden.add(id);
 return hidden;
}
const vanish=/<w:(?:vanish|webHidden|specVanish)\b(?![^>]*w:val="(?:0|false)")/;
function xmlToText(xml,warnings,label,hiddenStyleIds=new Set()){
 let omittedRuns=0,omittedParagraphs=0,deletedRuns=0;
 const original=xml;
 // Rejected changes and removed text are not candidate facts.
 xml=xml.replace(/<w:(del|moveFrom)\b[^>]*>[\s\S]*?<\/w:\1>/g,()=>{
  deletedRuns++;return '';
 });
 const paragraphs=chunk=>{
  const lines=[];
  for(const match of chunk.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)){
   const p=match[1];
   const pStyle=p.match(/<w:pStyle\b[^>]*w:val="([^"]+)"/)?.[1];
   if(pStyle&&hiddenStyleIds.has(pStyle)){omittedParagraphs++;continue;}
   const isList=/<w:numPr\b/.test(p);
   let t='';
   for(const run of p.matchAll(/<w:r(?:\s[^>]*)?>([\s\S]*?)<\/w:r>/g)){
    const r=run[1],style=r.match(/<w:rStyle\b[^>]*w:val="([^"]+)"/)?.[1];
    if(vanish.test(r)||(style&&hiddenStyleIds.has(style))){omittedRuns++;continue;}
    t+=[...r.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:(?:br|cr)\b[^>]*\/>|<w:noBreakHyphen\b[^>]*\/>/g)]
     .map(m=>m[1]!==undefined?dec(m[1]):/^<w:tab/.test(m[0])?'\t':/^<w:noBreak/.test(m[0])?'-':'\n').join('');
   }
   t=t.trim();if(t)lines.push(isList?'• '+t:t);
  }
  return lines.join('\n');
 };
 // Preserve table row/cell boundaries instead of concatenating unrelated cells.
 const chunks=xml.split(/(<\/w:tc>|<\/w:tr>)/);
 let text='';
 for(const chunk of chunks){
  if(chunk==='</w:tc>'){text=text.replace(/\n+$/,'')+'\t';continue;}
  if(chunk==='</w:tr>'){text=text.replace(/\t+$/,'')+'\n';continue;}
  const part=paragraphs(chunk);if(!part)continue;
  text+=text&&!/[\n\t]$/.test(text)?'\n'+part:part;
 }
 if(omittedRuns)warnings.push(omittedRuns+' hidden text run(s) in '+label+' were omitted.');
 if(omittedParagraphs)warnings.push(omittedParagraphs+' hidden paragraph(s) in '+label+' were omitted.');
 if(deletedRuns)warnings.push(deletedRuns+' deleted tracked-change block(s) in '+label+' were omitted.');
 if(/<w:hyperlink\b/.test(original))warnings.push('Links in '+label+' were imported as visible labels. Check their destinations in the original Word file.');
 return text.replace(/\n{3,}/g,'\n\n').trim();
}
/** Reads body, headers and footers; reports tables/text boxes limitations. inflate is injectable for tests/Node. */
export async function docxToImportText(bytes,{inflate}={}){
 const files=await unzipEntries(bytes,{want:n=>/^word\/(document|header\d*|footer\d*|styles)\.xml$/.test(n),inflate});
 const warnings=[];
 const body=files.get('word/document.xml');
 if(!body)throw new Error('Not a Word document (word/document.xml missing)');
 const parts=[];
 const styleIds=hiddenStyles(files.has('word/styles.xml')?bytesToText(files.get('word/styles.xml')):'');
 const xml=bytesToText(body);
 if(/<w:(?:ins|del|moveFrom|moveTo)\b/.test(xml))warnings.push('Tracked changes were detected. Deleted text is omitted; review accepted text against Word.');
 if(/<w:txbxContent/.test(xml))warnings.push('Text boxes were found; their order may not match the visual layout.');
 if(/<w:tbl>/.test(xml))warnings.push('Tables were found; review column text order.');
 for(const [name,data] of [...files].filter(([n])=>n!=='word/styles.xml').sort(([a],[b])=>a.localeCompare(b))){
  const label=name.replace('word/','');
  const t=xmlToText(bytesToText(data),warnings,label,styleIds);
  if(!t)continue;
  if(name!=='word/document.xml')warnings.push('Text from '+label+' was added; review it for repeated contact details.');
  parts.push(name==='word/document.xml'?{o:1,t}:{o:name.startsWith('word/header')?0:2,t});
 }
 parts.sort((a,b)=>a.o-b.o);
 return {text:parts.map(p=>p.t).join('\n'),warnings};
}
