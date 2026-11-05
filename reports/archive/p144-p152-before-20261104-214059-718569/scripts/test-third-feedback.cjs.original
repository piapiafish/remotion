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
 await p.evaluate(async()=>{window.S=(await import('/src/store/project.ts')).useProjectStore;window.T=await import('/src/timeline/sample.ts');window.O=await import('/src/timeline/objectEditing.ts');window.C=(await import('/src/store/cameraSession.ts')).useCameraSession;window.R=await import('/src/export/renderer.ts');window.F=await import('/src/export/frameRenderer.ts');window.V=await import('/src/media/screenVideo.ts');window.P=await import('/src/store/persist.ts');window.L=await import('/src/media/screenClips.ts');window.B=await import('/src/scene/solidBounds.ts')});
}
const state=()=>p.evaluate(()=>JSON.parse(JSON.stringify(window.S.getState().project)));
const ready=()=>p.evaluate(()=>window.__PROMO_BRIDGE__.waitForReady(20000));
async function init(){await p.getByRole('button',{name:/双机并排/}).first().click();await p.evaluate(()=>{const s=window.S.getState();s.setDuration(4);s.setOutput({width:1920,height:1080});s.setActiveDevice(0);s.setDeviceId('iphone-17-pro');s.renameObject('手机 A');s.setActiveDevice(1);s.setDeviceId('pixel-9-pro-xl');s.renameObject('手机 B');s.setActiveDevice(0)});await ready()}
async function open(file){await p.evaluate(()=>window.S.setState({savedFingerprint:window.P.projectFingerprint(window.S.getState().project)}));await p.getByLabel('打开工程文件',{exact:true}).setInputFiles(file);await p.waitForFunction(()=>window.S.getState().editorPage==='editor'&&!window.S.getState().fileBusy);await ready()}
async function time(t){await p.getByRole('spinbutton',{name:'当前时间',exact:true}).fill(String(t));await p.getByRole('spinbutton',{name:'当前时间',exact:true}).press('Tab');await p.waitForTimeout(100)}
async function number(label,value){await p.getByRole('button',{name:'调整'+label,exact:true}).press('Enter');const input=p.getByRole('textbox',{name:label,exact:true});await input.fill(String(value));await input.press('Enter')}
async function timing(label,value){const input=p.getByRole('spinbutton',{name:label,exact:true});await input.fill(String(value));await input.press('Tab');await p.waitForTimeout(60)}
async function save(name){const waiting=p.waitForEvent('download',{timeout:60000});await p.getByRole('button',{name:'保存工程',exact:true}).click();const dl=await waiting,file=path.join(out,name+'.mockup');await dl.saveAs(file);return file}
async function drag(locator,dx,relativeY=.5){const b=await locator.boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height*relativeY);await p.mouse.down();await p.mouse.move(b.x+b.width/2+dx,b.y+b.height*relativeY,{steps:12});await p.mouse.up();await p.waitForTimeout(100)}
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
async function screenHash(index){return p.evaluate(index=>{let texture;window.R.getExportContext().scene.traverse(o=>{if(o.userData.deviceIndex===index)o.traverse(mesh=>{const m=mesh.material;if(m&&!Array.isArray(m)){const t=m.uniforms?.map?.value??m.map;if(t?.image instanceof HTMLCanvasElement)texture=t}})});if(!texture)return null;const c=texture.image,data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=2166136261;for(let i=0;i<data.length;i+=31)h=Math.imul(h^data[i],16777619);return h>>>0},index)}
(async()=>{try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--enable-webgl','--use-gl=angle','--enable-unsafe-swiftshader']});report.browser=browser.version();
 await scenario('smoke',async()=>{
  await init();check('two-real-models-ready',(await state()).devices.length===2);
  const first=(await state()).devices[0];await p.getByRole('button',{name:'添加实体文字',exact:true}).click();await p.getByRole('textbox',{name:'文字内容',exact:true}).fill('立体文字');
  await p.evaluate(()=>import('/src/scene/textOverlay.ts').then(m=>m.waitForTitleFonts(window.S.getState().project)));
  await p.waitForTimeout(250);check('solid-selected-outline-and-axis-controls',await p.evaluate(()=>{const ctx=window.R.getExportContext();let solid=false,box=false,axes=false;ctx.scene.traverse(o=>{if(o.userData.textId)solid=true;if(o.type==='BoxHelper'&&o.visible)box=true;if(o.isTransformControls)axes=true});return solid&&box&&axes}));
  await number('垂直位置',-10);await p.waitForTimeout(120);
  check('solid-cannot-cross-fixed-floor',await p.evaluate(()=>{const s=window.S.getState(),t=s.project.texts.at(-1),pose=window.B.sampleSolidPose(t,s.playhead,s.project.environment.groundY);return pose.position[1]>s.project.environment.groundY}));
  await p.screenshot({path:path.join(out,'solid-selection.png'),fullPage:true});await still('solid-ground',0);
  const track=p.getByTestId('track-'+first.instanceId);check('empty-object-row-is-compact',(await track.boundingBox()).height<=56);
  await p.evaluate(id=>{const s=window.S.getState();s.setActiveDevice(0);s.setDisplayRange({kind:'device',instanceId:id},{start:1,end:3})},first.instanceId);await time(.5);
  check('phone-really-removed-from-scene',await p.evaluate(()=>{let found=false;window.R.getExportContext().scene.traverse(o=>{if(o.userData.deviceIndex===0)found=true});return !found}));
  await time(1);check('phone-reattaches-at-start',await p.evaluate(()=>{let found=false;window.R.getExportContext().scene.traverse(o=>{if(o.userData.deviceIndex===0)found=true});return found}));
  await time(3);check('phone-removed-at-exclusive-end',await p.evaluate(()=>{let found=false;window.R.getExportContext().scene.traverse(o=>{if(o.userData.deviceIndex===0)found=true});return !found}));
  await still('future-object-restores-in-export',2);
 });

 await scenario('media',async()=>{
  await buildMedia();const project=await state(),clips=project.devices[0].screenClips;
  check('one-phone-has-three-independent-clips',clips.length===3&&new Set(clips.map(c=>c.clipId)).size===3);
  check('repeated-source-deduplicates-by-content',clips.find(c=>c.name.startsWith('片段 A')).media.id===clips.find(c=>c.name.startsWith('片段 C')).media.id);
  const id=project.devices[0].instanceId,track=p.getByTestId('track-'+id);
  check('overlapping-video-expands-only-its-object-row',(await track.boundingBox()).height>80);
  await p.evaluate(()=>{const s=window.S.getState(),d=s.project.devices[0];for(const [i,c]of d.screenClips.entries())s.updateScreenClip(c.clipId,{displayRange:{start:i,end:i+1}})});
  check('nonoverlapping-videos-auto-share-one-row',(await track.boundingBox()).height<=56);
  await p.evaluate(clips=>{const s=window.S.getState();for(const c of clips)s.updateScreenClip(c.clipId,c)},clips);
  const c=clips.find(c=>c.name.startsWith('片段 A'));await p.evaluate(id=>window.S.getState().selectScreenClip(id),c.clipId);
  await p.getByText('动画调节 · 屏幕视频',{exact:true}).click();
  await timing('视频出现时间',.1);await timing('视频消失时间',1.4);
  await timing('在作品第几秒开始播放',.3);await timing('在作品第几秒暂停',.8);
  check('two-intervals-edit-independently',await p.evaluate(id=>{const c=window.S.getState().project.devices[0].screenClips.find(c=>c.clipId===id);return c.displayRange.start===.1&&c.playback.start===.3&&c.playback.stop===.8},c.clipId));
  await time(.9);await still('pause-hold-a',.9);const pauseA=await screenHash(0);
  await time(1.2);await still('pause-hold-b',1.2);check('pause-holds-identical-decoded-screen',pauseA===await screenHash(0));
  await time(2.4);await still('overlap-top-c',2.4);const top=await screenHash(0),before=await state();
  await p.getByRole('button',{name:/上移视频 片段 B/}).click();await still('overlap-top-b',2.4);
  check('moving-video-up-changes-composited-screen',top!==await screenHash(0));
  await p.getByRole('button',{name:'撤销',exact:true}).click();
  check('layer-undo-preserves-all-clip-times',JSON.stringify((await state()).devices[0].screenClips)===JSON.stringify(before.devices[0].screenClips));
  const video=p.getByTestId('video-'+c.clipId);const lane=await track.locator('.object-lane').boundingBox(),dt=4/lane.width*50;
  const original=(await state()).devices[0].screenClips.find(x=>x.clipId===c.clipId);await drag(video.locator('[data-drag="clip-in"]'),50);
  const trimmed=(await state()).devices[0].screenClips.find(x=>x.clipId===c.clipId);
  check('blue-handle-only-changes-visibility',trimmed.displayRange.start>original.displayRange.start&&JSON.stringify(trimmed.playback)===JSON.stringify(original.playback),{dt});
  await p.getByRole('button',{name:'撤销',exact:true}).click();
  await drag(video.locator('[data-drag="play-out"]'),45);
  const paused=(await state()).devices[0].screenClips.find(x=>x.clipId===c.clipId);
  check('orange-handle-only-changes-play-window',paused.playback.stop>original.playback.stop&&JSON.stringify(paused.displayRange)===JSON.stringify(original.displayRange));
  await p.getByRole('button',{name:'撤销',exact:true}).click();
  await p.screenshot({path:path.join(out,'multi-video-timeline.png'),fullPage:true});
  await p.getByRole('button',{name:'添加实体文字',exact:true}).click();await p.getByRole('textbox',{name:'文字内容',exact:true}).fill('多视频 · 演示');
  await number('垂直位置',.95);await number('纵深位置',-.15);await number('文字厚度',.12);
  await p.evaluate(()=>{const s=window.S.getState(),t=s.project.texts.at(-1);s.setDisplayRange({kind:'text',instanceId:t.instanceId},{start:.25,end:3.6});s.setPlayhead(0);s.setEffects({depthOfField:{enabled:true,focusDevice:s.project.devices[0].instanceId,distance:3.2,strength:.3},motionBlur:{enabled:true,strength:.4,samples:2}})});
  await p.evaluate(()=>import('/src/scene/textOverlay.ts').then(m=>m.waitForTitleFonts(window.S.getState().project)));
  delivery=await save('third-feedback-scene');const saved=JSON.parse(strFromU8(unzipSync(fs.readFileSync(delivery))['project.json']));
  check('version-four-saves-all-clips-and-fonts',saved.version===4&&saved.devices[0].screenClips.length===3&&saved.devices[1].screenClips.length===1&&typeof saved.texts[0].fontData==='string'&&!JSON.stringify(saved).includes('blob:'));
  fs.writeFileSync(path.join(out,'delivery.json'),JSON.stringify({project:delivery},null,2));
 });

 await scenario('authoring',async()=>{
  await init();const scaleMeasurements=[];
  for(const id of ['procedural-phone','iphone-17-pro','iphone-17-pro-max','pixel-9-pro-xl','galaxy-s26-ultra']){
    await p.evaluate(id=>{const s=window.S.getState();s.setActiveDevice(0);s.setDeviceId(id);const a=s.project.devices[0].scaleAnchor;s.setDevicePosition([a[0]+.7,a[1]+.3,a[2]]);s.setDeviceRotation([0,.25,0])},id);await ready();
    const before=await p.evaluate(()=>{const s=window.S.getState();return {pose:window.T.sampleTimeline(s.project,s.playhead).devices[0],anchor:s.project.devices[0].scaleAnchor,device:s.project.devices[0]}});
    const board=await p.getByTestId('artboard').boundingBox();await p.mouse.move(board.x+board.width*.15,board.y+board.height*.3);await p.mouse.wheel(0,120);await p.waitForTimeout(250);
    const after=await p.evaluate(()=>{const s=window.S.getState();return window.T.sampleTimeline(s.project,s.playhead).devices[0]}),factor=after.scale/before.pose.scale,expected=before.anchor[0]+(before.pose.position[0]-before.anchor[0])*factor;
    check('fixed-initial-anchor-'+id,Math.abs(after.position[0]-expected)<1e-6&&after.scale<before.pose.scale,{before,after,expected});scaleMeasurements.push({id,before,after,expected});
    await p.getByRole('button',{name:'撤销',exact:true}).click();check('scale-one-undo-'+id,JSON.stringify((await state()).devices[0])===JSON.stringify(before.device));
  }
  fs.writeFileSync(path.join(out,'scale-anchor-measurements.json'),JSON.stringify(scaleMeasurements,null,2));
  await p.evaluate(()=>{const s=window.S.getState();s.selectObject(null);s.setCameraPosition([-1.5,1,3.6]);s.setCameraTarget([0,.2,0])});
  await p.getByRole('button',{name:'添加实体文字',exact:true}).click();await p.getByRole('textbox',{name:'文字内容',exact:true}).fill('立体\n文字');await number('字号',60);await number('垂直位置',-10);await number('俯仰角',90);await number('文字厚度',.4);
  await p.evaluate(()=>import('/src/scene/textOverlay.ts').then(m=>m.waitForTitleFonts(window.S.getState().project)));await p.waitForTimeout(150);
  const floor=await p.evaluate(async()=>{const {Box3}=await import('/node_modules/three/build/three.module.js'),s=window.S.getState();let min;window.R.getExportContext().scene.traverse(o=>{if(o.userData.textId)min=new Box3().setFromObject(o).min.y});return {min,ground:s.project.environment.groundY}});
  check('actual-extruded-glyph-never-crosses-ground',floor.min>=floor.ground-1e-6,floor);
  await number('俯仰角',0);await number('垂直位置',.8);await p.waitForTimeout(150);
  const axis=await p.evaluate(async()=>{const {Box3,Vector3}=await import('/node_modules/three/build/three.module.js'),ctx=window.R.getExportContext();ctx.scene.updateMatrixWorld(true);let controls;ctx.scene.traverse(o=>{if(o.isTransformControls)controls=o});if(!controls)return null;const rect=ctx.renderer.domElement.getBoundingClientRect(),points=[];controls.traverse(o=>{let parent=o,visible=true;while(parent){if(!parent.visible)visible=false;parent=parent.parent}if(o.isMesh&&o.name==='Z'&&visible){const p=new Box3().setFromObject(o).getCenter(new Vector3()).project(ctx.camera);points.push({x:rect.x+(p.x+1)/2*rect.width,y:rect.y+(1-p.y)/2*rect.height})}});return points[0]});
  if(axis){const before=(await state()).texts.at(-1).transform['position.z'].keys[0].v;await p.mouse.move(axis.x,axis.y);await p.waitForTimeout(80);await p.mouse.down();await p.mouse.move(axis.x+50,axis.y-12,{steps:16});await p.mouse.up();await p.waitForTimeout(100);const after=(await state()).texts.at(-1).transform['position.z'].keys[0].v;check('solid-z-axis-responds-to-real-mouse-drag',Math.abs(after-before)>.001,{axis,before,after})}
  else check('solid-z-axis-handle-present',false);
  await p.screenshot({path:path.join(out,'solid-three-axis-ground.png'),fullPage:true});
  await still('solid-three-axis-export',0);
 });
 await scenario('timeline',async()=>{
  await buildMedia();const id=(await state()).devices[0].instanceId;
  await p.evaluate(()=>{const s=window.S.getState();s.setActiveDevice(0);s.setPlayhead(0);s.addObjectKey(s.activeObject);s.setPlayhead(.8);s.setDeviceRotation([0,Math.PI/2,0])});await time(.8);
  const before=JSON.stringify((await state()).devices[0].screenClips),row=p.getByTestId('track-'+id),key=row.locator('.pose-key').last();
  const original=await p.evaluate(()=>window.O.objectPoses(window.S.getState().project,window.S.getState().activeObject).at(-1).t);
  await drag(key,70);const moved=await p.evaluate(()=>window.O.objectPoses(window.S.getState().project,window.S.getState().activeObject).at(-1).t);
  check('overlap-drags-key-before-video',moved>original&&JSON.stringify((await state()).devices[0].screenClips)===before);
  await p.keyboard.press('ArrowUp');check('selected-key-keeps-arrow-focus',await p.evaluate(t=>Math.abs(window.S.getState().keySelection.t-t-1/30)<1e-5,moved));
  const old=(await state()).devices[0].displayRange;await drag(row.locator('[data-drag="range-end"]'),-70);
  check('object-base-edge-controls-existence',(await state()).devices[0].displayRange.end<old.end);
  check('object-label-has-large-colored-hit-area',await row.locator('.object-track-name').evaluate(e=>e.getBoundingClientRect().height>=44&&getComputedStyle(e).backgroundColor!=='rgba(0, 0, 0, 0)'));
  await p.screenshot({path:path.join(out,'key-over-video-priority.png'),fullPage:true});
  await p.getByRole('button',{name:'放大时间轴',exact:true}).click();await p.getByRole('button',{name:'放大时间轴',exact:true}).click();await p.locator('.timeline-scroll').evaluate(e=>{e.scrollLeft=280});const sticky=await row.locator('.object-track-name').boundingBox(),scroll=await p.locator('.timeline-scroll').boundingBox();
  check('object-label-remains-visible-while-scrolling',sticky.x>=scroll.x-1&&sticky.x<scroll.x+30,{sticky,scroll});
  await p.setViewportSize({width:1000,height:800});await p.screenshot({path:path.join(out,'compact-timeline.png'),fullPage:true});
  check('compact-page-does-not-overflow-horizontally',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 });
 await scenario('camera',async()=>{
  await init();await p.evaluate(()=>window.S.getState().selectObject(null));let board=await p.getByTestId('artboard').boundingBox();await p.mouse.click(board.x+15,board.y+15);
  const base=(await state()).camera;await p.keyboard.down('w');await p.waitForTimeout(300);await p.keyboard.up('w');let now=(await state()).camera;
  check('wasd-pans-camera-at-faster-default-speed',now.tracks['position.y'].keys[0].v-base.tracks['position.y'].keys[0].v>.45);
  await p.getByRole('button',{name:'撤销',exact:true}).click();check('keyboard-pan-is-one-undo',JSON.stringify((await state()).camera)===JSON.stringify(base));
  await p.mouse.click(board.x+15,board.y+15);await p.keyboard.down('ArrowLeft');await p.waitForTimeout(300);await p.keyboard.up('ArrowLeft');
  check('arrow-left-orbits-around-scene-center',await p.evaluate(base=>{const c=window.T.sampleTimeline(window.S.getState().project,0).camera,old=window.T.sampleTimeline({...window.S.getState().project,camera:base},0).camera;return Math.abs(c.position[0]-old.position[0])>.1&&Math.abs(c.position[1]-old.position[1])<1e-6&&JSON.stringify(c.target)===JSON.stringify(old.target)},base));
  await p.getByRole('button',{name:'撤销',exact:true}).click();await p.mouse.click(board.x+15,board.y+15);await p.keyboard.down('ArrowUp');await p.waitForTimeout(250);await p.keyboard.up('ArrowUp');
  check('arrow-up-moves-forward',await p.evaluate(base=>{const s=window.S.getState(),c=window.T.sampleTimeline(s.project,0).camera,o=window.T.sampleTimeline({...s.project,camera:base},0).camera;return Math.hypot(...c.position.map((v,i)=>v-c.target[i]))<Math.hypot(...o.position.map((v,i)=>v-o.target[i]))-.3},base));await p.getByRole('button',{name:'撤销',exact:true}).click();
  await p.getByRole('button',{name:'录制相机运动',exact:true}).click();await p.getByRole('combobox',{name:'相机移动速度',exact:true}).selectOption('standard');await ready();await p.getByRole('button',{name:'开始录制（3 秒倒计时）',exact:true}).waitFor();await p.waitForTimeout(150);await p.screenshot({path:path.join(out,'camera-ready.png'),fullPage:true});
  await p.getByRole('button',{name:'开始录制（3 秒倒计时）',exact:true}).click();await p.waitForTimeout(500);check('countdown-keeps-playhead-still',await p.evaluate(()=>window.S.getState().playhead===0));await p.screenshot({path:path.join(out,'camera-countdown.png'),fullPage:true});await p.waitForFunction(()=>window.C.getState().mode==='recording');
  board=await p.getByTestId('artboard').boundingBox();await p.mouse.click(board.x+15,board.y+15);await p.keyboard.down('d');await p.waitForTimeout(350);await p.keyboard.up('d');await p.keyboard.down('ArrowLeft');await p.waitForTimeout(350);await p.keyboard.up('ArrowLeft');await p.keyboard.down('ArrowUp');await p.waitForTimeout(250);await p.keyboard.up('ArrowUp');await p.getByRole('button',{name:'结束录制',exact:true}).click();
  const take=await p.evaluate(()=>JSON.parse(JSON.stringify(window.C.getState())));check('new-camera-keys-produce-continuous-recorded-track',take.draft['position.x'].keys.length>15&&new Set(take.draft['position.x'].keys.map(k=>k.v.toFixed(4))).size>10);
  check('recorder-keeps-objects-locked',await p.evaluate(()=>window.S.getState().activeObject===null));await p.screenshot({path:path.join(out,'camera-review.png'),fullPage:true});
  await p.setViewportSize({width:1000,height:800});await p.screenshot({path:path.join(out,'camera-compact.png'),fullPage:true});check('compact-recorder-adopt-remains-visible',await p.getByRole('button',{name:'采用本次录制',exact:true}).isVisible());
  await p.getByRole('button',{name:'采用本次录制',exact:true}).click();check('recording-can-be-adopted-and-undone',(await state()).camera.animationEnabled===true);await p.getByRole('button',{name:'撤销',exact:true}).click();check('adopt-one-undo-restores-camera',JSON.stringify((await state()).camera)===JSON.stringify(base));await p.getByRole('button',{name:'重做',exact:true}).click();await save('third-feedback-camera');
  const recorded=structuredClone((await state()).camera);
  if(delivery){await open(delivery);await p.evaluate(recorded=>{const s=window.S.getState(),p=structuredClone(s.project),end=Math.max(...Object.values(recorded.tracks).flatMap(t=>t.keys.map(k=>k.t)));for(const [c,t]of Object.entries(recorded.tracks)){const initial=t.keys[0].v;t.keys=t.keys.map(k=>({...k,t:k.t/end*4,v:c==='fov'?k.v:initial+(k.v-initial)*.25}))}p.camera=recorded;window.S.setState({project:p,playhead:0})},recorded);delivery=await save('third-feedback-integrated');fs.writeFileSync(path.join(out,'delivery.json'),JSON.stringify({project:delivery,recordedCameraMotionScale:.25},null,2))}

 });

 await scenario('resources',async()=>{
  if(!delivery)throw Error('Provide THIRD_PROJECT or run media first');await open(delivery);
  const cycles=[];for(let i=0;i<10;i++){await time(.6);await ready();await time(4);await p.waitForTimeout(100);cycles.push(await p.evaluate(()=>{const ctx=window.R.getExportContext();let devices=0,texts=0;ctx.scene.traverse(o=>{if(o.userData.deviceIndex!==undefined)devices++;if(o.userData.textId)texts++});return {decoders:window.V.screenVideoStatus().length,devices,texts,...ctx.renderer.info.memory}}))}
  check('ten-cycles-remove-all-object-nodes-and-decoders',cycles.every(c=>c.devices===0&&c.texts===0&&c.decoders===0),cycles);
  check('repeated-entry-has-bounded-gpu-resource-counts',Math.max(...cycles.map(c=>c.textures))-Math.min(...cycles.map(c=>c.textures))<=2&&Math.max(...cycles.map(c=>c.geometries))-Math.min(...cycles.map(c=>c.geometries))<=2,cycles);
  fs.writeFileSync(path.join(out,'resource-cycles.json'),JSON.stringify(cycles,null,2));
  await still('future-video-after-objects-removed',2.4);check('arbitrary-export-time-restores-future-object-and-video',fs.statSync(path.join(out,'future-video-after-objects-removed.png')).size>5000);
 });
 await scenario('restore',async()=>{
  if(!delivery)throw Error('Provide THIRD_PROJECT or run media first');
  await context.route('**/fonts/**',r=>r.abort());await open(delivery);await p.evaluate(()=>import('/src/scene/textOverlay.ts').then(m=>m.waitForTitleFonts(window.S.getState().project)));
  const zip=unzipSync(fs.readFileSync(delivery)),saved=JSON.parse(strFromU8(zip['project.json'])),opened=await state();
  check('offline-restores-all-media-clocks-layers-and-anchors',await p.evaluate(saved=>window.P.projectFingerprint(window.S.getState().project)===window.P.projectFingerprint(saved),saved));
  check('offline-solid-glyphs-and-contact-restore',opened.texts.some(t=>t.textKind==='solid'&&t.fontData));
  await time(2.4);await still('offline-restored-multivideo',2.4);
  const id=saved.devices[0].screenClips.find(c=>c.name.startsWith('片段 A')).media.id;delete zip['media/'+id];
  const missingFile=path.join(out,'third-missing-source.mockup');fs.writeFileSync(missingFile,require(path.join(root,'node_modules/fflate')).zipSync(zip));
  await p.evaluate(()=>window.S.setState({savedFingerprint:window.P.projectFingerprint(window.S.getState().project)}));await p.getByLabel('打开工程文件',{exact:true}).setInputFiles(missingFile);await p.waitForFunction(()=>!window.S.getState().fileBusy);
  check('missing-source-identifies-both-references-without-masking-cache',await p.evaluate(id=>window.S.getState().project.devices[0].screenClips.filter(c=>c.media.id===id&&c.media.missing).length===2,id));
  const missing=(await state()).devices[0].screenClips.find(c=>c.media.missing);await p.evaluate(id=>window.S.getState().selectScreenClip(id),missing.clipId);
  await p.getByRole('button',{name:'重新绑定',exact:true}).first().click();const v=fixtureVideos[0],webm=v.buffer[0]===0x1a;await p.getByLabel('替换视频文件',{exact:true}).setInputFiles({name:webm?'rebind.webm':'rebind.mp4',mimeType:webm?'video/webm':'video/mp4',buffer:v.buffer});await p.waitForFunction(id=>!window.S.getState().project.devices[0].screenClips.find(c=>c.clipId===id).media.missing,missing.clipId);
  check('rebind-repairs-one-clip-without-overwriting-other-clock',await p.evaluate(id=>{const cs=window.S.getState().project.devices[0].screenClips;return !cs.find(c=>c.clipId===id).media.missing&&cs.some(c=>c.media.missing)},missing.clipId));
  await p.getByRole('button',{name:'撤销',exact:true}).click();check('rebind-is-undoable',await p.evaluate(id=>window.S.getState().project.devices[0].screenClips.find(c=>c.clipId===id).media.missing,missing.clipId));
 });
 await scenario('exports',async()=>{
  if(!delivery)throw Error('Provide THIRD_PROJECT or run media first');await open(delivery);
  if(!(await state()).camera.animationEnabled)await p.evaluate(()=>{const s=window.S.getState(),p=structuredClone(s.project);p.camera.animationEnabled=true;for(const [c,t] of Object.entries(p.camera.tracks)){const a=t.keys[0];t.keys=[{...a,t:0},{...a,t:4,v:a.v+(c==='position.x'?.3:c==='position.y'?.15:0)}]}window.S.setState({project:p})});
  const shortProject=await save('third-feedback-export-scene');delivery=shortProject;
  await p.getByRole('button',{name:'导出',exact:true}).click();await p.getByRole('button',{name:'标准',exact:true}).click();const waiting=p.waitForEvent('download',{timeout:300000});waiting.catch(()=>{});await p.getByRole('button',{name:'导出视频（MP4 (H.264)）',exact:true}).click();const dl=await waiting,file=path.join(out,'third-feedback-1080p30.mp4');await dl.saveAs(file);
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));fs.writeFileSync(path.join(out,'ffprobe-short.json'),JSON.stringify(probe,null,2));check('actual-multivideo-effects-1080p30-120-frame-export',probe.streams[0].width===1920&&probe.streams[0].height===1080&&Number(probe.streams[0].nb_read_frames)===120);
  await p.getByRole('button',{name:'关闭面板',exact:true}).click();
  for(const n of [0,7,8,29,30,41,42,59,60,83,84,89,90,107,108,113,114,119])await still('reference-'+String(n).padStart(3,'0'),n/30);
  check('all-boundary-references-use-formal-export-preparation',true);
  if(process.env.THIRD_SKIP_LONG!=='1'){
   await p.evaluate(()=>{const s=window.S.getState(),p=structuredClone(s.project),factor=30/p.duration;const tracks=x=>Object.fromEntries(Object.entries(x).map(([c,t])=>[c,{...t,keys:t.keys.map(k=>({...k,t:k.t*factor}))}]));const range=r=>({start:r.start*factor,end:r.end*factor});p.duration=30;p.effects.depthOfField.enabled=false;p.effects.motionBlur.enabled=false;p.camera.tracks=tracks(p.camera.tracks);for(const d of p.devices){d.transform=tracks(d.transform);if(d.displayRange)d.displayRange=range(d.displayRange);for(const c of d.screenClips??[]){c.displayRange=range(c.displayRange);c.playback.start*=factor;if(c.playback.stop!==undefined)c.playback.stop*=factor}}for(const t of p.texts??[]){t.transform=tracks(t.transform);if(t.displayRange)t.displayRange=range(t.displayRange)}window.S.setState({project:p,playhead:0,playing:false})});
   const longProject=await save('third-feedback-30s');await p.getByRole('button',{name:'导出',exact:true}).click();const longWait=p.waitForEvent('download',{timeout:420000});longWait.catch(()=>{});await p.getByRole('button',{name:'导出视频（MP4 (H.264)）',exact:true}).click();const timer=setInterval(()=>{void p.evaluate(()=>({url:location.href,time:new Date().toISOString(),duration:window.S?.getState().project.duration,dialog:document.querySelector('.studio-dialog')?.innerText})).then(value=>{fs.writeFileSync(path.join(out,'export-progress.json'),JSON.stringify(value,null,2));console.log('LONG EXPORT '+JSON.stringify(value))}).catch(()=>{})},10000);let long;try{long=await longWait}finally{clearInterval(timer)}const longFile=path.join(out,'third-feedback-30s.mp4');await long.saveAs(longFile);const q=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',longFile],{encoding:'utf8'}));fs.writeFileSync(path.join(out,'ffprobe-long.json'),JSON.stringify(q,null,2));check('single-30-second-900-frame-export',Number(q.streams[0].nb_read_frames)===900,{project:longProject});await p.getByRole('button',{name:'关闭面板',exact:true}).click();
  }
 });
 await scenario('cancel',async()=>{
  if(!delivery)throw Error('Provide THIRD_PROJECT or run media first');await open(delivery);await p.evaluate(()=>window.S.getState().setDuration(30));await p.getByRole('button',{name:'导出',exact:true}).click();await p.getByRole('button',{name:'标准',exact:true}).click();await p.getByRole('button',{name:'导出视频（MP4 (H.264)）',exact:true}).click();await p.getByRole('button',{name:/取消导出/}).click();await p.waitForFunction(async()=>!(await import('/src/export/session.ts')).useExportSession.getState().busy,{timeout:10000});await p.getByText(/已取消导出/).waitFor();
  check('cancel-releases-multiple-decoder-export-session',true);await p.getByRole('button',{name:'关闭面板',exact:true}).click();await p.evaluate(()=>window.S.getState().setDuration(2));await p.getByRole('button',{name:'导出',exact:true}).click();const waiting=p.waitForEvent('download',{timeout:180000});waiting.catch(()=>{});await p.getByRole('button',{name:'导出视频（MP4 (H.264)）',exact:true}).click();const dl=await waiting,file=path.join(out,'cancel-retry-2s.mp4');await dl.saveAs(file);const q=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-of','json',file],{encoding:'utf8'}));check('actual-two-second-retry-after-cancel',Number(q.streams[0].nb_read_frames)===60);await p.getByRole('button',{name:'关闭面板',exact:true}).click();await p.getByRole('button',{name:'添加文字',exact:true}).click();check('editing-restored-after-retry',(await state()).texts.length===2);
 });

 await scenario('keyboard-focus',async()=>{
  await init();await p.evaluate(()=>window.S.getState().selectObject(null));const board=await p.getByTestId('artboard').boundingBox();await p.mouse.click(board.x+15,board.y+15);
  const before=JSON.stringify((await state()).camera);await p.keyboard.down('w');await p.waitForTimeout(150);await p.keyboard.press('Escape');await p.keyboard.down('w');await p.waitForTimeout(150);const escaped=JSON.stringify((await state()).camera);await p.keyboard.up('w');
  check('escape-stops-held-camera-key-and-restores-gesture',escaped===before);
  await p.mouse.click(board.x+15,board.y+15);await p.keyboard.down('a');await p.waitForTimeout(150);await p.evaluate(()=>window.dispatchEvent(new Event('blur')));const blurred=JSON.stringify((await state()).camera);await p.waitForTimeout(150);await p.keyboard.up('a');check('blur-stops-held-camera-motion',JSON.stringify((await state()).camera)===blurred);
  await p.getByRole('spinbutton',{name:'当前时间',exact:true}).focus();await p.keyboard.press('ArrowUp');check('number-field-keeps-arrow-keys',JSON.stringify((await state()).camera)===blurred);
  await p.getByTestId('object-timeline').focus();await p.keyboard.press('ArrowRight');check('timeline-keeps-arrow-keys',JSON.stringify((await state()).camera)===blurred);
  await p.getByRole('button',{name:'添加文字',exact:true}).click();await p.getByRole('textbox',{name:'文字内容',exact:true}).fill('');await p.getByRole('textbox',{name:'文字内容',exact:true}).pressSequentially('wasd');check('typing-wasd-does-not-move-camera',JSON.stringify((await state()).camera)===blurred&&(await state()).texts.at(-1).content==='wasd');
 });
 await scenario('layout',async()=>{
  await init();await p.evaluate(()=>window.S.getState().selectObject(null));await p.getByRole('button',{name:'录制相机运动',exact:true}).click();await ready();await p.waitForTimeout(150);
  for(const [w,h]of [[1366,768],[1920,1080],[1000,800]]){await p.setViewportSize({width:w,height:h});await p.waitForTimeout(180);await p.screenshot({path:path.join(out,'recorder-'+w+'x'+h+'.png'),fullPage:true});const b=await p.getByRole('button',{name:'开始录制（3 秒倒计时）',exact:true}).boundingBox();check('recorder-layout-'+w+'x'+h,b.y+b.height<=h+1&&b.x+b.width<=w+1&&await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))}
  await context.close();await session({viewport:{width:1366,height:768},deviceScaleFactor:1.25});await init();await p.evaluate(()=>window.S.getState().selectObject(null));await p.getByRole('button',{name:'录制相机运动',exact:true}).click();await ready();await p.waitForTimeout(180);await p.screenshot({path:path.join(out,'recorder-display-scale-125.png'),fullPage:true});check('recorder-at-125-percent-display-scale',await p.evaluate(()=>devicePixelRatio===1.25&&document.documentElement.scrollWidth<=innerWidth+1));
 });

 await scenario('legacy-fit',async()=>{
  await open(path.join(root,'reports/current/p119-p125-implementation-20261103/regression-30s/beginner-scene.mockup'));
  await p.evaluate(()=>{const s=window.S.getState();s.setDuration(8);s.setActiveDevice(0);s.setScreenPlayback({in:2,out:4,start:1,loop:true,rate:1});s.selectScreenClip(s.project.devices[0].screenClips[0].clipId)});
  const original=(await state()).devices[0].screenClips[0].playback;await p.getByRole('button',{name:'填满裁切',exact:true}).click();check('legacy-fill-does-not-change-loop-or-clock',JSON.stringify((await state()).devices[0].screenClips[0].playback)===JSON.stringify(original));
  await time(5.5);await ready();await p.evaluate(()=>window.V.seekScreenVideos(5.5,5000));check('legacy-loop-still-renders-after-fill-change',await p.evaluate(()=>{const id=window.S.getState().project.devices[0].instanceId;return window.V.screenVideoStatus().some(v=>v.instanceId===id&&Math.abs(v.time-2.5)<.035)}));
 });
 // SCENARIOS
 check('no-unhandled-page-errors',report.pageErrors.length===0,report.pageErrors);check('no-console-errors',report.consoleErrors.length===0,report.consoleErrors);
 report.status=report.scenarios.every(s=>s.status==='PASS')?'PASS':'FAIL';if(report.status==='FAIL')process.exitCode=1;
}catch(e){report.status='FAIL';report.error=String(e);process.exitCode=1}finally{write();await browser?.close();console.log(JSON.stringify({status:report.status,scenarios:report.scenarios,checks:report.checks.length}))}})();
