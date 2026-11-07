// E21: Word style-aware hidden text filtering. Applied before any imported text
// is displayed or offered for CV field parsing. Styled content is not executed.
const MAX_STYLES=1000, MAX_STYLE_CHAIN=24;
const children=(node,local)=>Array.from(node?.childNodes||[]).filter(x=>x.nodeType===1 && x.namespaceURI===W && (!local||x.localName===local));
const first=(node,local)=>children(node,local)[0]||null;
const attr=(node,name)=>node?.getAttributeNS(W,name)||node?.getAttribute('w:'+name)||node?.getAttribute(name)||'';
function runVisibility(rPr){
 const out={};
 for(const type of ['vanish','webHidden']){
  const nodes=children(rPr,type);
  if(!nodes.length)continue;
  const value=attr(nodes[nodes.length-1],'val').toLowerCase();
  out[type]=!['0','off','false'].includes(value);
 }
 return out;
}
async function hiddenStyleMap(zip){
 const member=zip.file('word/styles.xml');
 const environment={styles:new Map(),memo:new Map(),missing:new Set(),defaults:{},defaultParagraph:null};
 if(!member)return environment;
 if(member._data?.uncompressedSize>MAX_AUX)fail('styles XML exceeds 1 MB safety limit');
 const raw=await member.async('string');
 if(raw.length>MAX_AUX)fail('styles XML exceeds 1 MB safety limit');
 const doc=xmlDocument(raw,'Word styles');
 const root=doc.documentElement;
 if(root.namespaceURI!==W||root.localName!=='styles')fail('invalid Word styles root');
 for(const d of children(root,'docDefaults')){
  const props=first(first(d,'rPrDefault'),'rPr');
  Object.assign(environment.defaults,runVisibility(props));
 }
 const styles=children(root,'style');
 if(styles.length>MAX_STYLES)fail('too many Word styles for safe review');
 for(const style of styles){
  const id=attr(style,'styleId');
  if(!id||id.length>150||environment.styles.has(id))fail('invalid or duplicated Word style ID');
  const kind=attr(style,'type');
  if(!['paragraph','character'].includes(kind))continue;
  const basis=attr(first(style,'basedOn'),'val');
  environment.styles.set(id,{kind,basis,props:runVisibility(first(style,'rPr'))});
  if(kind==='paragraph' && attr(style,'default').toLowerCase()!=='0' &&
    !['false','off'].includes(attr(style,'default').toLowerCase()) && attr(style,'default')){
   if(environment.defaultParagraph)fail('ambiguous default Word paragraph style');
   environment.defaultParagraph=id;
  }
 }
 return environment;
}
function resolveRunVisibility(styles,id,path=[]){
 if(!id)return {};
 if(styles.memo.has(id))return styles.memo.get(id);
 if(path.includes(id)||path.length>=MAX_STYLE_CHAIN)fail('cyclic or overly deep Word style inheritance');
 const style=styles.styles.get(id);
 if(!style){styles.missing.add(id);return {};}
 const effective={...resolveRunVisibility(styles,style.basis,[...path,id]),...style.props};
 styles.memo.set(id,effective);
 return effective;
}
function omitHiddenRuns(doc,styles){
 let removed=0;
 for(const run of Array.from(doc.getElementsByTagNameNS(W,'r'))){
  const rPr=first(run,'rPr'),rStyle=attr(first(rPr,'rStyle'),'val');
  let p=run.parentNode;
  while(p && !(p.namespaceURI===W && p.localName==='p'))p=p.parentNode;
  const pStyle=attr(first(first(p,'pPr'),'pStyle'),'val')||styles.defaultParagraph;
  const effective={...styles.defaults,...resolveRunVisibility(styles,pStyle),
   ...resolveRunVisibility(styles,rStyle),...runVisibility(rPr)};
  if(effective.vanish||effective.webHidden){run.parentNode?.removeChild(run);removed++;}
 }
 return removed;
}
