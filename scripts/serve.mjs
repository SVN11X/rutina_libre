#!/usr/bin/env node
// Local QA only. GitHub Pages serves the deliverable without a server to install.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve,extname } from 'node:path';
import { parseRange } from '../js/range.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const base=process.env.BASE_PATH||'/';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.mp4':'video/mp4','.webm':'video/webm','.gif':'image/gif','.jpg':'image/jpeg','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.vtt':'text/vtt'};
createServer(async(req,res)=>{
  try{
    const originalPath=decodeURIComponent(new URL(req.url,'http://local').pathname);
    if(!originalPath.startsWith(base)){res.writeHead(404);return res.end();}
    const pathname='/'+originalPath.slice(base.length);
    const path=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
    if(!path.startsWith(root)){res.writeHead(403);return res.end();}
    const file=path;
    const bytes=await readFile(file),header={'Content-Type':types[extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache'};
    if(req.headers.range){const part=parseRange(req.headers.range,bytes.length);if(!part){res.writeHead(416,{'Content-Range':`bytes */${bytes.length}`});return res.end();}res.writeHead(206,{...header,'Content-Range':`bytes ${part.start}-${part.end}/${bytes.length}`,'Content-Length':part.end-part.start+1});res.end(bytes.subarray(part.start,part.end+1));}
    else{res.writeHead(200,{...header,'Content-Length':bytes.length});res.end(bytes);}
  }catch{res.writeHead(404);res.end('Archivo no disponible');}
}).listen(Number(process.env.PORT)||4173,'0.0.0.0',()=>console.log('Rutina Libre QA: http://127.0.0.1:'+ (process.env.PORT||4173)));
