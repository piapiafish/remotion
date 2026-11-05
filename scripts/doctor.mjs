import {existsSync,readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
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
for(const entry of ['node_modules/vite/bin/vite.js','remotion-compositor/node_modules/@remotion/cli/remotion-cli.js',
 'public/draco/draco_wasm_wrapper.js','public/draco/draco_decoder.wasm',
 ...['studio','city','sunset','warehouse'].map(name=>`public/environments/${name}.hdr`)]){
 check(entry,existsSync(path.join(root,entry)),existsSync(path.join(root,entry))?'present':'missing');
}
const python=process.env.PYTHON||(process.platform==='win32'?'python':'python3');
const pyVersion=spawnSync(python,['--version'],{encoding:'utf8'});
check('Python',pyVersion.status===0,(pyVersion.stdout||pyVersion.stderr||pyVersion.error?.message||'not found').trim());
const browser=spawnSync(python,[path.join(root,'services/render-worker/worker.py'),'--doctor'],{encoding:'utf8',timeout:45000,env:{...process.env,PYTHONUTF8:'1',NODE_BINARY:process.execPath}});
check('Playwright browser + WebGL2',browser.status===0,browser.status===0?browser.stdout.trim():(browser.stderr||browser.error?.message||'Failed').slice(-1800));
const fine=checks.every(x=>x.ok);console.log(JSON.stringify({checkedAt:new Date().toISOString(),checks},null,2));if(!fine)process.exitCode=1;
