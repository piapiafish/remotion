#!/usr/bin/env node
// Real rendering smoke test. All subprocesses use executable argument arrays.
import {spawnSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'output','p0-smoke');
const cli=path.join(root,'services/agent-orchestrator/cli.mjs');
await mkdir(out,{recursive:true});
const commands=[];
function run(program,args){
 console.log(`\n> ${program} ${args.join(' ')}`);
 const result=spawnSync(program,args,{cwd:root,env:process.env,encoding:'utf8',maxBuffer:16*1024*1024});
 process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
 commands.push({program,args,exitCode:result.status});
 if(result.status!==0)throw new Error(result.error?.message||`Process exited ${result.status}`);
}
const agent=(...args)=>run(process.execPath,[cli,...args]);
const single=path.join(root,'work/p0-single.json');
const film=path.join(root,'work/p0-film.json');
let status='ERROR';
try{
 run(process.execPath,['scripts/doctor.mjs']);
 const common=['--offline','--brief','智能分析；自动规划；精彩呈现','--media','assets/demo.mp4','--width','540','--height','960','--fps','30'];
 agent('plan',...common,'--shots','1','--output',single);
 agent('validate','--storyboard',single);
 agent('render','--storyboard',single,'--out',path.join(out,'single'),'--compose','false');
 if(process.argv.includes('--force-png'))agent('render','--storyboard',single,'--out',path.join(out,'png-fallback'),'--compose','false','--force-png');
 agent('plan',...common,'--shots','3','--output',film);
 agent('validate','--storyboard',film);
 const filmDir=path.join(out,'film');
 agent('render','--storyboard',film,'--out',filmDir);
 const report=JSON.parse(await readFile(path.join(filmDir,'render-report.json'),'utf8'));
 if(report.status!=='DONE'||report.compositor!=='remotion'||!report.final.audio)throw new Error('Remotion/audio composition did not pass');
 run('ffmpeg',['-v','error','-i',path.join(filmDir,'final.mp4'),'-f','null','-']);
 agent('render','--storyboard',film,'--out',filmDir);
 const cached=JSON.parse(await readFile(path.join(filmDir,'render-report.json'),'utf8'));
 if(cached.jobs.some(job=>job.status!=='CACHED'))throw new Error('Repeated render did not reuse all shot caches');
 if(process.argv.includes('--models'))run(process.env.PYTHON||(process.platform==='win32'?'python':'python3'),['scripts/p0-visual.py','--out',path.join(out,'models')]);
 status='DONE';console.log('\nP0 smoke passed: real single MP4, 3 shots, Remotion + audio, full decoding and cache reuse. Review screenshots for visual quality.');
}catch(error){console.error(error);process.exitCode=1}
finally{await writeFile(path.join(out,'smoke-report.json'),JSON.stringify({status,commands},null,2)+'\n')}
