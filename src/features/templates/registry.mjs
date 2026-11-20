/**
 * Group B Stage 6: template registry and appearance customisation.
 * Pure data + validation. Switching templates only rewrites `appearance`, never the document.
 * Legacy ids from Stage 8 are preserved so saved CVs keep resolving.
 */
export const PAPER_SIZES=Object.freeze({A4:{width:595.28,height:841.89},Letter:{width:612,height:792}});
export const FAMILIES=Object.freeze(['classic','executive','graduate','academic','technical','modern','creative']);
const FAMILY_EDGE=Object.freeze({classic:'none',executive:'top-rule',graduate:'none',academic:'none',
 technical:'corner-marks',modern:'top-rule',creative:'side-rail'});
const T=(id,name,family,tokens,color)=>Object.freeze({id,name,family,tokens:Object.freeze({
 layout:'single',header:'left',caps:false,rules:'under-title',font:'sans',density:'standard',
 edge:FAMILY_EDGE[family]||'none',...tokens}),color});
export const TEMPLATES=Object.freeze([
 T('modern','Modern','modern',{header:'left',rules:'under-title'}),
 T('modern-navy','Modern Navy','modern',{header:'left'},'#1e3a5f'),
 T('modern-coral','Modern Coral','modern',{header:'left'},'#C85A34'),
 T('professional','Professional','classic',{header:'band',rules:'double'}),
 T('professional-slate','Professional Slate','classic',{header:'band'},'#4A4A4A'),
 T('executive','Executive','executive',{header:'centered',caps:true,font:'serif',rules:'bar'}),
 T('minimal','Minimal','graduate',{rules:'none'}),
 T('minimal-ink','Minimal Ink','graduate',{rules:'none'},'#111111'),
 T('creative','Creative','creative',{layout:'sidebar',header:'left',rules:'left-bar'}),
 T('creative-forest','Creative Forest','creative',{layout:'sidebar',header:'left'},'#1F5651'),
 T('simple','Simple','classic',{rules:'none',density:'compact'}),
 T('ats-classic','ATS Classic','technical',{rules:'under-title'}),
 T('ats-compact','ATS Compact','technical',{density:'compact'}),
 T('ats-plus','ATS Plus','technical',{caps:true},'#2B6F68'),
 T('trades','Trades','technical',{caps:true,rules:'bar'}),
 T('construction','Construction','technical',{caps:true,rules:'bar'},'#D9531E'),
 T('electrical','Electrical Trades','technical',{rules:'bar'},'#1F4E8C'),
 T('academic','Academic','academic',{font:'serif',rules:'under-title',density:'relaxed'}),
 T('prestige','Prestige','executive',{header:'centered',caps:true,font:'serif',rules:'double'}),
 T('prestige-gold','Prestige Gold','executive',{header:'centered',caps:true,font:'serif',rules:'double'},'#B0793A'),
 T('monogram','Monogram','executive',{header:'badge',font:'serif'}),
 T('monogram-navy','Monogram Navy','executive',{header:'badge',font:'serif'},'#1e3a5f'),
 T('horizon','Horizon','modern',{layout:'sidebar',rules:'timeline'}),
 T('horizon-teal','Horizon Teal','modern',{layout:'sidebar',rules:'timeline'},'#2B6F68'),
 T('classic-serif','Classic Serif','classic',{header:'centered',font:'serif'}),
 T('compact-pro','Compact Pro','executive',{density:'compact'}),
 T('two-column','Two Column','modern',{layout:'sidebar'}),
 T('fresh','Fresh Start','graduate',{rules:'under-title',density:'relaxed'}),
 T('bold-name','Bold Name','creative',{header:'left',rules:'bar',caps:true}),
 T('line-accent','Line Accent','creative',{rules:'left-bar'}),
 T('portrait-rail','Portrait Rail','creative',{layout:'sidebar',header:'left',rules:'under-title',density:'compact',design:'portrait-rail'},'#243f47'),
 T('golden-banner','Golden Banner','executive',{header:'band',rules:'under-title',font:'serif',design:'golden-banner'},'#b7894b'),
 T('ink-frame','Ink Frame','classic',{header:'left',rules:'bar',density:'compact',design:'ink-frame'},'#23363d'),
 T('slate-masthead','Slate Masthead','modern',{header:'centered',rules:'under-title',design:'slate-masthead'},'#405768'),
 T('portrait-split','Portrait Split','creative',{layout:'sidebar',header:'left',rules:'left-bar',design:'portrait-split'},'#496d70'),
 T('stone-column','Stone Column','classic',{layout:'sidebar',header:'left',rules:'double',design:'stone-column'},'#8b7b73'),
 T('charcoal-rail','Charcoal Rail','executive',{layout:'sidebar',header:'left',rules:'bar',density:'compact',design:'charcoal-rail'},'#3b444b'),
 T('silver-outline','Silver Outline','graduate',{header:'centered',rules:'under-title',font:'serif',design:'silver-outline'},'#6f747a')
]);
const BY_ID=new Map(TEMPLATES.map(t=>[t.id,t]));
export const getTemplate=id=>BY_ID.get(id)||BY_ID.get('modern');
export const listTemplates=({family}={})=>TEMPLATES.filter(t=>!family||t.family===family);
const SERIF_FONTS=new Set(['lora','georgia','times','serif','merriweather','playfair']);
export const OPTIONS=Object.freeze({
 fontSize:['small','medium','large'],spacing:['compact','standard','relaxed'],
 margins:['narrow','standard','wide'],paper:['A4','Letter'],
 font:['template','sans','serif'],headerStyle:['template','left','centered','band','badge'],
 columns:['template','single','sidebar'],ruleStyle:['template','none','under-title','double','bar','left-bar','timeline'],
 pageAccent:['template','none','top-rule','side-rail','corner-marks']
});
export const DEFAULT_APPEARANCE=Object.freeze({template:'modern',color:'#2B6F68',font:'template',fontSize:'medium',
 spacing:'standard',margins:'standard',paper:'A4',headerStyle:'template',columns:'template',pageAccent:'template',photo:false});
const COLOR=/^#[0-9a-fA-F]{6}$/;
export const SECTION_KEYS=Object.freeze(['summary','experience','education','skills','certifications','languages','projects','accomplishments','hobbies','references']);
export const NUMERIC_OPTIONS=Object.freeze({bodySize:[8,14],leading:[1.1,1.9],sectionGap:[3,24],marginSize:[24,90],headerScale:[1.7,3.1],
 headingScale:[0.9,1.65],entryGap:[0,15],paragraphGap:[0,7],ruleWeight:[0.4,3]});
const safeSectionKey=k=>typeof k==='string'&&(SECTION_KEYS.includes(k)||/^custom:[a-zA-Z0-9_-]{1,72}$/.test(k));
/** Returns {appearance,errors}. Unknown legacy values degrade to defaults; nothing throws. */
export function normalizeAppearance(input={}){
 const out={...input},errors=[];
 const pick=(key,list)=>{
  if(out[key]===undefined)return;
  if(!list.includes(out[key])){
   if(key==='font'&&SERIF_FONTS.has(String(out.font).toLowerCase()))out.font='serif';
   else if(key==='font'&&typeof out.font==='string'&&out.font)out.font='sans';
   else{errors.push('Unsupported '+key+': '+String(out[key]));out[key]=DEFAULT_APPEARANCE[key];}
  }
 };
 if(out.template===undefined||!BY_ID.has(out.template)){
  if(out.template!==undefined)errors.push('Unknown template: '+String(out.template));
  out.template='modern';
 }
 for(const [k,list] of Object.entries(OPTIONS))pick(k,list);
 for(const [k,[min,max]] of Object.entries(NUMERIC_OPTIONS)){
  if(out[k]===undefined)continue;
  if(out[k]===null){delete out[k];continue}
  if(typeof out[k]!=='number'||!Number.isFinite(out[k])||out[k]<min||out[k]>max){
   errors.push('Unsupported '+k);delete out[k];
  }else out[k]=Math.round(out[k]*100)/100;
 }
 if(out.sectionOrder!==undefined){
  if(!Array.isArray(out.sectionOrder)){errors.push('Invalid section order');delete out.sectionOrder}
  else out.sectionOrder=[...new Set(out.sectionOrder.slice(0,100).filter(safeSectionKey))];
 }
 if(out.enabledSections!==undefined){
  if(!out.enabledSections||typeof out.enabledSections!=='object'||Array.isArray(out.enabledSections)){
   errors.push('Invalid section visibility');delete out.enabledSections;
  }else{
   const safe={};for(const k of Object.keys(out.enabledSections).slice(0,100))
    if(safeSectionKey(k)&&typeof out.enabledSections[k]==='boolean')safe[k]=out.enabledSections[k];
   out.enabledSections=safe;
  }
 }
 if(out.color!==undefined&&!COLOR.test(out.color)){errors.push('Invalid accent colour');out.color=getTemplate(out.template).color||DEFAULT_APPEARANCE.color;}
 if(out.photo!==undefined&&typeof out.photo!=='boolean')out.photo=Boolean(out.photo);
 for(const [k,v] of Object.entries(DEFAULT_APPEARANCE))if(out[k]===undefined)out[k]=v;
 return {appearance:out,errors};
}
/** Switch template without touching content; accent follows template unless the user chose one. */
export function applyTemplate(appearance,id,{keepColor=true}={}){
 const t=getTemplate(id);
 const next={...appearance,template:t.id};
 if(!keepColor&&t.color)next.color=t.color;
 return normalizeAppearance(next).appearance;
}
/** Resolved rendering style consumed by layout/PDF/DOCX. */
export function resolveStyle(appearance){
 const a=normalizeAppearance(appearance).appearance,t=getTemplate(a.template);
 const font=a.font==='template'?t.tokens.font:a.font;
 return Object.freeze({
  template:t.id,family:t.family,design:t.tokens.design||null,color:a.color,font,paper:a.paper,
  size:a.bodySize??{small:9.5,medium:10.5,large:11.5}[a.fontSize],
  lineHeight:a.leading??{compact:1.22,standard:1.35,relaxed:1.5}[a.spacing==='standard'?t.tokens.density==='compact'?'compact':t.tokens.density==='relaxed'?'relaxed':'standard':a.spacing],
  margin:a.marginSize??{narrow:36,standard:54,wide:72}[a.margins],
  headerScale:a.headerScale??2.2,sectionGap:a.sectionGap??10,
  headingScale:a.headingScale??1.15,entryGap:a.entryGap??5,paragraphGap:a.paragraphGap??1,ruleWeight:a.ruleWeight??0.6,
  header:a.headerStyle==='template'?t.tokens.header:a.headerStyle,
  columns:a.columns==='template'?t.tokens.layout:a.columns==='sidebar'?'sidebar':'single',
  caps:t.tokens.caps,rules:a.ruleStyle&&a.ruleStyle!=='template'?a.ruleStyle:t.tokens.rules,
  pageAccent:a.pageAccent&&a.pageAccent!=='template'?a.pageAccent:t.tokens.edge,photo:a.photo,
  sectionOrder:Array.isArray(a.sectionOrder)?a.sectionOrder.filter(x=>typeof x==='string'):undefined,
  enabledSections:a.enabledSections&&typeof a.enabledSections==='object'?a.enabledSections:undefined
 });
}
