import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root=join(process.cwd(),'dist');
const port=4173;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};

async function resolvePath(urlPath){
  const safe=normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/,'');
  const candidates=[];
  if(!safe)candidates.push('index.html');
  else if(extname(safe))candidates.push(safe);
  else candidates.push(safe,`${safe}.html`,join(safe,'index.html'));
  candidates.push('index.html');
  for(const rel of candidates){const abs=join(root,rel);try{const s=await stat(abs);if(s.isFile())return abs;}catch{}}
  return null;
}

createServer(async(req,res)=>{
  const file=await resolvePath(req.url||'/');
  if(!file){res.writeHead(404);res.end('Not found');return;}
  const body=await readFile(file);
  res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'no-store'});
  res.end(body);
}).listen(port,'127.0.0.1',()=>console.log(`static server http://127.0.0.1:${port}`));
