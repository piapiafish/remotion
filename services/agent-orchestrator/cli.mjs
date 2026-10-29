#!/usr/bin/env node
import {readFile,writeFile,mkdir,copyFile,stat,realpath} from 'node:fs/promises';
import {existsSync,createWriteStream} from 'node:fs';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateStoryboard,assertStoryboard,safeAssetUri} from '../../packages/video-schema/index.mjs';
import {planWithModel} from './planner.mjs';import {inspectMedia} from './critic.mjs';import {callTool,TOOLS} from './tools.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
if(existsSync(path.join(root,'.env')) && typeof process.loadEnvFile==='function') process.loadEnvFile(path.join(root,'.env'));
function options(args){const out={};for(let i=0;i<args.length;i++){if(args[i].startsWith('--')){const k=args[i].slice(2);out[k]=args[i+1]?.startsWith('--')?true:args[++i]??true;}}return out;}
function err(code,message){const e=new Error(message);e.code=code;return e;}
async function json(file,obj){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify(obj,null,2)+'\n');}
async function run(program,args,{cwd=root,env=process.env}={}){return new Promise((resolve,reject)=>{
 const child=spawn(program,args,{cwd,env,stdio:['ignore','pipe','pipe'],shell:process.platform==='win32' && /\.cmd$/i.test(program)});
 let tail='';
 child.stdout?.on('data',chunk=>process.stdout.write(chunk));
 child.stderr?.on('data',chunk=>{process.stderr.write(chunk);tail=(tail+chunk.toString()).slice(-2200)});
 child.once('error',reject);
 child.once('close',c=>c===0?resolve():reject(err('PROCESS_FAILED',`${program} exited ${c}: ${tail.trim()}`)));
 });}
async function probe(file){const p=spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'});if(p.status)throw err('PROBE_FAILED',`ffprobe failed: ${p.stderr}`);const d=JSON.parse(p.stdout);const stream=d.streams.find(x=>x.codec_type==='video');if(!stream)throw err('MEDIA_NOT_VIDEO',`No video stream: ${file}`);return {width:stream.width,height:stream.height,duration:Number(d.format?.duration||stream.duration||5)};}
function resolveAsset(uri){if(!safeAssetUri(uri)) throw err('ASSET_PATH_UNSAFE',`Unsafe relative asset path: ${uri}`);const resolved=path.resolve(root,uri);if(!resolved.startsWith(root+path.sep))throw err('ASSET_PATH_UNSAFE',uri);return resolved;}
async function plan(opt){const storyboard=await planWithModel({brief:opt.brief||'展示产品的智能、流畅与效率',media:opt.media||'assets/demo.mp4',music:opt.music==='none'?null:opt.music||'assets/music-demo.mp3',deviceId:opt.device||'iphone-17-pro',seconds:Number(opt.seconds||5),shots:Number(opt.shots||3),width:Number(opt.width||1080),height:Number(opt.height||1920),fps:Number(opt.fps||30)});const file=path.resolve(root,opt.output||'work/storyboard.json');await json(file,storyboard);console.log(`STORYBOARD: ${file} (${storyboard.shots.length} shots)`);}
async function render(opt){const file=path.resolve(root,opt.storyboard||'work/storyboard.json');const board=assertStoryboard(JSON.parse(await readFile(file,'utf8')));
 const dir=path.resolve(root,opt.out||'output');await mkdir(dir,{recursive:true});const logFile=path.join(dir,'render-report.json');const report={schemaVersion:board.schemaVersion,startedAt:new Date().toISOString(),status:'RUNNING',jobs:[],warnings:[]};
 async function writeReport(){await json(logFile,report)};
 await writeReport();
 try{
  for(const asset of board.assets){const full=resolveAsset(asset.uri);if(!existsSync(full))throw err('ASSET_MISSING',`Not found: ${full}`);const actual=await stat(full);if(!actual.isFile())throw err('ASSET_NOT_FILE',full);if(!(await realpath(full)).startsWith(root+path.sep)) throw err('ASSET_PATH_UNSAFE','Symlink points outside project');}
  const shotDir=path.join(dir,'shots');await mkdir(shotDir,{recursive:true});
  for(const shot of board.shots){
   const job={id:shot.shotId,status:'PENDING',startedAt:new Date().toISOString()};report.jobs.push(job);await writeReport();
   const output=path.join(shotDir,shot.shotId+'.mp4');
   const asset=board.assets.find(a=>a.id===shot.screenAssetId);const full=resolveAsset(asset.uri);
   const fingerprint=createHash('sha256').update(JSON.stringify({shot,canvas:board.canvas,quality:board.projectPolicy?.renderQuality||'standard',engineVersion:'0.1.0'})).update(await readFile(full)).update(await readFile(path.join(root,'services/compiler/compile.mjs'))).update(await readFile(path.join(root,'src/automation/bridge.ts'))).digest('hex');
   const stamp=path.join(shotDir,shot.shotId+'.sha256');
   if(existsSync(output)&&existsSync(stamp)&&(await readFile(stamp,'utf8')).trim()===fingerprint&&inspectMedia(output).ok){job.status='CACHED';job.output=output;continue;}
   job.status='RENDERING';await writeReport();
   const py=process.env.PYTHON|| (process.platform==='win32'?'python':'python3');
   const args=['services/render-worker/worker.py','--shot',JSON.stringify(shot),'--canvas',JSON.stringify(board.canvas),'--asset',full,'--output',output,'--job',shot.shotId,'--quality',board.projectPolicy?.renderQuality||'standard'];
   await run(py,args);const check=inspectMedia(output,{minSeconds:shot.durationFrames/board.canvas.fps-0.25});
   if(!check.ok)throw err(check.error,JSON.stringify(check));
   job.status='DONE';job.quality=check;job.output=output;await writeFile(stamp,fingerprint+'\n');await writeReport();
  }
  report.status='SHOTS_DONE'; await writeReport();
  if(opt.compose==='false'){console.log(`Rendered shots: ${shotDir}`);return;}
  const video=path.join(dir,'final.mp4');
  await compose(board,dir,video,opt);
  const review=inspectMedia(video,{minSeconds:board.shots.reduce((n,s)=>n+s.durationFrames,0)/board.canvas.fps-0.5});
  report.final=review;report.status=review.ok?'DONE':'REVIEW_FAILED';report.finishedAt=new Date().toISOString();await writeReport();
  if(!review.ok) throw err('FINAL_QA_FAILED',JSON.stringify(review));
  console.log(`FINISHED: ${video}`);
 }catch(e){for(const job of report.jobs)if(job.status==='RENDERING')job.status='FAILED';report.status='ERROR';report.error={code:e.code||'EXECUTION_FAILED',message:String(e.message||e)};report.finishedAt=new Date().toISOString();await writeReport();throw e;}
}
async function compose(board,dir,output,opt){
 const compositor=path.join(root,'remotion-compositor');
 const assetDir=path.join(compositor,'public','media');await mkdir(assetDir,{recursive:true});
 const clips=[];for(const shot of board.shots){const name=`${shot.shotId}.mp4`;await copyFile(path.join(dir,'shots',name),path.join(assetDir,name));clips.push({src:`media/${name}`,durationFrames:shot.durationFrames,shotId:shot.shotId});}
 let audio=null;const audioRef=board.audio?.[0];if(audioRef){const a=board.assets.find(x=>x.id===audioRef.assetId);if(a){const ext=path.extname(a.uri).toLowerCase();await copyFile(resolveAsset(a.uri),path.join(assetDir,'soundtrack'+ext));audio={src:`media/soundtrack${ext}`,volume:audioRef.volume??.2};}}
 const props={canvas:board.canvas,shots:clips,overlays:board.overlays||[],audio};const propsPath=path.join(dir,'film.remotion.json');await json(propsPath,props);
 const compositorCli=path.join(compositor,'node_modules','.bin',process.platform==='win32'?'remotion.cmd':'remotion');
 if(opt.compositor==='ffmpeg' || !existsSync(compositorCli)){
  console.warn('Remotion not installed or ffmpeg selected: using FFmpeg concat as compatibility fallback. For titles and music install Remotion.');
  const list=path.join(dir,'shots.txt');await writeFile(list,clips.map(c=>`file '${path.join(dir,'shots',c.shotId+'.mp4').replaceAll('\\','/').replaceAll("'","'\\''")}'`).join('\n')+'\n');
  const args=['-y','-f','concat','-safe','0','-i',list];if(audio){args.push('-stream_loop','-1','-i',resolveAsset(board.assets.find(x=>x.id===audioRef.assetId).uri));}
  args.push('-map','0:v:0');if(audio) args.push('-map','1:a:0');args.push('-c:v','libx264','-pix_fmt','yuv420p','-r',String(board.canvas.fps),'-movflags','+faststart');if(audio)args.push('-c:a','aac','-b:a','192k','-shortest');else args.push('-an');args.push(output);
  await run('ffmpeg',args);return;
 }
 await run(compositorCli,['render','src/index.ts','PromoFilm',output,`--props=${propsPath}`,'--log=error'],{cwd:compositor});
}
async function main(){const [cmd,...args]=process.argv.slice(2);const opt=options(args);if(cmd==='tool'){console.log(JSON.stringify(await callTool(opt.name,JSON.parse(opt.input||'{}')),null,2));return;}if(cmd==='plan')return plan(opt);if(cmd==='render')return render(opt);if(cmd==='validate'){const b=JSON.parse(await readFile(path.resolve(root,opt.storyboard||'work/storyboard.json'),'utf8'));const v=validateStoryboard(b);console.log(JSON.stringify(v,null,2));if(!v.ok)process.exitCode=1;return;}if(cmd==='inspect'){console.log(JSON.stringify(inspectMedia(path.resolve(root,opt.file)),null,2));return;}
 console.log('Agent tools: '+TOOLS.join(', ')); console.log('Commands:\n  node services/agent-orchestrator/cli.mjs plan --brief "产品描述" --media assets/demo.mp4 --shots 3\n  node services/agent-orchestrator/cli.mjs validate --storyboard work/storyboard.json\n  node services/agent-orchestrator/cli.mjs render --storyboard work/storyboard.json --out output [--compositor ffmpeg]\n  node services/agent-orchestrator/cli.mjs inspect --file output/final.mp4');
}
main().catch(e=>{console.error(`[${e.code||'ERROR'}] ${e.stack||e}`);process.exitCode=1});
