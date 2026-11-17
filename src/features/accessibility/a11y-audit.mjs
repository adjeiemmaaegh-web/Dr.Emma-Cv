/**
 * Group E Stage 17: in-page accessibility audit (runs in a real browser DOM).
 * Automated checks catch a subset of WCAG 2.2 problems; passing them is NOT a conformance claim.
 * Each finding carries its WCAG reference and whether a human must still verify it.
 */
const INTERACTIVE='a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=checkbox],[tabindex]:not([tabindex="-1"])';
const vis=el=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none';};
const path=el=>{const p=[];for(let n=el;n&&n.nodeType===1&&p.length<4;n=n.parentElement)p.unshift(n.tagName.toLowerCase()+(n.id?'#'+n.id:''));return p.join(' > ');};
const rgba=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const [r,g,b,a=1]=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return {r,g,b,a};};
const lum=({r,g,b})=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
const blend=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
function backdrop(el){
 let layers=[];
 for(let n=el;n;n=n.parentElement){const cs=getComputedStyle(n);if(cs.backgroundImage&&cs.backgroundImage!=='none')return null;const c=rgba(cs.backgroundColor);if(c&&c.a>0){layers.push(c);if(c.a>=1)break;}}
 let base={r:255,g:255,b:255,a:1};for(const l of layers.reverse())base=blend(l,base);return base;
}
export const contrastRatio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05);};
const accName=el=>{
 const aria=el.getAttribute('aria-label');if(aria&&aria.trim())return aria.trim();
 const lb=el.getAttribute('aria-labelledby');if(lb){const t=lb.split(/\s+/).map(i=>document.getElementById(i)?.textContent.trim()||'').join(' ').trim();if(t)return t;}
 if(el.labels&&el.labels.length){const t=[...el.labels].map(l=>l.textContent.trim()).join(' ').trim();if(t)return t;}
 if(el.tagName==='INPUT'&&['button','submit','reset'].includes(el.type)&&el.value)return el.value;
 const t=el.textContent.trim();if(t&&!['INPUT','SELECT','TEXTAREA'].includes(el.tagName))return t;
 const title=el.getAttribute('title');return title&&title.trim()||'';
};
const AUTOCOMPLETE={firstname:'given-name',lastname:'family-name',email:'email',phone:'tel',city:'address-level2'};
/** @returns {{findings:object[],checked:string[],manualRequired:string[]}} */
export function auditAccessibility(root=document.body,{minTarget=24,preferTarget=44}={}){
 const F=[],checked=[];
 const add=(rule,wcag,severity,el,message)=>F.push({rule,wcag,severity,element:el?path(el):'',message});
 const items=[...root.querySelectorAll(INTERACTIVE)].filter(vis);
 checked.push('name-role-value');for(const el of items)if(!accName(el))add('accessible-name','4.1.2','error',el,'Control has no accessible name.');
 checked.push('form-labels');for(const el of root.querySelectorAll('input:not([type=hidden]):not([type=button]):not([type=submit]),select,textarea'))if(vis(el)&&!(el.labels&&el.labels.length)&&!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby'))add('form-label','1.3.1 / 3.3.2','error',el,'Form field has no programmatic label (placeholder is not a label).');
 checked.push('aria-references');for(const el of root.querySelectorAll('[aria-labelledby],[aria-describedby],[aria-controls]'))for(const a of ['aria-labelledby','aria-describedby','aria-controls'])for(const id of (el.getAttribute(a)||'').split(/\s+/).filter(Boolean))if(!document.getElementById(id))add('aria-reference','4.1.2','error',el,a+' points to a missing id "'+id+'".');
 checked.push('duplicate-ids');{const seen=new Map();for(const el of root.querySelectorAll('[id]')){if(seen.has(el.id))add('duplicate-id','4.1.2','error',el,'Duplicate id "'+el.id+'".');seen.set(el.id,1);}}
 checked.push('target-size');for(const el of items){const r=el.getBoundingClientRect();if(['checkbox','radio'].includes(el.type)&&el.labels?.length){const lr=el.labels[0].getBoundingClientRect();if(lr.height>=minTarget)continue;}
  const inline=el.tagName==='A'&&getComputedStyle(el).display==='inline'&&el.closest('p,li');if(inline)continue; // 2.5.8 inline-text exception
  if(r.width<minTarget||r.height<minTarget)add('target-size','2.5.8','error',el,'Target is '+Math.round(r.width)+'x'+Math.round(r.height)+'px (minimum '+minTarget+').');
  else if(r.width<preferTarget||r.height<preferTarget)add('target-size-comfort','2.5.5 (AAA, advisory)','info',el,'Target is under '+preferTarget+'px.');}
 checked.push('contrast');{const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;const seen=new Set();
  while((n=walker.nextNode())){const t=n.textContent.trim();if(!t)continue;const el=n.parentElement;if(!el||seen.has(el)||!vis(el))continue;seen.add(el);
   if(el.closest(':disabled,[aria-disabled=true]'))continue; // disabled controls are exempt from 1.4.3
   const cs=getComputedStyle(el),fg=rgba(cs.color),bg=backdrop(el);if(!fg||!bg)continue;const f=fg.a<1?blend(fg,bg):fg;
   const size=parseFloat(cs.fontSize),bold=parseInt(cs.fontWeight)>=700,large=size>=24||(size>=18.66&&bold),need=large?3:4.5,ratio=contrastRatio(f,bg);
   if(ratio<need)add('contrast','1.4.3','error',el,'Contrast '+ratio.toFixed(2)+':1 is below '+need+':1.');}}
 // focus visibility is measured with real keyboard focus in tabReachability(): script focus() does not match :focus-visible after a mouse click.
 checked.push('headings');{const hs=[...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis);let prev=0;for(const h of hs){const l=+h.tagName[1];if(!h.textContent.trim())add('heading-empty','1.3.1 / 2.4.6','error',h,'Empty heading.');if(prev&&l>prev+1)add('heading-skip','1.3.1','warning',h,'Heading level jumps from h'+prev+' to h'+l+'.');prev=l;}}
 checked.push('live-region');if(!root.querySelector('[role=status],[role=alert],[aria-live]'))add('live-region','4.1.3','warning',root,'No status/alert live region for dynamic messages.');
 checked.push('images');for(const im of root.querySelectorAll('img'))if(!im.hasAttribute('alt')&&im.getAttribute('role')!=='presentation')add('img-alt','1.1.1','error',im,'Image has no alt attribute.');
 checked.push('error-association');for(const el of root.querySelectorAll('[aria-invalid=true]'))if(!el.getAttribute('aria-describedby'))add('error-association','3.3.1','error',el,'Invalid field has no associated error message.');
 checked.push('autocomplete');for(const el of root.querySelectorAll('input[name]'))if(vis(el)){const k=AUTOCOMPLETE[el.name.toLowerCase()];if(k&&!el.getAttribute('autocomplete'))add('autocomplete','1.3.5','warning',el,'Personal-data field "'+el.name+'" has no autocomplete ('+k+').');}
 checked.push('reflow');if(document.documentElement.scrollWidth>window.innerWidth+1)add('reflow','1.4.10','error',document.documentElement,'Page scrolls horizontally at '+window.innerWidth+'px.');
 checked.push('text-spacing');{const st=document.createElement('style');st.textContent='*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}';document.head.append(st);
  for(const el of root.querySelectorAll('*')){if(!vis(el))continue;const bb=el.getBoundingClientRect();if(bb.width<=2&&bb.height<=2)continue; /* visually-hidden labels are meant to be clipped */ const cs=getComputedStyle(el);if((cs.overflow==='hidden'||cs.overflowY==='hidden')&&el.scrollHeight>el.clientHeight+2&&el.textContent.trim())add('text-spacing','1.4.12','error',el,'Text is clipped when text spacing is increased.');}
  if(document.documentElement.scrollWidth>window.innerWidth+1)add('text-spacing-reflow','1.4.12','warning',document.documentElement,'Increased text spacing causes horizontal scrolling.');st.remove();}
 checked.push('viewport-zoom');{const m=document.querySelector('meta[name=viewport]');if(m&&/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/i.test(m.content))add('viewport-zoom','1.4.4','error',m,'Viewport disables zoom.');}
 checked.push('motion');{const running=document.getAnimations?document.getAnimations().filter(a=>a.playState==='running').length:0;if(running&&matchMedia('(prefers-reduced-motion: reduce)').matches)add('reduced-motion','2.3.3 (AAA, best practice)','warning',root,running+' animation(s) still run with reduced motion requested.');}
 checked.push('html-lang');if(!document.documentElement.getAttribute('lang'))add('html-lang','3.1.1','error',document.documentElement,'The page has no lang attribute.');
 return {findings:F,checked,manualRequired:MANUAL_REQUIRED};
}
/** Things automation cannot establish. Always reported so a green run is never read as conformance. */
export const MANUAL_REQUIRED=Object.freeze([
 'Screen reader walkthrough (NVDA/JAWS on Windows, VoiceOver on macOS/iOS, TalkBack on Android)',
 'Real keyboard-only task completion without a mouse, including focus order that makes sense',
 'Meaningful link/heading text, plain language and instructions quality (2.4.4, 2.4.6, 3.3.2)',
 'Zoom to 200% and 400% on real devices; browser text-size settings',
 'Touch use on real phones (target comfort, gestures, orientation) (1.3.4, 2.5.1, 2.5.7)',
 'Windows High Contrast / forced colours and dark mode appearance',
 'Cognitive load, error recovery and consistent help placement (3.2.6, 3.3.7, 3.3.8)']);
/**
 * Tab through the page with the real keyboard (needs a Playwright-like page).
 * Reports interactive elements never reached (2.1.1) and focused elements with no visible indicator (2.4.7 / 2.4.13).
 */
export async function tabReachability(page,rootSelector){
 const targets=await page.evaluate(sel=>[...document.querySelector(sel).querySelectorAll('a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled])')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('details:not([open])');}).map((e,i)=>{e.setAttribute('data-a11y-i',String(i));return i;}),rootSelector);
 await page.evaluate(()=>document.activeElement&&document.activeElement.blur());
 const stops=await page.evaluate(sel=>[...document.querySelectorAll('a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')].filter(e=>{const r=e.getBoundingClientRect();const d=e.closest('details:not([open])');return r.width>0&&r.height>0&&(!d||(e.tagName==='SUMMARY'&&e.parentElement===d));}).length,rootSelector);
 const reached=new Set(),noRing=[];
 for(let i=0;i<stops+6;i++){
  await page.keyboard.press('Tab');
  const r=await page.evaluate(()=>{const e=document.activeElement;if(!e||!e.hasAttribute('data-a11y-i'))return null;const cs=getComputedStyle(e);
   return {i:+e.getAttribute('data-a11y-i'),ring:(cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>=2)||(cs.boxShadow&&cs.boxShadow!=='none'),text:(e.textContent||e.getAttribute('aria-label')||e.name||e.tagName).trim().slice(0,40)};});
  if(r){reached.add(r.i);if(!r.ring)noRing.push(r.text);}
 }
 return {unreached:targets.filter(i=>!reached.has(i)),noFocusIndicator:[...new Set(noRing)]};
}
