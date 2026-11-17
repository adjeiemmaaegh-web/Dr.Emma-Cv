/**
 * Preview workspace state. Uses its OWN storage key (never the legacy app's keys) so trying the workspace cannot affect saved CVs.
 * In a composed app, Group A's LocalRepositoryPort replaces this.
 */
import {createEditor} from '../../editor/editor-state.mjs';
import {emptyBook} from '../../tracker/tracker.mjs';
import {blankCareerDocument} from '../../../domain/profile/career-profile.mjs';
export const STORAGE_KEY='ledger_workspace_preview_v1';
export const SAMPLE_DOC=()=>({personalInfo:{firstName:'Ada',lastName:'Example',title:'Operations Manager',email:'ada@example.test',phone:'+44 20 7946 0000',city:'Leeds',linkedin:'',website:'',photo:'',postcode:''},
 summary:'Operations manager with a record of running busy stores and training teams.',
 experience:[{id:'e1',title:'Operations Manager',employer:'Acme Retail',location:'Leeds',start:'Jan 2020',end:'',current:true,description:'<ul><li>Managed a team of 12 across two sites.</li><li>Reduced waste by reviewing weekly stock counts.</li><li>Trained new staff on safety procedures.</li></ul>'},
  {id:'e2',title:'Supervisor',employer:'Bolt Stores',location:'',start:'Jan 2016',end:'Dec 2019',current:false,description:'<ul><li>Opened and closed the store daily.</li><li>Scheduled rotas for 8 staff.</li></ul>'}],
 education:[{id:'d1',degree:'BA Business',school:'Example University',start:'2012',end:'2015',description:''}],
 skills:[{name:'Scheduling',level:3},{name:'Stock control',level:3},{name:'Team training',level:3}],
 languages:[],certifications:[],projects:[],accomplishments:[],hobbies:'',references:'',customSections:[]});
export function createStore({storage=globalThis.localStorage,sample=false}={}){
 let saved=null;try{saved=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');}catch{}
 const doc=saved?.document||(sample?SAMPLE_DOC():blankCareerDocument());
 const listeners=new Set();let status={state:'saved',at:null,error:null};
 const state={applications:saved?.applications?.schema==='ledger-applications-v1'?saved.applications:emptyBook(),theme:saved?.theme||null};
 const persist=()=>{
  try{storage?.setItem(STORAGE_KEY,JSON.stringify({document:editor.snapshot().document,appearance:editor.snapshot().appearance,applications:state.applications,theme:state.theme}));status={state:'saved',at:Date.now(),error:null};}
  catch(e){status={state:'error',at:null,error:/quota/i.test(e?.name+e?.message)?'QUOTA':'UNAVAILABLE'};}
  emit();
 };
 let editor=createEditor({document:doc,appearance:saved?.appearance||{},onChange:()=>{status={state:'saving',at:null,error:null};persist();}});
 const emit=()=>{for(const l of listeners)l();};
 return {
  get editor(){return editor;},get applications(){return state.applications;},get theme(){return state.theme;},get status(){return status;},
  hasContent(){const d=editor.snapshot().document;return !!(d.personalInfo.firstName||d.summary||d.experience.length||d.education.length||d.skills.length);},
  replaceDocument(document){editor=createEditor({document,appearance:editor.snapshot().appearance,onChange:()=>{status={state:'saving',at:null,error:null};persist();}});persist();},
  setApplications(book){state.applications=book;persist();},
  setTheme(t){state.theme=t;persist();},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  reset(){try{storage?.removeItem(STORAGE_KEY);}catch{}}
 };
}
