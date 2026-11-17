import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
export const {chromium}=require('playwright');
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const TYPES={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html'};
/** Serves the repo over http://localhost so ES modules load; `pages` maps URL -> html string. */
export function serve(pages){
 const server=http.createServer((req,res)=>{
  const u=req.url.split('?')[0];
  if(pages[u])return res.writeHead(200,{'content-type':'text/html'}).end(pages[u]);
  const f=path.join(root,decodeURIComponent(u));
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return res.writeHead(404).end();
  res.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream'}).end(fs.readFileSync(f));
 }).listen(0);
 return {server,port:server.address().port,close:()=>server.close()};
}
export const shell=(body)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ledger test</title><link rel="stylesheet" href="/src/features/accessibility/a11y.css"></head><body class="ledger-a11y"><main id="app"></main><script type="module">${body}</script></body></html>`;
export const fmt=f=>f.map(x=>`  [${x.severity}] ${x.rule} (WCAG ${x.wcag}) ${x.element}: ${x.message}`).join('\n');
