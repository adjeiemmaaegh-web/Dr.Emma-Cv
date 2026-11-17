/** Group C Stage 12: local writing checks. Works offline, no key. Rewrites are conservative and always need review. */
import {descriptionLines} from '../intelligence/text.mjs';
const IRREG={managing:'managed',leading:'led',running:'ran',building:'built',making:'made',teaching:'taught',selling:'sold',
 handling:'handled',supporting:'supported',delivering:'delivered',coordinating:'coordinated',developing:'developed',maintaining:'maintained',
 supervising:'supervised',training:'trained',organising:'organised',organizing:'organized',overseeing:'oversaw',preparing:'prepared',processing:'processed'};
const WEAK=[[/^responsible for (\w+ing)\b/i,m=>IRREG[m[1].toLowerCase()]?{rx:/^responsible for \w+ing\b/i,to:cap(IRREG[m[1].toLowerCase()])}:null],
 [/^(helped|assisted) (with|to) /i,null],[/^worked on /i,null],[/^duties included /i,null],[/^tasked with /i,null]];
const cap=w=>w[0].toUpperCase()+w.slice(1);
const CLICHE=['team player','hard worker','hard-working','results-driven','go-getter','think outside the box','detail-oriented','self-starter','dynamic','synergy'];
const PASSIVE=/\b(was|were|been|being|is|are)\s+(\w+ed|built|made|led|run|given|taken|done|seen|chosen)\b/i;
export function analyzeWriting(document){
 const out=[],push=(o)=>out.push({requiresReview:true,...o});
 const lines=[];
 (document.experience||[]).forEach((e,i)=>descriptionLines(e.description).forEach((l,j)=>lines.push({path:`experience[${e.id??i}].description[${j}]`,text:l.text})));
 if(document.summary)lines.push({path:'summary',text:document.summary});
 for(const {path,text} of lines){
  for(const [rx,fix] of WEAK){const m=text.match(rx);if(!m)continue;
   const f=fix&&fix(m);
   push({path,kind:'weak-opening',message:'"'+m[0].trim()+'" is a weak opening; lead with what you did.',before:text,
    after:f?text.replace(f.rx,f.to):undefined,explanation:f?'Same meaning, stronger verb. Check it still reads correctly.':'Rewrite to start with the action and result (your wording; no new facts).'});break;}
  if(/^\s*I\s+\w+/.test(text)||/\bmy\b/i.test(text))push({path,kind:'first-person',message:'First-person wording; CVs usually omit "I" and "my".',before:text,
   after:/^\s*I\s+\w+/.test(text)?cap(text.replace(/^\s*I\s+/,'')):undefined,explanation:'Removes the pronoun only.'});
  if(PASSIVE.test(text))push({path,kind:'passive',message:'Passive phrasing hides who did the work.',before:text,explanation:'Say what you did: "'+text.split(/\s+/).slice(0,4).join(' ')+'..." → start with your action.'});
  for(const c of CLICHE)if(text.toLowerCase().includes(c))push({path,kind:'cliche',message:'"'+c+'" is a common phrase that says little; show it with an example instead.',before:text,explanation:'Replace with a specific example from your experience.'});
  if(text.split(/\s+/).length>=6&&!/\d/.test(text)&&/^(increased|reduced|improved|grew|cut|saved|boosted|raised)\b/i.test(text))
   push({path,kind:'missing-metric',message:'Claims a change without a figure. Add the real number only if you can support it.',before:text,explanation:'Do not estimate or invent a figure.'});
  if(text.split(/\s+/).length>40)push({path,kind:'long',message:'Very long; consider splitting.',before:text,explanation:'Split into two bullets.'});
 }
 const starts={};for(const l of lines){const w=l.text.split(/\s+/)[0]?.toLowerCase();if(w&&l.path!=='summary')(starts[w]??=[]).push(l.path);}
 for(const [w,paths] of Object.entries(starts))if(paths.length>=3)push({path:paths[0],kind:'repetition',message:'"'+w+'" begins '+paths.length+' lines; vary the verbs you truly used.',before:w,explanation:'Use different accurate verbs.'});
 return out;
}
