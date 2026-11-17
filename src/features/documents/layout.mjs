/**
 * Group B Stage 7: deterministic block building and pagination.
 * Output order == logical reading order == text-extraction order (ATS safe, single flow).
 */
import {PAPER_SIZES,resolveStyle} from '../templates/registry.mjs';
export const DEFAULT_SECTION_ORDER=Object.freeze(['summary','experience','education','skills','certifications','languages','projects','accomplishments','hobbies','references']);
const OPTIONAL=new Set(['certifications','languages','projects','accomplishments','hobbies','references']);
const TITLES={summary:'Summary',experience:'Experience',education:'Education',skills:'Skills',certifications:'Certifications',
 languages:'Languages',projects:'Projects',accomplishments:'Accomplishments',hobbies:'Interests',references:'References'};
const ENT={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ','#39':"'"};
const decode=s=>s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(m,e)=>{
 if(e[0]==='#'){const n=e[1]==='x'||e[1]==='X'?parseInt(e.slice(2),16):parseInt(e.slice(1),10);
  return Number.isFinite(n)&&n>8&&n<0x110000?String.fromCodePoint(n):'';}
 return ENT[e.toLowerCase()]??m;});
/** Rich-text description (legacy HTML) -> plain lines; list items become bullets. */
export function htmlToLines(html){
 if(typeof html!=='string'||!html)return [];
 const s=html.replace(/<(script|style)[\s\S]*?<\/\1>/gi,'')
  .replace(/<li[^>]*>/gi,'\n• ').replace(/<\/(p|div|ul|ol|h\d)>|<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,'');
 return decode(s).split(/\n/).map(x=>x.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[ \t]+/g,' ').trim()).filter(Boolean)
  .map(l=>l.startsWith('•')?{bullet:true,text:l.slice(1).trim()}:{bullet:false,text:l});
}
const str=v=>typeof v==='string'?v.trim():v==null?'':String(v).trim();
const SAFE_URL=/^(https?:\/\/|mailto:)/i;
const toUrl=v=>{v=str(v);if(!v)return null;if(SAFE_URL.test(v))return v;if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))return 'mailto:'+v;
 return /^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(v)?'https://'+v:null;};
const dates=e=>{const a=str(e.start),b=e.current?'Present':str(e.end);return a&&b?a+' – '+b:a||b;};
const join=(...p)=>p.map(str).filter(Boolean).join(' | ');
function sectionBlocks(key,doc){
 const out=[],title=TITLES[key];
 const push=(b)=>out.push({keepWithNext:false,links:[],...b});
 const head=()=>push({kind:'section-title',text:title,keepWithNext:true});
 const list=doc[key];
 if(key==='summary'||key==='hobbies'||key==='references'){
  const lines=key==='summary'?[str(doc[key])]:htmlToLines(doc[key]).map(l=>l.text);
  const body=lines.flatMap(l=>String(l).split(/\n+/)).map(str).filter(Boolean);
  if(!body.length)return [];head();body.forEach(t=>push({kind:'line',text:t}));return out;
 }
 if(!Array.isArray(list)||!list.length)return [];
 if(key==='skills'){
  const names=list.map(s=>str(s.name)).filter(Boolean);
  if(!names.length)return [];head();push({kind:'line',text:names.join(', ')});return out;
 }
 head();
 for(const e of list){
  if(key==='experience'){
   const t=join(e.title,e.employer);if(!t&&!dates(e))continue;
   push({kind:'entry-head',text:t||'Role',right:dates(e),keepWithNext:true});
   if(str(e.location))push({kind:'line',text:str(e.location),keepWithNext:true,muted:true});
   const ls=htmlToLines(e.description);ls.forEach(l=>push({kind:l.bullet?'bullet':'line',text:l.text}));
  }else if(key==='education'){
   const t=join(e.degree||e.title,e.school||e.institution);if(!t)continue;
   push({kind:'entry-head',text:t,right:dates(e),keepWithNext:true});
   htmlToLines(e.description).forEach(l=>push({kind:l.bullet?'bullet':'line',text:l.text}));
  }else if(key==='languages'){
   const t=join(e.name||e.language,e.level);if(t)push({kind:'line',text:t});
  }else{
   const t=join(e.name||e.title,e.issuer||e.organization||e.date);
   if(!t)continue;
   const url=toUrl(e.url||e.link);
   push({kind:'entry-head',text:t,right:str(e.date),links:url?[{text:t,url}]:[],keepWithNext:true});
   htmlToLines(e.description).forEach(l=>push({kind:l.bullet?'bullet':'line',text:l.text}));
  }
 }
 if(out.length===1)return [];
 return out;
}
export function buildBlocks(doc,appearance={}){
 const style=resolveStyle(appearance),p=doc.personalInfo||{},blocks=[],warnings=[];
 const name=[p.firstName,p.lastName].map(str).filter(Boolean).join(' ');
 if(name)blocks.push({kind:'name',text:name,links:[]});
 if(str(p.title))blocks.push({kind:'title',text:str(p.title),links:[]});
 const links=[];
 const contact=[];
 for(const k of ['email','phone']) if(str(p[k])){contact.push(str(p[k]));if(k==='email'){const u=toUrl(p.email);if(u)links.push({text:str(p.email),url:u});}}
 const place=[p.city,p.postcode].map(str).filter(Boolean).join(' ');if(place)contact.push(place);
 for(const k of ['linkedin','website']) if(str(p[k])){contact.push(str(p[k]));const u=toUrl(p[k]);if(u)links.push({text:str(p[k]),url:u});}
 if(contact.length)blocks.push({kind:'contact',text:contact.join(' | '),links,keepWithNext:false});
 const order=(style.sectionOrder&&style.sectionOrder.length?style.sectionOrder:DEFAULT_SECTION_ORDER).filter(k=>TITLES[k]);
 const seen=new Set(order);for(const k of DEFAULT_SECTION_ORDER)if(!seen.has(k))order.push(k);
 for(const key of order){
  if(OPTIONAL.has(key)&&style.enabledSections&&style.enabledSections[key]===false)continue;
  blocks.push(...sectionBlocks(key,doc));
 }
 for(const c of Array.isArray(doc.customSections)?doc.customSections:[]){
  const t=str(c.title||c.name);if(!t)continue;
  blocks.push({kind:'section-title',text:t,keepWithNext:true,links:[]});
  const ls=htmlToLines(c.content||c.description);
  if(!ls.length)blocks.pop();else ls.forEach(l=>blocks.push({kind:l.bullet?'bullet':'line',text:l.text,links:[]}));
 }
 if(style.columns==='sidebar')warnings.push('Sidebar template is exported as a single column to keep reading order ATS-safe.');
 return {blocks,style,warnings};
}
/* ---- deterministic text measurement (Helvetica/Times average metrics, conservative) ---- */
export function textWidth(text,size,font='sans',bold=false){
 let w=0;
 for(const ch of text){
  const c=ch.codePointAt(0);
  let f=0.52;
  if(' ijl.,;:\'|!()[]/\\-–•'.includes(ch))f=0.30;
  else if('mwMW@%—'.includes(ch))f=0.84;
  else if(c>=65&&c<=90)f=0.68;
  else if(c>=48&&c<=57)f=0.556;
  else if(c>255)f=1.0;
  if(font==='serif')f*=0.95;
  if(bold)f*=1.06;
  w+=f*size;
 }
 return w*1.02;
}
export function wrapText(text,maxWidth,size,font,bold){
 const words=text.split(/\s+/).filter(Boolean),lines=[];let cur='';
 const fits=s=>textWidth(s,size,font,bold)<=maxWidth;
 for(let word of words){
  while(!fits(word)&&word.length>1){ // hard-break overlong tokens (URLs) rather than clip
   let n=word.length-1;while(n>1&&!fits(word.slice(0,n)))n--;
   if(cur){lines.push(cur);cur='';}
   lines.push(word.slice(0,n));word=word.slice(n);
  }
  const t=cur?cur+' '+word:word;
  if(fits(t))cur=t;else{if(cur)lines.push(cur);cur=word;}
 }
 if(cur)lines.push(cur);
 return lines.length?lines:[''];
}
const BLOCK_STYLE=(k,s)=>({
 name:{size:s.size*2.2,bold:true,before:0,after:2},title:{size:s.size*1.2,bold:false,before:0,after:3},
 contact:{size:s.size*0.95,bold:false,before:0,after:8},
 'section-title':{size:s.size*1.15,bold:true,before:10,after:3},
 'entry-head':{size:s.size,bold:true,before:5,after:1},line:{size:s.size,bold:false,before:0,after:1},
 bullet:{size:s.size,bold:false,before:0,after:1,indent:12}
}[k]);
/** Paginate to pages of positioned lines. Keep-with-next groups are never split when they fit a page. */
export function paginate(blocks,style){
 const paper=PAPER_SIZES[style.paper]||PAPER_SIZES.A4;
 const width=paper.width-2*style.margin,usable=paper.height-2*style.margin;
 const units=[];let cur=[];
 for(const b of blocks){
  const st=BLOCK_STYLE(b.kind,style);
  const indent=st.indent||0;
  const text=style.caps&&(b.kind==='section-title'||b.kind==='name')?b.text.toUpperCase():b.text;
  const rightW=b.right?textWidth(b.right,st.size,style.font,false)+12:0;
  const lines=wrapText(text,width-indent-rightW,st.size,style.font,st.bold);
  const centered=style.header==='centered'&&(b.kind==='name'||b.kind==='title'||b.kind==='contact');
  const lh=st.size*style.lineHeight;
  const entry={block:b,st,indent,centered,lh,lines:lines.map((t,i)=>({text:t,first:i===0}))};
  entry.height=st.before*(style.lineHeight/1.35)+lines.length*lh+st.after;
  cur.push(entry);
  if(!b.keepWithNext){units.push(cur);cur=[];}
 }
 if(cur.length)units.push(cur);
 const pages=[[]];let y=0;
 const place=(entry,startFresh)=>{
  const pg=pages[pages.length-1];
  y+=pg.length||y?entry.st.before*(style.lineHeight/1.35):0;
  entry.lines.forEach((l,i)=>{
   if(y+entry.lh>usable&&pg.length){pages.push([]);y=0;}
   const page=pages[pages.length-1];
   y+=entry.lh;
   page.push({kind:entry.block.kind,text:l.text,right:l.first?entry.block.right:undefined,
    size:entry.st.size,bold:entry.st.bold,muted:entry.block.muted||false,x:style.margin+entry.indent,
    y:style.margin+y-entry.lh*0.25,centered:entry.centered,bullet:entry.block.kind==='bullet'&&l.first,
    links:l.first?(entry.block.links||[]):[],paperWidth:paper.width,textWidth:width-entry.indent});
  });
  y+=entry.st.after;
 };
 for(const unit of units){
  const h=unit.reduce((a,e)=>a+e.height,0);
  if(y+h>usable&&h<=usable&&pages[pages.length-1].length){pages.push([]);y=0;}
  unit.forEach(e=>place(e));
 }
 return {pages:pages.filter(p=>p.length),paper};
}
/** Logical text in reading order, as a parser should see it. */
export function pagesToText(pages){
 return pages.map(pg=>pg.map(l=>(l.bullet?'• ':'')+l.text+(l.right?' — '+l.right:'')).join('\n')).join('\n\f\n');
}
export function layoutDocument(doc,appearance){
 const {blocks,style,warnings}=buildBlocks(doc,appearance);
 const {pages,paper}=paginate(blocks,style);
 return {pages:pages.length?pages:[[]],paper,style,warnings,blocks};
}
