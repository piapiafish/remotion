const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=process.env.BEGINNER_OUT,url=process.env.STUDIO_URL;
const {chromium}=require(path.join(root,'.venv/Lib/site-packages/playwright/driver/package'));
const {unzipSync,strFromU8}=require(path.join(root,'node_modules/fflate'));
const report={date:new Date().toISOString(),checks:[],scenarios:[],pageErrors:[],consoleErrors:[],status:'RUNNING'};
const write=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
function check(name,ok,detail){report.checks.push({name,status:ok?'PASS':'FAIL',detail});write();console.log((ok?'PASS ':'FAIL ')+name);if(!ok)throw Error(name)}
let browser,context,p,delivery=process.env.THIRD_PROJECT;
async function session(options={}){
 context=await browser.newContext({viewport:{width:1600,height:1000},acceptDownloads:true,...options});
 await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 p=await context.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>report.pageErrors.push(String(e)));p.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text())});p.on('dialog',d=>d.accept());
 p.on('framenavigated',f=>{if(f===p.mainFrame()){(report.navigation??=[]).push({time:new Date().toISOString(),url:f.url()});write()}});await p.goto(url+'/?automation=1',{waitUntil:'networkidle'});
 await p.evaluate(async()=>{window.S=(await import('/src/store/project.ts')).useProjectStore;window.T=await import('/src/timeline/sample.ts');window.O=await import('/src/timeline/objectEditing.ts');window.C=(await import('/src/store/cameraSession.ts')).useCameraSession;window.R=await import('/src/export/renderer.ts');window.F=await import('/src/export/frameRenderer.ts');window.V=await import('/src/media/screenVideo.ts');window.P=await import('/src/store/persist.ts');window.L=await import('/src/media/screenClips.ts');window.B=await import('/src/scene/solidBounds.ts');window.Q=await import('/src/timeline/cameraSegments.ts');window.D=await import('/src/scene/depthOfField.ts')});
}
const state=()=>p.evaluate(()=>JSON.parse(JSON.stringify(window.S.getState().project)));
const ready=()=>p.evaluate(()=>window.__PROMO_BRIDGE__.waitForReady(20000));
async function init(){await p.getByRole('button',{name:/双机并排/}).first().click();await p.evaluate(()=>{const s=window.S.getState();s.setDuration(4);s.setOutput({width:1920,height:1080});s.setActiveDevice(0);s.setDeviceId('iphone-17-pro');s.renameObject('手机 A');s.setActiveDevice(1);s.setDeviceId('pixel-9-pro-xl');s.renameObject('手机 B');s.setActiveDevice(0)});await ready()}
async function open(file){await p.evaluate(()=>window.S.setState({savedFingerprint:window.P.projectFingerprint(window.S.getState().project)}));await p.getByLabel('打开工程文件',{exact:true}).setInputFiles(file);await p.waitForFunction(()=>window.S.getState().editorPage==='editor'&&!window.S.getState().fileBusy);await ready()}
async function time(t){await p.getByRole('spinbutton',{name:'当前时间',exact:true}).fill(String(t));await p.getByRole('spinbutton',{name:'当前时间',exact:true}).press('Tab');await p.waitForTimeout(100)}
async function number(label,value){await p.getByRole('button',{name:'调整'+label,exact:true}).press('Enter');const input=p.getByRole('textbox',{name:label,exact:true});await input.fill(String(value));await input.press('Enter')}
async function save(name){const waiting=p.waitForEvent('download',{timeout:60000});await p.getByRole('button',{name:'保存工程',exact:true}).click();const dl=await waiting,file=path.join(out,name+'.mockup');await dl.saveAs(file);return file}
async function still(name,t){
 const data=await p.evaluate(async t=>(await import('/src/export/session.ts')).withExportSession(async()=>{
  const project=window.S.getState().project;await (await import('/src/scene/textOverlay.ts')).waitForTitleFonts(project);
  const ctx=window.R.getExportContext(),bg=await(await import('/src/export/backdrop.ts')).loadBackdrop(project.background),e=window.F.beginFrameExport({...ctx,project,backdrop:bg,width:1920,height:1080,quality:'standard'});
  try{const canvas=await e.renderAt(t,ctx.applyAt),blob=await canvas.convertToBlob({type:'image/png'});return Array.from(new Uint8Array(await blob.arrayBuffer()))}finally{e.dispose();bg?.dispose?.()}
 }),t);fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(data))
}
async function scenario(name,fn){if(process.env.THIRD_SCENARIOS&&!process.env.THIRD_SCENARIOS.split(',').includes(name))return;await session();try{await fn();report.scenarios.push({name,status:'PASS'})}catch(e){report.scenarios.push({name,status:'FAIL',error:String(e)});console.log('SCENARIO FAIL '+name+' '+String(e));await p.screenshot({path:path.join(out,name+'-failed.png'),fullPage:true}).catch(()=>{})}finally{write();await context.close()}}

const fixtureFile=path.join(root,'reports/current/p126-p134-implementation-20261104/browser-final/second-feedback-scene.mockup');
const fixtureZip=unzipSync(fs.readFileSync(fixtureFile)),fixtureProject=JSON.parse(strFromU8(fixtureZip['project.json']));
const fixtureVideos=fixtureProject.devices.map(d=>d.screen).filter(r=>r?.kind==='video').map(r=>({ref:r,buffer:Buffer.from(fixtureZip['media/'+r.id])}));
async function upload(index,name){const v=fixtureVideos[index%fixtureVideos.length],webm=v.buffer[0]===0x1a;await p.getByLabel('添加屏幕素材文件',{exact:true}).setInputFiles({name:name+(webm?'.webm':'.mp4'),mimeType:webm?'video/webm':'video/mp4',buffer:v.buffer});await p.waitForFunction(name=>window.S.getState().project.devices[window.S.getState().activeDevice].screenClips?.some(c=>c.name.startsWith(name)),name);await ready()}
async function buildMedia(){
 await init();await upload(0,'片段 A');await upload(1,'片段 B');await upload(0,'片段 C');
 await p.evaluate(()=>{const s=window.S.getState(),d=s.project.devices[0];for(const c of d.screenClips){const A=c.name.startsWith('片段 A'),B=c.name.startsWith('片段 B');s.updateScreenClip(c.clipId,{displayRange:A?{start:0,end:1.4}:B?{start:1.4,end:3.8}:{start:2,end:3},playback:{in:0,out:c.media.duration,start:A?.2:B?1.6:2.1,stop:A?.8:B?3.4:2.8,rate:B?2:1,loop:false}})}s.setActiveDevice(1)});
 await upload(1,'设备 B 视频');
 await p.evaluate(()=>{const s=window.S.getState(),d=s.project.devices[1];s.updateScreenClip(d.screenClips[0].clipId,{displayRange:{start:.5,end:4},playback:{start:.7,stop:3.5,rate:1,loop:false}});s.setDisplayRange({kind:'device',instanceId:s.project.devices[0].instanceId},{start:0,end:3.8});s.setDisplayRange({kind:'device',instanceId:d.instanceId},{start:.5,end:4});s.setDuration(4);s.setActiveDevice(0);s.setPlayhead(0)});
 await ready();
}
async function integrated(){
 await buildMedia();
 const cameraFile=JSON.parse(fs.readFileSync(path.join(root,'reports/current/p144-p152-implementation-20261104/browser-second/camera-delivery.json'))).project;
 const take=JSON.parse(strFromU8(unzipSync(fs.readFileSync(cameraFile))['project.json'])).camera;
 await p.evaluate(take=>{const segments=take.segments.map((segment,i)=>{const start=i?2.5:.4,end=i?3.5:1.4,f=(end-start)/(segment.end-segment.start);return {...segment,start,end,tracks:Object.fromEntries(Object.entries(segment.tracks).map(([c,t])=>[c,{...t,keys:t.keys.map(k=>({...k,t:k.t*f}))}]))}});const s=window.S.getState();window.S.setState({project:{...s.project,camera:{...take,segments}}});s.setDuration(4);s.setActiveDevice(0)},take);
 await p.getByRole('button',{name:'添加实体文字',exact:true}).click();await p.getByRole('textbox',{name:'文字内容',exact:true}).fill('灵感');await number('字号',48);await number('水平位置',0);await number('垂直位置',.8);await number('纵深位置',-.6);await p.getByRole('textbox',{name:'对象名称',exact:true}).fill('立体焦点');
 await p.evaluate(()=>import('/src/scene/textOverlay.ts').then(m=>m.waitForTitleFonts(window.S.getState().project)));await p.waitForTimeout(100);const solid=(await state()).texts.at(-1);
 await p.getByRole('tab',{name:'环境',exact:true}).click();await p.getByRole('checkbox',{name:'景深',exact:true}).check();await p.getByLabel('对焦对象',{exact:true}).selectOption('text:'+solid.instanceId);
 await p.getByLabel('景深强度',{exact:true}).fill('0.65');
 check('solid-is-offered-as-focus-target',(await state()).effects.depthOfField.focusObject.instanceId===solid.instanceId);
 await p.getByRole('tab',{name:'对象',exact:true}).click();await p.getByRole('button',{name:'添加文字',exact:true}).click();await p.getByRole('textbox',{name:'文字内容',exact:true}).fill('让创作，更简单');await number('字号',56);await number('垂直位置',10);const clear=(await state()).texts.at(-1);check('stickers-start-clear',!clear.depthOfField?.enabled);
 await p.getByRole('button',{name:'添加文字',exact:true}).click();await p.getByRole('textbox',{name:'文字内容',exact:true}).fill('每一次停留，都有节奏');await number('字号',36);await number('垂直位置',89);await p.getByRole('checkbox',{name:'贴纸受景深影响',exact:true}).check();await number('景深距离',8);const blurry=(await state()).texts.at(-1);
 check('sticker-depth-setting-saved-in-project',blurry.depthOfField.enabled&&blurry.depthOfField.distance===8);
 const coverage=await p.evaluate(async()=>{const m=await import('/src/scene/textOverlay.ts'),s=window.S.getState(),project={...s.project,texts:[s.project.texts.at(-1)]};const c=new OffscreenCanvas(1920,1080),ctx=c.getContext('2d');function pixels(p){ctx.clearRect(0,0,1920,1080);m.paintTitles(ctx,p,0,1920,1080);const a=ctx.getImageData(0,0,1920,1080).data;let area=0;for(let i=3;i<a.length;i+=4)if(a[i]>3)area++;return area}return {sharp:pixels({...project,effects:{...project.effects,depthOfField:{...project.effects.depthOfField,enabled:false}}}),blur:pixels(project)}});
 check('sticker-dof-changes-real-canvas-pixels',coverage.blur>coverage.sharp*1.2,coverage);
 const focus=await p.evaluate(()=>window.D.focusDistance(window.S.getState().project,0));await p.evaluate(id=>{const s=window.S.getState();s.removeObject({kind:'text',instanceId:id})},solid.instanceId);check('deleting-solid-focus-retains-effective-distance',Math.abs((await state()).effects.depthOfField.distance-focus)<1e-6);await p.getByRole('button',{name:'撤销',exact:true}).click();
 await p.evaluate(()=>{const s=window.S.getState();s.setEffects({...s.project.effects,motionBlur:{enabled:true,strength:.3,samples:2}});s.selectObject(null);s.setPlayhead(0)});await ready();
 const file=await save('fourth-integrated');fs.writeFileSync(path.join(out,'delivery.json'),JSON.stringify({project:file},null,2));return file
}
async function exportVideo(name){
 await p.getByRole('button',{name:'导出',exact:true}).click();await p.getByRole('button',{name:'标准',exact:true}).click();
 const downloading=p.waitForEvent('download',{timeout:420000});downloading.catch(()=>{});await p.getByRole('button',{name:'导出视频（MP4 (H.264)）',exact:true}).click();const timer=setInterval(()=>{void p.evaluate(()=>document.querySelector('.studio-dialog')?.innerText).then(text=>{fs.writeFileSync(path.join(out,'export-progress.json'),JSON.stringify({time:new Date().toISOString(),text}));console.log('EXPORT '+name+' '+text?.slice(-200))}).catch(()=>{})},10000);let dl;try{dl=await downloading}finally{clearInterval(timer)}const file=path.join(out,name+'.mp4');await dl.saveAs(file);await p.getByRole('button',{name:'关闭面板',exact:true}).click();return file
}
(async()=>{try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--enable-webgl','--use-gl=angle','--enable-unsafe-swiftshader']});report.browser=browser.version();
 await scenario('effects',async()=>{
  delivery=await integrated();await time(2);await still('integrated-reference',2);await p.screenshot({path:path.join(out,'integrated-editor.png'),fullPage:true});
  const bytes=fs.readFileSync(delivery),saved=JSON.parse(strFromU8(unzipSync(bytes)['project.json']));check('version-five-contains-segments-fonts-clips-and-sticker-depth',saved.version===5&&saved.camera.segments.length===2&&saved.texts.some(t=>t.fontData)&&saved.texts.some(t=>t.depthOfField?.enabled)&&saved.devices[0].screenClips.length===3&&!JSON.stringify(saved).includes('blob:'));
  await context.close();await session();await open(delivery);const after=await state();check('fresh-session-restores-segments-and-effects',JSON.stringify(after.camera)===JSON.stringify(saved.camera)&&JSON.stringify(after.texts)===JSON.stringify(saved.texts)&&after.effects.depthOfField.focusObject.kind==='text');await still('restored-reference',2);
  for(const [w,h]of [[1920,1080],[1366,768],[1000,800]]){await p.setViewportSize({width:w,height:h});await p.waitForTimeout(200);const visible=await p.evaluate(()=>{const timeline=document.querySelector('.timeline-scroll').getBoundingClientRect(),board=document.querySelector('[data-testid=artboard]').getBoundingClientRect();return {timeline:timeline.height,board:board.height,overflow:document.documentElement.scrollWidth>innerWidth+2}});check('editor-layout-'+w+'x'+h,visible.timeline>40&&visible.board>160&&!visible.overflow,visible);await p.screenshot({path:path.join(out,'editor-'+w+'x'+h+'.png'),fullPage:true})}
  await p.setViewportSize({width:1600,height:1000});await p.getByTestId('camera-segment-'+after.camera.segments[1].id).click();await p.getByRole('button',{name:'重新录制此段',exact:true}).click();check('rerecord-uses-chosen-segment-window',await p.evaluate(()=>{const s=window.C.getState();return s.replaceId&&s.start===2.5&&s.limit===3.5}));await p.screenshot({path:path.join(out,'recorder-segment-window.png'),fullPage:true});await p.getByRole('button',{name:'放弃并返回编辑器',exact:true}).click();check('discard-rerecord-keeps-old-project',JSON.stringify((await state()).camera)===JSON.stringify(after.camera));
 });
 await scenario('exports',async()=>{
  delivery=process.env.FOURTH_PROJECT??JSON.parse(fs.readFileSync(path.join(out,'delivery.json'))).project;await open(delivery);
  const frames=[0,11,12,23,24,29,30,41,42,59,60,74,75,89,90,104,105,113,114,119];for(const frame of frames)await still('reference-'+String(frame).padStart(3,'0'),frame/30);
  const file=await exportVideo('fourth-feedback-1080p30');const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',file],{encoding:'utf-8'}));fs.writeFileSync(path.join(out,'ffprobe-short.json'),JSON.stringify(probe,null,2));check('real-short-mp4-is-1080p30',probe.streams[0].width===1920&&probe.streams[0].height===1080&&probe.streams[0].nb_read_frames==='120');
  await p.evaluate(()=>{const s=window.S.getState();s.setEffects({...s.project.effects,depthOfField:{...s.project.effects.depthOfField,enabled:false},motionBlur:{...s.project.effects.motionBlur,enabled:false}});s.setDuration(30)});await save('fourth-feedback-30s');const long=await exportVideo('fourth-feedback-30s');const longer=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',long],{encoding:'utf-8'}));fs.writeFileSync(path.join(out,'ffprobe-long.json'),JSON.stringify(longer,null,2));check('real-long-mp4-is-900-frames',longer.streams[0].nb_read_frames==='900');
 });
 report.status=report.scenarios.every(s=>s.status==='PASS')&&!report.pageErrors.length&&!report.consoleErrors.length?'PASS':'FAIL';if(report.status!=='PASS')process.exitCode=1;
}catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1}finally{write();await browser?.close()}})();
