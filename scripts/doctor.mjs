import {existsSync,readFileSync,statSync} from 'node:fs';import {spawnSync} from 'node:child_process';
import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const checks=[];
function check(name,ok,details){checks.push({name,ok,details});console.log(`${ok?'[OK]':'[!]'} ${name}: ${details}`);}
function cmd(program,args){const r=spawnSync(program,args,{encoding:'utf8'});return r.status===0?`${(r.stdout||'').split('\n')[0]}`:'not found';}
check('Node 22+',Number(process.version.match(/v(\d+)/)?.[1])>=22,process.version);
check('FFmpeg',cmd('ffmpeg',['-version'])!=='not found',cmd('ffmpeg',['-version']));
check('FFprobe',cmd('ffprobe',['-version'])!=='not found',cmd('ffprobe',['-version']));
const models=['iphone-17-pro','iphone-17-pro-max','pixel-9-pro-xl','galaxy-s26-ultra'];
for(const model of models){const f=path.join(root,'public/devices',model+'.glb');let ok=false;let txt='missing';if(existsSync(f)){const buf=readFileSync(f);ok=buf.subarray(0,4).toString('ascii')==='glTF'&&buf.readUInt32LE(8)===buf.length;txt=`${(buf.length/1048576).toFixed(2)} MiB ${ok?'valid GLB header':'bad binary'}`};check(model,ok,txt)}
const dirs=['node_modules','remotion-compositor/node_modules'];
for(const dir of dirs)check(dir,existsSync(path.join(root,dir)),existsSync(path.join(root,dir))?'installed':'npm dependencies not installed');
const python=process.platform==='win32'?'python':'python3';
check('Python Playwright',spawnSync(python,['-c','import playwright.sync_api'],{encoding:'utf8'}).status===0,'python -m pip install playwright');
const fine=checks.every(x=>x.ok);console.log(JSON.stringify({checkedAt:new Date().toISOString(),checks},null,2));if(!fine)process.exitCode=1;
