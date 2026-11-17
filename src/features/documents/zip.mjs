/** Minimal deterministic ZIP (store) writer and bounded reader. No dependencies, no clock. */
const TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
export function crc32(bytes){let c=0xFFFFFFFF;for(let i=0;i<bytes.length;i++)c=TABLE[(c^bytes[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:false});
export const utf8=s=>enc.encode(s);
const DOS_TIME=0,DOS_DATE=(1<<5)|1|((2026-1980)<<9); // fixed 2026-01-01 => reproducible bytes
export function zipStore(files){
 const chunks=[],central=[];let offset=0;
 const u16=v=>[v&255,(v>>>8)&255],u32=v=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];
 for(const f of files){
  const name=utf8(f.name),data=typeof f.data==='string'?utf8(f.data):f.data,crc=crc32(data);
  const head=Uint8Array.from([0x50,0x4b,3,4,...u16(20),...u16(0x0800),...u16(0),...u16(DOS_TIME),...u16(DOS_DATE),
   ...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0)]);
  chunks.push(head,name,data);
  central.push(Uint8Array.from([0x50,0x4b,1,2,...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(DOS_TIME),...u16(DOS_DATE),
   ...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset)]),name);
  offset+=head.length+name.length+data.length;
 }
 const cdSize=central.reduce((a,c)=>a+c.length,0);
 const end=Uint8Array.from([0x50,0x4b,5,6,...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(cdSize),...u32(offset),...u16(0)]);
 const all=[...chunks,...central,end],out=new Uint8Array(all.reduce((a,c)=>a+c.length,0));
 let p=0;for(const c of all){out.set(c,p);p+=c.length;}
 return out;
}
export const ZIP_LIMITS=Object.freeze({maxEntries:200,maxEntryBytes:20*1024*1024,maxTotalBytes:60*1024*1024});
async function defaultInflate(bytes){
 if(typeof DecompressionStream!=='function')throw new Error('No inflate implementation available');
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
 return new Uint8Array(await new Response(stream).arrayBuffer());
}
/** Reads selected entries. Declared sizes are bounded and verified against actual output (zip-bomb guard). */
export async function unzipEntries(bytes,{want=()=>true,inflate=defaultInflate,limits=ZIP_LIMITS}={}){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let e=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(v.getUint32(i,true)===0x06054b50){e=i;break;}
 if(e<0)throw new Error('Not a ZIP/OOXML file');
 const count=v.getUint16(e+10,true);let p=v.getUint32(e+16,true);
 if(count>limits.maxEntries)throw new Error('Too many archive entries');
 const out=new Map();let total=0;
 for(let i=0;i<count;i++){
  if(p+46>bytes.length||v.getUint32(p,true)!==0x02014b50)throw new Error('Corrupt ZIP directory');
  const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),declaredCrc=v.getUint32(p+16,true),csize=v.getUint32(p+20,true),usize=v.getUint32(p+24,true);
  const nlen=v.getUint16(p+28,true),xlen=v.getUint16(p+30,true),clen=v.getUint16(p+32,true),lho=v.getUint32(p+42,true);
  const name=dec.decode(bytes.subarray(p+46,p+46+nlen));p+=46+nlen+xlen+clen;
  if(!want(name))continue;
  if(out.has(name))throw new Error('Duplicate ZIP entry: '+name);
  if(flags&1)throw new Error('Encrypted archives are not supported');
  if(usize>limits.maxEntryBytes||(total+=usize)>limits.maxTotalBytes)throw new Error('Archive entry too large');
  if(lho+30>bytes.length||v.getUint32(lho,true)!==0x04034b50)throw new Error('Corrupt ZIP entry');
  const localNameLen=v.getUint16(lho+26,true),localExtraLen=v.getUint16(lho+28,true);
  if(dec.decode(bytes.subarray(lho+30,lho+30+localNameLen))!==name||v.getUint16(lho+8,true)!==method)
   throw new Error('ZIP local and central directory mismatch');
  const start=lho+30+localNameLen+localExtraLen;
  if(start+csize>bytes.length)throw new Error('Truncated ZIP entry');
  const raw=bytes.subarray(start,start+csize);
  const data=method===0?raw:method===8?await inflate(raw):null;
  if(!data)throw new Error('Unsupported compression');
  if(data.length!==usize||data.length>limits.maxEntryBytes)throw new Error('Archive size mismatch');
  if(crc32(data)!==declaredCrc)throw new Error('Archive CRC32 mismatch: '+name);
  out.set(name,data);
 }
 return out;
}
export const bytesToText=b=>dec.decode(b);
