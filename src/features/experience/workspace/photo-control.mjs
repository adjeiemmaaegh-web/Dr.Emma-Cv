/** Local-only passport-style photo upload. Image pixels never leave the browser. */
import {el} from './ui.mjs';
import {decodePassportPhoto,MAX_PHOTO_CHARS} from '../../documents/photo.mjs';
const ACCEPTED=new Set(['image/jpeg','image/png','image/webp']);
const MAX_FILE=8*1024*1024;
export async function preparePassportPhoto(file){
 if(!file||!ACCEPTED.has(file.type))throw Error('Choose a JPG, PNG or WebP photo.');
 if(file.size>MAX_FILE)throw Error('Photo exceeds 8 MB. Choose a smaller file.');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();
  const loaded=new Promise((resolve,reject)=>{
   img.onload=()=>resolve();
   img.onerror=()=>reject(Error('The image could not be opened.'));
  });
  img.src=url;await loaded;
  const w=img.naturalWidth,h=img.naturalHeight;
  if(!w||!h||w>10000||h>10000||w*h>36000000)throw Error('Photo dimensions are not supported.');
  const canvas=document.createElement('canvas');
  canvas.width=350;canvas.height=450;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Image processing is unavailable in this browser.');
  const target=7/9,ratio=w/h;
  const sw=ratio>target?h*target:w,sh=ratio>target?h:w/target;
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,350,450);
  ctx.drawImage(img,(w-sw)/2,(h-sh)/2,sw,sh,0,0,350,450);
  for(const quality of [0.82,0.68,0.5]){
   const data=canvas.toDataURL('image/jpeg',quality);
   if(data.length<=MAX_PHOTO_CHARS&&decodePassportPhoto(data))return data;
  }
  throw Error('Photo could not be compressed. Try a smaller image.');
 }finally{URL.revokeObjectURL(url);}
}
export function passportPhotoControl(editor,ctx,initial){
 const input=el('input',{id:'lw-passport-photo',type:'file',accept:'image/jpeg,image/png,image/webp','aria-describedby':'lw-photo-help'});
 const photo=el('img',{class:'lw-passport-file-preview',alt:'Preview of your CV portrait',width:'70',height:'90'});
 const placeholder=el('span',{class:'lw-photo-placeholder'},'No photo');
 const imageBox=el('div',{class:'lw-photo-image'},photo,placeholder);
 const status=el('p',{class:'lw-photo-status',role:'alert','aria-live':'polite'});
 const show=el('input',{id:'lw-show-passport-photo',type:'checkbox'});
 const showLabel=el('label',{class:'lw-photo-checkbox',for:'lw-show-passport-photo'},show,' Include photo in my CV');
 const remove=el('button',{type:'button',class:'lw-btn sm',on:{click:()=>{
  editor.setPhoto('');status.textContent='Photo removed from this CV. Undo is available.';ctx.toast('Photo removed.');
 }}},'Remove photo');
 const control=el('div',{class:'lw-photo-control','data-cv-photo':'true'},
  el('h2',{},'Passport-style photo (optional)'),
  el('div',{class:'lw-photo-row'},imageBox,el('div',{class:'lw-photo-actions'},
   el('label',{for:'lw-passport-photo'},'Upload a portrait photo'),input,
   el('p',{class:'lw-help',id:'lw-photo-help'},'JPG, PNG or WebP, up to 8 MB. Automatically cropped to a 35:45 portrait ratio and compressed. Saved only with your local CV and included in its backups.'),
   showLabel,remove)),status);
 function update(s){
  const source=s.document.personalInfo.photo;
  const valid=Boolean(decodePassportPhoto(source));
  if(valid){if(photo.getAttribute('src')!==source)photo.setAttribute('src',source);}
  else photo.removeAttribute('src');
  photo.hidden=!valid;placeholder.hidden=valid;
  remove.disabled=!valid;show.disabled=!valid;show.checked=valid&&s.appearance.photo===true;
 }
 show.addEventListener('change',()=>{try{editor.setAppearance({photo:show.checked});}catch(e){status.textContent=e.message;}});
 input.addEventListener('change',async()=>{
  const f=input.files?.[0];if(!f)return;
  input.disabled=true;status.textContent='Preparing photo locally…';
  try{
   const data=await preparePassportPhoto(f);
   editor.setPhoto(data);
   status.textContent='Photo added. Preview and PDF/Word exports will include it.';
   ctx.toast('Passport-style photo added. Undo is available.');
  }catch(e){status.textContent=e.message||'The photo could not be processed.';}
  finally{input.value='';input.disabled=false;update(editor.snapshot());}
 });
 control.update=update;
 update(initial);
 return control;
}
