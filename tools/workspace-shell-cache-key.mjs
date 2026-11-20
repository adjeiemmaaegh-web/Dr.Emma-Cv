/** Content-addressed cache identity for the offline workspace public shell.
 * Hash the emitted source files, not only index.html: most releases change JS
 * or CSS while leaving the HTML unchanged. No user records are included.
 */
import {createHash} from 'node:crypto';

export function workspaceShellCacheKey({html,assetPaths,readAsset}){
 const hash=createHash('sha256');
 hash.update('ledger-workspace-public-assets-v2\0');
 hash.update(html);
 for(const assetPath of [...assetPaths].sort()){
  if(!assetPath.startsWith('/src/'))throw Error('Unexpected public cache path: '+assetPath);
  const data=readAsset(assetPath);
  if(!(typeof data==='string'||Buffer.isBuffer(data)))throw Error('Missing public asset: '+assetPath);
  hash.update('\0'+assetPath+'\0');
  hash.update(data);
 }
 return 'ledger-workspace-'+hash.digest('hex').slice(0,14);
}
