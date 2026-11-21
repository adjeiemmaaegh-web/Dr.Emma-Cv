/** Editable DOCX (WordprocessingML) writer: real headings, list numbering, hyperlinks, paper size and margins. */
import {zipStore,utf8} from './zip.mjs';
import {PHOTO_WIDTH_PT,PHOTO_HEIGHT_PT,PHOTO_RESERVED_PT} from './cv-photo.mjs';
const esc=s=>String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const tw=pt=>Math.round(pt*20);
const run=(text,{bold,color,size,font}={})=>'<w:r><w:rPr>'+(font?'<w:rFonts w:ascii="'+font+'" w:hAnsi="'+font+'" w:cs="'+font+'"/>':'')+(bold?'<w:b/>':'')+(color?'<w:color w:val="'+color+'"/>':'')+(size?'<w:sz w:val="'+Math.round(size*2)+'"/>':'')+'</w:rPr><w:t xml:space="preserve">'+esc(text)+'</w:t></w:r>';
export function renderDocx({blocks,style,paper,title='CV',photo=null}){
 const font=style.font==='serif'?'Times New Roman':'Calibri',color=style.color.slice(1).toUpperCase();
 const rels=[];const rel=url=>{rels.push(url);return 'rIdL'+rels.length;};
 const right=tw(paper.width-2*style.margin);
 const para=(b)=>{
  const k=b.kind,align=style.header==='centered'&&(k==='name'||k==='title'||k==='contact')?'<w:jc w:val="center"/>':'';
  const keep=b.keepWithNext?'<w:keepNext/>':'';
  const text=style.caps&&(k==='section-title'||k==='name')?b.text.toUpperCase():b.text;
  const size={name:style.size*style.headerScale,title:style.size*1.2,'section-title':style.size*style.headingScale}[k]||style.size;
  const spacing='<w:spacing w:before="'+tw(k==='section-title'?style.sectionGap:k==='entry-head'?style.entryGap:0)+'" w:after="'+tw(k==='contact'?8:style.paragraphGap)+'" w:line="'+Math.round(style.lineHeight*240)+'" w:lineRule="auto"/>';
  let ppr='<w:pPr>'+({name:'<w:pStyle w:val="Title"/>','section-title':'<w:pStyle w:val="Heading1"/>','entry-head':'<w:pStyle w:val="Heading2"/>',bullet:'<w:pStyle w:val="ListBullet"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>'}[k]||'')+keep;
  if(k==='section-title'&&style.rules!=='none'){
   const edge=['left-bar','timeline'].includes(style.rules)?'left':'bottom';
   const line=style.rules==='double'?'double':'single',thickness=Math.max(4,Math.min(42,Math.round(style.ruleWeight*(style.rules==='bar'?33:13))));
   ppr+='<w:pBdr><w:'+edge+' w:val="'+line+'" w:sz="'+thickness+'" w:space="3" w:color="'+color+'"/></w:pBdr>';
  }
  if(k==='name'&&style.header==='band')ppr+='<w:shd w:val="clear" w:fill="EEF3F7"/>';
  if(k==='name'&&style.header==='badge')ppr+='<w:pBdr><w:left w:val="single" w:sz="22" w:space="4" w:color="'+color+'"/></w:pBdr>';
  if(k==='entry-head'&&b.right)ppr+='<w:tabs><w:tab w:val="right" w:pos="'+right+'"/></w:tabs>';
  ppr+=spacing+align+'</w:pPr>';
  const bold=k==='name'||k==='section-title'||k==='entry-head';
  const col=k==='name'||k==='section-title'?color:b.muted?'595959':undefined;
  let body='';
  const link=(b.links||[]).find(l=>/^(https?:\/\/|mailto:)/i.test(l.url)&&text.includes(l.text));
  if(link){
   const i=text.indexOf(link.text);
   body=(i>0?run(text.slice(0,i),{bold,color:col,size,font}):'')+
    '<w:hyperlink r:id="'+rel(link.url)+'" w:history="1">'+run(link.text,{color:'0563C1',size,font}).replace('<w:rPr>','<w:rPr><w:u w:val="single"/>')+'</w:hyperlink>'+
    (i+link.text.length<text.length?run(text.slice(i+link.text.length),{bold,color:col,size,font}):'');
  }else body=run(text,{bold,color:col,size,font});
  if(k==='entry-head'&&b.right)body+='<w:r><w:tab/></w:r>'+run(b.right,{size,font});
  return '<w:p>'+ppr+body+'</w:p>';
 };
 const pageBorder=(()=>{
  const edge=style.pageAccent;
  if(edge!=='top-rule'&&edge!=='side-rail')return '';
  const size=Math.max(4,Math.min(32,Math.round(style.ruleWeight*13)));
  const side=edge==='top-rule'?'top':'left';
  return '<w:pgBorders w:offsetFrom="text"><w:'+side+' w:val="single" w:sz="'+size+
   '" w:space="14" w:color="'+color+'"/></w:pgBorders>';
 })();
 const photoDrawing=photo?'<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="right"/></w:pPr><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+Math.round(PHOTO_WIDTH_PT*12700)+'" cy="'+Math.round(PHOTO_HEIGHT_PT*12700)+'"/><wp:docPr id="1" name="CV portrait" descr="Optional passport-style photograph"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="portrait.jpg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rIdPhoto"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+Math.round(PHOTO_WIDTH_PT*12700)+'" cy="'+Math.round(PHOTO_HEIGHT_PT*12700)+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>': '';
 const doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+photoDrawing+
  blocks.map(para).join('')+
  '<w:sectPr><w:pgSz w:w="'+tw(paper.width)+'" w:h="'+tw(paper.height)+'"/><w:pgMar w:top="'+tw(style.margin)+'" w:right="'+tw(style.margin)+'" w:bottom="'+tw(style.margin)+'" w:left="'+tw(style.margin)+'" w:header="720" w:footer="720" w:gutter="0"/> ' + pageBorder + '</w:sectPr></w:body></w:document>';
 const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="'+font+'" w:hAnsi="'+font+'" w:cs="'+font+'"/><w:sz w:val="'+Math.round(style.size*2)+'"/></w:rPr></w:rPrDefault></w:docDefaults>'+
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'+
  [['Title','Title',style.size*style.headerScale],['Heading1','heading 1',style.size*style.headingScale],['Heading2','heading 2',style.size]].map(([id,n,s])=>'<w:style w:type="paragraph" w:styleId="'+id+'"><w:name w:val="'+n+'"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/></w:pPr><w:rPr><w:b/><w:sz w:val="'+Math.round(s*2)+'"/></w:rPr></w:style>').join('')+
  '<w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/></w:style></w:styles>';
 const numbering='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="240"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>';
 const docRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdN" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>'+
  (photo?'<Relationship Id="rIdPhoto" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/portrait.jpg"/>':'')+rels.map((u,i)=>'<Relationship Id="rIdL'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="'+esc(u)+'" TargetMode="External"/>').join('')+'</Relationships>';
 const files=[
  {name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+(photo?'<Default Extension="jpg" ContentType="image/jpeg"/>':'')+'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'},
  {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'},
  {name:'docProps/core.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>'+esc(title)+'</dc:title></cp:coreProperties>'},
  {name:'word/document.xml',data:doc},{name:'word/styles.xml',data:styles},{name:'word/numbering.xml',data:numbering},
  {name:'word/_rels/document.xml.rels',data:docRels},
  ...(photo?[{name:'word/media/portrait.jpg',data:photo}]:[])
 ];
 return {bytes:zipStore(files.map(f=>({name:f.name,data:typeof f.data==='string'?utf8(f.data):f.data}))),warnings:style.pageAccent==='corner-marks'?['Decorative corner markers are PDF-only; Word keeps content in editable paragraphs.']:[]};
}
