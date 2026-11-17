/** Group C shared text utilities: pure, deterministic, no network. */
const ENT={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
export const decodeEntities=s=>s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(m,e)=>{
 if(e[0]==='#'){const n=e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):parseInt(e.slice(1),10);return n>8&&n<0x110000?String.fromCodePoint(n):'';}
 return ENT[e.toLowerCase()]??m;});
/** Rich description -> [{bullet,text}] */
export function descriptionLines(html){
 if(typeof html!=='string'||!html)return [];
 const s=html.replace(/<(script|style)[\s\S]*?<\/\1>/gi,'').replace(/<li[^>]*>/gi,'\n• ').replace(/<\/(p|div|ul|ol|h\d)>|<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,'');
 return decodeEntities(s).split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean)
  .map(l=>l.startsWith('•')?{bullet:true,text:l.slice(1).trim()}:{bullet:false,text:l});
}
const str=v=>typeof v==='string'?v.trim():'';
const MONTHS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
/** -> {y,m} (m 1-12, 0 if unknown) or null */
export function parseDate(v){
 const s=str(v).toLowerCase();if(!s)return null;
 if(/^(present|current|now)$/.test(s))return 'present';
 let m=s.match(/^(\d{1,2})[\/.-](\d{4})$/);if(m&&+m[1]>=1&&+m[1]<=12)return {y:+m[2],m:+m[1]};
 m=s.match(/^([a-z]{3})[a-z]*\.?\s+(\d{4})$/);if(m&&MONTHS.includes(m[1]))return {y:+m[2],m:MONTHS.indexOf(m[1])+1};
 m=s.match(/^(\d{4})$/);if(m)return {y:+m[1],m:0};
 return null;
}
export const monthIndex=(d,now=new Date())=>d==='present'?now.getFullYear()*12+now.getMonth():d.y*12+(d.m?d.m-1:0);
/** Flatten a CV document into addressable text units used for evidence citations. */
export function documentUnits(doc){
 const units=[],p=doc.personalInfo||{};
 if(str(p.title))units.push({path:'personalInfo.title',text:str(p.title)});
 if(str(doc.summary))units.push({path:'summary',text:str(doc.summary)});
 (doc.experience||[]).forEach((e,i)=>{
  const id=e.id??i;
  units.push({path:`experience[${id}].title`,text:[e.title,e.employer].map(str).filter(Boolean).join(' at ')});
  descriptionLines(e.description).forEach((l,j)=>units.push({path:`experience[${id}].description[${j}]`,text:l.text}));
 });
 (doc.education||[]).forEach((e,i)=>units.push({path:`education[${e.id??i}]`,text:[e.degree||e.title,e.school||e.institution].map(str).filter(Boolean).join(' ')}));
 (doc.skills||[]).forEach((s,i)=>str(s.name)&&units.push({path:`skills[${i}]`,text:str(s.name)}));
 for(const k of ['certifications','projects','accomplishments','languages'])
  (doc[k]||[]).forEach((e,i)=>{const t=[e.name||e.title,e.description&&descriptionLines(e.description).map(l=>l.text).join(' ')].map(str).filter(Boolean).join(' ');if(t)units.push({path:`${k}[${e.id??i}]`,text:t});});
 return units;
}
const STOP=new Set('a an and are as at be by for from has have in is it its of on or that the to with will you your we our their they this these those who can able including etc using use work working within across such per into over more most than then also not no any all both each other new'.split(' '));
/** crude, deterministic stem: enough to match manage/managed/managing/management */
export function stem(w){
 w=w.toLowerCase();
 if(w.length<=3)return w;
 w=w.replace(/(ations?|ation|ments?|ings?|ied|ies|ers?|ed|es|s)$/,'');
 w=w.replace(/(ing|ion|er|e)$/,'');
 return w.length<3?w.padEnd(3,'_'):w;
}
export const tokens=s=>(s.toLowerCase().match(/[a-z0-9+#.]+/g)||[]).map(t=>t.replace(/^\.+|\.+$/g,'')).filter(t=>t&&!STOP.has(t));
export const stems=s=>tokens(s).map(stem);
export const isStop=w=>STOP.has(w.toLowerCase());
export function plainText(doc){return documentUnits(doc).map(u=>u.text).join('\n');}
