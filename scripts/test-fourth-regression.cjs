const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=process.env.BEGINNER_OUT,url=process.env.STUDIO_URL;
const {chromium}=require(path.join(root,'.venv/Lib/site-packages/playwright/driver/package'));
const {unzipSync,strFromU8}=require(path.join(root,'node_modules/fflate'));
const report={date:new Date().toISOString(),checks:[],scenarios:[],pageErrors:[],consoleErrors:[],status:'RUNNING'};
const write=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
function check(name,ok,detail){report.checks.push({name,status:ok?'PASS':'FAIL',detail});write();console.log((ok?'PASS ':'FAIL ')+name);if(!ok)throw Error(name)}
let browser,context,p;
async function session(options={}){
 context=await browser.newContext({viewport:{width:1600,height:1000},acceptDownloads:true,...options});
 await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 p=await context.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>report.pageErrors.push(String(e)));p.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text())});p.on('dialog',d=>d.accept());
 p.on('framenavigated',f=>{if(f===p.mainFrame()){(report.navigation??=[]).push({time:new Date().toISOString(),url:f.url()});write()}});await p.goto(url+'/?automation=1',{waitUntil:'networkidle'});
 await p.evaluate(async()=>{window.S=(await import('/src/store/project.ts')).useProjectStore;window.T=await import('/src/timeline/sample.ts');window.O=await import('/src/timeline/objectEditing.ts');window.C=(await import('/src/store/cameraSession.ts')).useCameraSession;window.R=await import('/src/export/renderer.ts');window.F=await import('/src/export/frameRenderer.ts');window.V=await import('/src/media/screenVideo.ts');window.P=await import('/src/store/persist.ts');window.L=await import('/src/media/screenClips.ts');window.B=await import('/src/scene/solidBounds.ts');window.Q=await import('/src/timeline/cameraSegments.ts');window.D=await import('/src/scene/depthOfField.ts')});
}
const state=()=>p.evaluate(()=>JSON.parse(JSON.stringify(window.S.getState().project)));
const ready=()=>p.evaluate(()=>window.__PROMO_BRIDGE__.waitForReady(20000));
async function open(file){await p.evaluate(()=>window.S.setState({savedFingerprint:window.P.projectFingerprint(window.S.getState().project)}));await p.getByLabel('打开工程文件',{exact:true}).setInputFiles(file);await p.waitForFunction(()=>window.S.getState().editorPage==='editor'&&!window.S.getState().fileBusy);await ready()}
async function scenario(name,fn){if(process.env.THIRD_SCENARIOS&&!process.env.THIRD_SCENARIOS.split(',').includes(name))return;await session();try{await fn();report.scenarios.push({name,status:'PASS'})}catch(e){report.scenarios.push({name,status:'FAIL',error:String(e)});console.log('SCENARIO FAIL '+name+' '+String(e));await p.screenshot({path:path.join(out,name+'-failed.png'),fullPage:true}).catch(()=>{})}finally{write();await context.close()}}

const finalScene=JSON.parse(fs.readFileSync(path.join(root,'reports/current/p144-p152-implementation-20261104/effects-complete/delivery.json'))).project;
(async()=>{try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--enable-webgl','--use-gl=angle','--enable-unsafe-swiftshader']});report.browser=browser.version();
 await scenario('focus',async()=>{
  await open(finalScene);const camera=JSON.stringify((await state()).camera);await p.getByRole('textbox',{name:'工程名称',exact:true}).fill('WASD 输入保留');await p.keyboard.press('w');check('text-field-keeps-wasd-input',JSON.stringify((await state()).camera)===camera&&await p.evaluate(()=>window.C.getState().view===null));
  await p.getByTestId('artboard').focus();await p.keyboard.down('d');await p.waitForTimeout(180);await p.keyboard.press('Escape');await p.keyboard.up('d');check('escape-restores-temporary-camera',await p.evaluate(()=>window.C.getState().view===null));
 });
 await scenario('camera-boundaries',async()=>{
  await open(finalScene);const before=(await state()).camera,segment=before.segments[1];await p.getByTestId('camera-segment-'+segment.id).click();await p.getByRole('button',{name:'重新录制此段',exact:true}).click();
  for(const [w,h]of [[1920,1080],[1366,768],[1000,800]]){await p.setViewportSize({width:w,height:h});await p.waitForTimeout(150);const b=await p.getByRole('button',{name:'开始录制（3 秒倒计时）',exact:true}).boundingBox();check('recorder-start-visible-'+w+'x'+h,b&&b.y>=0&&b.y+b.height<=h);await p.screenshot({path:path.join(out,'recorder-'+w+'x'+h+'.png'),fullPage:true})}
  await p.setViewportSize({width:1600,height:1000});await p.getByRole('button',{name:'开始录制（3 秒倒计时）',exact:true}).click();await p.waitForFunction(()=>window.C.getState().mode==='recording');await p.keyboard.down('a');await p.waitForTimeout(140);await p.keyboard.up('a');await p.waitForFunction(()=>window.C.getState().mode==='review',null,{timeout:20000});
  const boundary=await p.evaluate(()=>{const s=window.C.getState();return {end:s.end,max:Math.max(...Object.values(s.draft).flatMap(t=>t.keys.map(k=>k.t)))}});check('recording-auto-stops-exactly-at-segment-end',Math.abs(boundary.end-segment.end)<1e-8&&boundary.max<=segment.end+1e-8,boundary);
  await p.getByRole('button',{name:'采用本次录制',exact:true}).click();const after=(await state()).camera;check('rerecord-retains-id-and-other-segment',after.segments[1].id===segment.id&&JSON.stringify(after.segments[0])===JSON.stringify(before.segments[0]));
  await p.getByRole('button',{name:'撤销',exact:true}).click();check('rerecord-is-one-undo',JSON.stringify((await state()).camera)===JSON.stringify(before));
  for(const c of before.segments){await p.getByTestId('camera-segment-'+c.id).click();await p.getByRole('button',{name:'删除本段',exact:true}).click()}
  check('deleting-all-segments-restores-static-camera',(await state()).camera.segments.length===0&&await p.getByRole('button',{name:'添加相机动画',exact:true}).isVisible());await p.getByRole('button',{name:'撤销',exact:true}).click();await p.getByRole('button',{name:'撤销',exact:true}).click();check('two-deletes-can-both-be-undone',JSON.stringify((await state()).camera)===JSON.stringify(before));
 });
 await scenario('legacy',async()=>{
  const file=path.join(root,'reports/current/p135-p143-implementation-20261104/browser-verified/third-feedback-export-scene.mockup'),raw=JSON.parse(strFromU8(unzipSync(fs.readFileSync(file))['project.json']));await open(file);
  const compatible=await p.evaluate(raw=>{const after=window.S.getState().project;return [0,.5,1.5,3.9].every(t=>JSON.stringify(window.T.sampleTimeline(after,t).camera)===JSON.stringify(window.T.sampleTimeline(raw,t).camera))},raw);check('version-four-camera-migration-preserves-sampled-curve',compatible);check('old-multivideo-fonts-and-effects-retained',(await state()).devices[0].screenClips.length===raw.devices[0].screenClips.length&&(await state()).texts.length===raw.texts.length);
 });
 await scenario('cancel',async()=>{
  await open(finalScene);await p.evaluate(()=>window.S.getState().setDuration(30));await p.getByRole('button',{name:'导出',exact:true}).click();await p.getByRole('button',{name:'标准',exact:true}).click();await p.getByRole('button',{name:'导出视频（MP4 (H.264)）',exact:true}).click();await p.getByRole('button',{name:/取消导出/}).click();await p.waitForFunction(async()=>!(await import('/src/export/session.ts')).useExportSession.getState().busy);check('cancel-restores-editing-session',true);await p.getByRole('button',{name:'关闭面板',exact:true}).click();await p.evaluate(()=>{const s=window.S.getState();s.setDuration(2);s.setEffects({...s.project.effects,depthOfField:{...s.project.effects.depthOfField,enabled:false},motionBlur:{...s.project.effects.motionBlur,enabled:false}})});await p.getByRole('button',{name:'导出',exact:true}).click();const waiting=p.waitForEvent('download',{timeout:180000});waiting.catch(()=>{});await p.getByRole('button',{name:'导出视频（MP4 (H.264)）',exact:true}).click();const dl=await waiting,file=path.join(out,'cancel-retry-2s.mp4');await dl.saveAs(file);const q=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-of','json',file],{encoding:'utf-8'}));check('retry-after-cancel-exports-real-sixty-frames',q.streams[0].nb_read_frames==='60');
 });
 report.status=report.scenarios.every(s=>s.status==='PASS')&&!report.pageErrors.length&&!report.consoleErrors.length?'PASS':'FAIL';if(report.status!=='PASS')process.exitCode=1;
}catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1}finally{write();await browser?.close()}})();
