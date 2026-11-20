/** Optional, offline-only employment guidance for first-time jobseekers and community advisers.
 * No analytics, jurisdiction inference, data collection, remote resources or changes to CVs.
 * Guidance describes conventions, not legal requirements or guarantees of employment.
 */
import {el} from './ui.mjs';

export const COMMUNITY_GUIDANCE=Object.freeze({
 uk:Object.freeze({
  label:'United Kingdom',
  items:Object.freeze([
   'Keep contact details easy to find and describe your most relevant work, education and skills.',
   'For many UK roles, one or two clear pages are useful; follow the employer’s instructions if different.',
   'A photo and personal details such as date of birth are generally unnecessary unless the role specifically calls for them.',
   'Check spelling, dates, and examples before exporting your final PDF or Word file.'
  ])
 }),
 uae:Object.freeze({
  label:'United Arab Emirates',
  items:Object.freeze([
   'Include a reachable phone number, city and clear job title. Follow the vacancy language and instructions.',
   'Describe your real experience, skills, training and achievements with accurate dates.',
   'A photo is not automatically required. Add one only if you choose and it is relevant to the application.',
   'Do not place passport, Emirates ID, banking or other sensitive identification numbers on a public CV.'
  ])
 })
});
export function guidanceFor(region){return COMMUNITY_GUIDANCE[region]||COMMUNITY_GUIDANCE.uk;}

export function communityGuide({privateSession=false}={}){
 const root=el('section',{class:'lw-card lw-community','aria-labelledby':'community-title'});
 const heading=el('h2',{id:'community-title'},'Help for your next application');
 const guide=el('div',{class:'lw-community-columns'});
 const destination=el('div',{},el('h3',{},'Choose where you are applying'),
  el('p',{class:'lw-help'},'These are optional tips, not compulsory CV rules. Always check the job advert.'));
 const selector=el('select',{id:'community-region','aria-label':'Application country'});
 for(const [key,entry] of Object.entries(COMMUNITY_GUIDANCE))
  selector.append(el('option',{value:key},entry.label));
 const bullets=el('ul',{class:'lw-community-tips','aria-live':'polite'});
 const render=()=>bullets.replaceChildren(...guidanceFor(selector.value).items.map(t=>el('li',{},t)));
 selector.addEventListener('change',render);render();
 destination.append(selector,bullets);
 const privacy=el('div',{},el('h3',{},'Using a shared or public computer?'),
  el('p',{},'A normal CV session saves information in this browser. On shared computers, another person using the same browser may be able to see it.'),
  privateSession?
   el('p',{class:'lw-help',role:'status'},'Private session is on: no CV changes or drafts are saved by this session. Download a copy before reloading or closing.'):
   el('p',{},el('a',{class:'lw-btn primary',href:'?private=1#/home'},'Start a private session')),
  el('p',{class:'lw-help'},'Private session does not delete older saved CVs, downloaded files, browser history or copies held elsewhere. Check downloads before leaving.'));
 const advisers=el('details',{class:'lw-community-advisers'},
  el('summary',{},'Guidance for nonprofit career advisers'),
  el('ul',{},
   el('li',{},'Ask the jobseeker’s permission before viewing, changing or downloading their CV.'),
   el('li',{},'Let the jobseeker confirm every skill, qualification, employment date and result; examples are not verified facts.'),
   el('li',{},'Use private sessions for shared workstations, and hand downloaded files directly to the jobseeker.'),
   el('li',{},'There are no accounts, mandatory payments or remote CV uploads in this workflow. Keep a local recovery plan for important documents.')));
 guide.append(destination,privacy);
 root.append(heading,guide,advisers);
 return root;
}
