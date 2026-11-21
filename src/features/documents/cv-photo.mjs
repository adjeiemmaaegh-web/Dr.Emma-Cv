/** Validated, bounded JPEG payload for local CV preview and exports. */
export const PHOTO_WIDTH_PT=66,PHOTO_HEIGHT_PT=88,PHOTO_RESERVED_PT=96;
export function cvPhotoBytes(uri){
 if(!uri)return null;
 if(typeof uri!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(uri))throw new Error('Invalid CV portrait encoding.');
 const raw=uri.slice('data:image/jpeg;base64,'.length);
 if(raw.length>340000)throw new Error('CV portrait is too large.');
 const decoded=atob(raw);
 if(decoded.length>250*1024||decoded.length<4||decoded.charCodeAt(0)!==255||decoded.charCodeAt(1)!==216||decoded.charCodeAt(decoded.length-2)!==255||decoded.charCodeAt(decoded.length-1)!==217)throw new Error('Invalid or oversized JPEG portrait.');
 return Uint8Array.from(decoded,c=>c.charCodeAt(0));
}
export function photoPlacement(paper,style){
 return {x:paper.width-style.margin-PHOTO_WIDTH_PT,y:style.margin,width:PHOTO_WIDTH_PT,height:PHOTO_HEIGHT_PT};
}
