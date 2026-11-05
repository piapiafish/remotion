import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

// Include rendering code and dependency versions, not just the compiler/bridge.
export async function engineFingerprint(root) {
 const files=['package-lock.json','services/compiler/compile.mjs','services/compiler/compile-cli.mjs','services/render-worker/worker.py'];
 async function visit(dir){
  for(const item of await readdir(path.join(root,dir),{withFileTypes:true})){
   const name=path.posix.join(dir,item.name);
   if(item.isDirectory()) await visit(name);
   else if(/\.(ts|tsx)$/.test(name)&&!name.includes('.test.')) files.push(name);
  }
 }
 await visit('src');
 const hash=createHash('sha256');
 for(const name of files.sort()) hash.update(name).update(await readFile(path.join(root,name)));
 return hash.digest('hex');
}

export async function shotFingerprint({shot,canvas,quality,engine,source,model,forcePng=false,allowPngFallback=true}) {
 const hash=createHash('sha256').update(JSON.stringify({shot,canvas,quality,engine,forcePng,allowPngFallback}));
 hash.update(await readFile(source)).update(await readFile(model));
 return hash.digest('hex');
}
