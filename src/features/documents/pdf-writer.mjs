/** Deterministic PDF 1.4 writer using the standard base-14 fonts. Selectable text in reading order. */
import {textWidth,decorationGeometry} from './layout.mjs';
const hex=c=>{const n=parseInt(c.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255].map(v=>(v/255).toFixed(3));};
const WIN1252=new Map([[0x20AC,128],[0x201A,130],[0x0192,131],[0x201E,132],[0x2026,133],[0x2020,134],[0x2021,135],[0x02C6,136],[0x2030,137],
 [0x0160,138],[0x2039,139],[0x0152,140],[0x017D,142],[0x2018,145],[0x2019,146],[0x201C,147],[0x201D,148],[0x2022,149],[0x2013,150],
 [0x2014,151],[0x02DC,152],[0x2122,153],[0x0161,154],[0x203A,155],[0x0153,156],[0x017E,158],[0x0178,159]]);
/** Returns {text:escaped string, lossy}. Characters outside WinAnsi become '?' and are reported. */
export function winAnsi(s){
 let out='',lossy=false;
 for(const ch of s.normalize('NFC')){
  const c=ch.codePointAt(0);let b;
  if(c>=32&&c<127)b=c;else if(c>=160&&c<=255)b=c;else if(WIN1252.has(c))b=WIN1252.get(c);else if(c===9||c===10)b=32;else{b=63;lossy=true;}
  const chr=String.fromCharCode(b);
  out+=chr==='('||chr===')'||chr==='\\'?'\\'+chr:b>126?'\\'+b.toString(8).padStart(3,'0'):chr;
 }
 return {text:out,lossy};
}
const num=n=>(Math.round(n*100)/100).toString();
export function renderPdf({pages,paper,style,title='CV'}){
 const serif=style.font==='serif',F=serif?['Times-Roman','Times-Bold']:['Helvetica','Helvetica-Bold'];
 const objs=[],add=body=>{objs.push(body);return objs.length;};
 const warnings=[];let lossy=false;
 const catalog=add(''),pagesRef=add('');
 const f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /'+F[0]+' /Encoding /WinAnsiEncoding >>');
 const f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /'+F[1]+' /Encoding /WinAnsiEncoding >>');
 const accent=hex(style.color).join(' ');
 const kids=[];
 for(const page of pages){
  let c='';const annots=[];
  for(const l of page){
   const size=l.size,w=l.textWidth;
   for(const d of decorationGeometry(l,style)){
    const rgb=hex(d.color).join(' ');
    if(d.kind==='rect')c+=rgb+' rg '+num(d.x)+' '+num(paper.height-d.y-d.height)+' '+num(d.width)+' '+num(d.height)+' re f\n';
    else c+=rgb+' RG '+num(d.height)+' w '+num(d.x)+' '+num(paper.height-d.y)+' m '+num(d.x+d.width)+' '+num(paper.height-d.y)+' l S\n';
   }
   const label=(l.bullet?'• ':'')+l.text;
   const t=winAnsi(label);lossy=lossy||t.lossy;
   let x=l.x;
   if(l.centered)x=l.x+Math.max(0,(w-textWidth(label,size,style.font,l.bold))/2);
   const y=paper.height-l.y;
   const colour=l.kind==='section-title'||l.kind==='name'?accent+' rg':l.muted?'0.35 0.35 0.35 rg':'0.07 0.07 0.07 rg';
   c+='BT /F'+(l.bold?2:1)+' '+num(size)+' Tf '+colour+' 1 0 0 1 '+num(x)+' '+num(y)+' Tm ('+t.text+') Tj ET\n';
   if(l.right){
    const r=winAnsi(l.right);lossy=lossy||r.lossy;
    const rx=l.x+w-textWidth(l.right,size,style.font,false);
    c+='BT /F1 '+num(size)+' Tf 0.07 0.07 0.07 rg 1 0 0 1 '+num(rx)+' '+num(y)+' Tm ('+r.text+') Tj ET\n';
   }

   for(const k of l.links||[]){
    if(!/^(https?:\/\/|mailto:)/i.test(k.url))continue;
    annots.push(add('<< /Type /Annot /Subtype /Link /Rect ['+num(l.x)+' '+num(y-2)+' '+num(l.x+w)+' '+num(y+size)+'] /Border [0 0 0] /A << /S /URI /URI ('+winAnsi(k.url).text+') >> >>'));
   }
  }
  const stream=add('<< /Length '+c.length+' >>\nstream\n'+c+'endstream');
  kids.push(add('<< /Type /Page /Parent '+pagesRef+' 0 R /MediaBox [0 0 '+num(paper.width)+' '+num(paper.height)+'] /Resources << /Font << /F1 '+f1+' 0 R /F2 '+f2+' 0 R >> >> /Contents '+stream+' 0 R'+(annots.length?' /Annots ['+annots.map(a=>a+' 0 R').join(' ')+']':'')+' >>'));
 }
 const info=add('<< /Title ('+winAnsi(title).text+') /Producer (Ledger CV Studio) >>');
 objs[catalog-1]='<< /Type /Catalog /Pages '+pagesRef+' 0 R /Lang (en) >>';
 objs[pagesRef-1]='<< /Type /Pages /Count '+kids.length+' /Kids ['+kids.map(k=>k+' 0 R').join(' ')+'] >>';
 let out='%PDF-1.4\n';const offsets=[];
 objs.forEach((b,i)=>{offsets.push(out.length);out+=(i+1)+' 0 obj\n'+b+'\nendobj\n';});
 const xref=out.length;
 out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n'+offsets.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('');
 out+='trailer\n<< /Size '+(objs.length+1)+' /Root '+catalog+' 0 R /Info '+info+' 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
 if(lossy)warnings.push('Some characters are outside the PDF standard font encoding and were replaced with "?". Use DOCX for full Unicode.');
 const bytes=new Uint8Array(out.length);for(let i=0;i<out.length;i++)bytes[i]=out.charCodeAt(i)&255;
 return {bytes,warnings,pageCount:kids.length};
}
const REV=new Map([...WIN1252].map(([u,b])=>[b,String.fromCodePoint(u)]));
const unwin=str=>[...str].map(c=>REV.get(c.charCodeAt(0))??c).join('');
/** Verification hook: text our writer placed, per page, in content-stream (reading) order. */
export function extractPdfText(bytes){
 let s='';for(let i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);
 const pages=[...s.matchAll(/stream\n([\s\S]*?)endstream/g)].map(m=>m[1]);
 return pages.map(c=>[...c.matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map(m=>unwin(m[1].replace(/\\([0-7]{3})/g,(_,o)=>String.fromCharCode(parseInt(o,8))).replace(/\\(.)/g,'$1'))));
}
