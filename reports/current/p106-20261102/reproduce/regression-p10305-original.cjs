const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root="C:\\Users\\20153\\AppData\\Local\\Temp\\p106-20261102-5ipog_47\\project",out=path.resolve(process.env.P10305_AUDIT_ROOT||path.join(root,'output','p103-p105-'+new Date().toISOString().replace(/[:.]/g,'-')));
const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH||path.join(root,'.venv','Lib','site-packages','playwright','driver','package'));
const {unzipSync,strFromU8,zipSync,strToU8}=require(path.join(root,'node_modules/fflate'));
const THREE=require(path.join(root,'node_modules/three'));
const dist=path.join(root,'dist');fs.mkdirSync(out,{recursive:true});
const report={date:new Date().toISOString(),method:'Actual P1-03/04/05 production build; Chrome; local route fulfillment without TCP. UI actions and actual file downloads. Vite/API network not tested.',checks:[],cases:[],pageErrors:[],requestFailures:[],status:'RUNNING'};
const write=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
function check(id,pass,details={}){report.checks.push({id,status:pass?'PASS':'FAIL',...details});write();console.log((pass?'PASS ':'FAIL ')+id);}
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const transform=p=>p.locator('.field-header').filter({hasText:'Transform'}).locator('..');
async function setNumber(p,index,value){const box=transform(p).locator('.numfield-box').nth(index);await box.click();const input=box.locator('input');await input.fill(String(value));await input.press('Enter');}
async function save(p,name){const pending=p.waitForEvent('download',{timeout:25000});await p.getByTitle(/^Save \.mockup/).click();const dl=await pending,file=path.join(out,name+'.mockup');await dl.saveAs(file);const entries=unzipSync(fs.readFileSync(file));return {file,entries,project:JSON.parse(strFromU8(entries['project.json']))};}
async function preview(p,frame,name){const data=await p.evaluate(i=>window.__PROMO_BRIDGE__.previewFrame(i,'standard'),frame);const file=path.join(out,name+'.png');fs.writeFileSync(file,Buffer.from(data.split(',')[1],'base64'));return file;}
async function ready(p){return await p.evaluate(()=>window.__PROMO_BRIDGE__.waitForReady());}
async function openFixture(p,project,name){const file=path.join(out,name+'.mockup');fs.writeFileSync(file,zipSync({'project.json':strToU8(JSON.stringify(project))}));await p.locator('.topbar input[type=file]').setInputFiles(file);await ready(p);}
async function session(browser,label){
 const context=await browser.newContext({viewport:{width:1440,height:960},acceptDownloads:true});
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.hdr':'application/octet-stream','.glb':'model/gltf-binary','.svg':'image/svg+xml'};
 await context.route('**/*',async route=>{
  try{const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1')return await route.abort();
   const rel=decodeURIComponent(url.pathname).replace(/^\/+/,'')||'index.html',file=path.resolve(dist,rel);
   if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)){report.requestFailures.push({label,rel});return await route.fulfill({status:404,body:'Not found'});}
   await route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  }catch(error){report.requestFailures.push({label,error:String(error)});await route.abort().catch(()=>{});}
 });
 const page=await context.newPage();page.on('dialog',d=>d.accept());page.setDefaultTimeout(20000);page.on('pageerror',error=>{report.pageErrors.push({label,error:String(error)});write();});
 await page.goto('http://127.0.0.1:4187/?automation=1',{waitUntil:'networkidle',timeout:45000});
 await page.getByRole('button',{name:'Movie',exact:true}).click();await ready(page);return {context,page};
}
async function run(browser,label,fn){let context,page;const started=Date.now();console.log('START '+label);try{({context,page}=await session(browser,label));await fn(page,context);report.cases.push({label,status:'COMPLETED',seconds:(Date.now()-started)/1000});}catch(error){check(label,false,{execution:'INCOMPLETE',error:String(error),stack:error.stack});report.cases.push({label,status:'INCOMPLETE'});}finally{await context?.close().catch(()=>{});write();}}
const position=d=>['x','y','z'].map(a=>d.transform['position.'+a]?.keys[0]?.v??0);
const activeIndex=async p=>{const el=p.locator('.device-row.active .device-row-index');return await el.count()?Number(await el.innerText())-1:0;};

let base,authored,dual;
const near=(a,b,e=1e-4)=>Math.abs(a-b)<e;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
async function time(p,t){await p.getByLabel('Playhead time',{exact:true}).fill(String(t));await p.getByLabel('Playhead time',{exact:true}).press('Tab');}
async function channel(p,c,scope='device'){await p.getByLabel('Track target',{exact:true}).selectOption(scope);await p.getByLabel('Animation channel',{exact:true}).selectOption(c);}
async function commit(p,label,v){const field=p.getByLabel(label,{exact:true});await field.fill(String(v));await field.press('Tab');}
async function keyValue(p,v){await commit(p,'Keyframe value',v);}
async function keyAt(p,c,t,scope='Device'){const button=p.getByRole('button',{name:scope+' '+c+' keyframe '+t+'s',exact:true});await button.click();}
async function undo(p){await p.getByTitle(/^Undo \(/).click();}
async function redo(p){await p.getByTitle(/^Redo \(/).click();}
function two(p){
 const x=structuredClone(p);x.name='P1-03-05 verification';x.duration=2;x.camera.preset='front';
 ['x','y','z'].forEach((a,i)=>x.camera.tracks['position.'+a].keys=[{t:0,v:[0,0,3.2][i],ease:[0,0,1,1]}]);
 x.devices=[structuredClone(x.devices[0]),structuredClone(x.devices[0])];
 x.devices[1].instanceId=crypto.randomUUID();
 x.devices.forEach((d,i)=>{for(const [c,v]of Object.entries({'position.x':i?0.5:-0.5,'position.y':0,'position.z':0,'rotation.x':0,'rotation.y':0,'rotation.z':0,scale:0.55}))d.transform[c]={keys:[{t:0,v,ease:[0,0,1,1]}]};});
 return x;
}
async function center(p,project,index){
 const rect=await p.locator('.artboard').boundingBox();
 const camera=new THREE.PerspectiveCamera(project.camera.fov,project.output.width/project.output.height,.01,1000);
 camera.position.set(...['x','y','z'].map(a=>project.camera.tracks['position.'+a].keys[0].v));camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 const point=new THREE.Vector3(...position(project.devices[index])).project(camera);
 return {x:rect.x+(point.x+1)*rect.width/2,y:rect.y+(1-point.y)*rect.height/2,rect};
}
async function drag(p,from,to,steps=10){await p.mouse.move(from.x,from.y);await p.mouse.down();await p.mouse.move(to.x,to.y,{steps});await p.mouse.up();}
(async()=>{let browser;try{
 browser=await chromium.launch({headless:true,downloadsPath:path.join(out,'downloads'),timeout:30000,executablePath:process.env.CHROME_PATH||(fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')?'C:/Program Files/Google/Chrome/Application/chrome.exe':'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'),args:['--no-sandbox','--enable-webgl','--use-gl=angle','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 report.browser=browser.version();
 const cases=process.env.CASES?.split(',')||['01','02','03','04','05'];
 if(cases.includes('01'))await run(browser,'01-manual-keyframes',async p=>{
   base=(await save(p,'01-base')).project;
   await p.getByLabel('Project duration',{exact:true}).fill('2');await time(p,0);
   await setNumber(p,6,.65);
   await channel(p,'position.x');await p.getByRole('button',{name:'Add keyframe',exact:true}).click();await keyValue(p,-1.2);
   await time(p,.5);await p.getByRole('button',{name:'Add keyframe',exact:true}).click();await keyValue(p,0);
   await time(p,1.5);await p.getByRole('button',{name:'Add keyframe',exact:true}).click();await keyValue(p,0);
   await keyAt(p,'position.x',2);await keyValue(p,1.2);
   const added=(await save(p,'01-entry-hold-exit')).project;
   check('manual-entry-hold-exit-keys',same(added.devices[0].transform['position.x'].keys.map(k=>[k.t,k.v]),[[0,-1.2],[.5,0],[1.5,0],[2,1.2]]));
   await channel(p,'rotation.y');await time(p,0);await p.getByRole('button',{name:'Add keyframe',exact:true}).click();
   await p.getByLabel('Keyframe easing',{exact:true}).selectOption('linear');await keyAt(p,'rotation.y',2);await keyValue(p,720);
   const rotation=(await save(p,'01-720')).project;
   check('manual-720-degree-euler-rotation',near(rotation.devices[0].transform['rotation.y'].keys.at(-1).v,4*Math.PI));
   await channel(p,'position.x');await keyAt(p,'position.x',.5);
   const diamond=p.getByRole('button',{name:'Device position.x keyframe 0.5s',exact:true});
   const box=await diamond.boundingBox(),lane=await diamond.locator('..').boundingBox();
   await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();
   await p.mouse.move(box.x+box.width/2+lane.width*.15,box.y+box.height/2,{steps:4});
   await p.waitForTimeout(650);await p.mouse.move(box.x+box.width/2+lane.width*.1,box.y+box.height/2,{steps:4});await p.mouse.up();
   const dragged=(await save(p,'01-dragged')).project;
   check('keyframe-real-pointer-drag-retimes',dragged.devices[0].transform['position.x'].keys.some(k=>near(k.t,.7)));
   await undo(p);check('long-drag-single-undo',(await save(p,'01-undone')).project.devices[0].transform['position.x'].keys.some(k=>near(k.t,.5)));
   await redo(p);check('drag-redo-restores-retiming',(await save(p,'01-redone')).project.devices[0].transform['position.x'].keys.some(k=>near(k.t,.7)));
   await keyAt(p,'position.x',1.5);await p.keyboard.press('Delete');
   check('keyframe-keyboard-delete',!(await save(p,'01-deleted')).project.devices[0].transform['position.x'].keys.some(k=>near(k.t,1.5)));
   await undo(p);await keyAt(p,'position.x',.7);await p.getByLabel('Keyframe easing',{exact:true}).selectOption('ease-out');
   check('keyframe-easing-is-written',same((await save(p,'01-easing')).project.devices[0].transform['position.x'].keys.find(k=>near(k.t,.7)).ease,[0,0,.58,1]));
   await channel(p,'fov','camera');await time(p,1);await p.getByRole('button',{name:'Add keyframe',exact:true}).click();await keyValue(p,35);
   authored=await save(p,'01-manually-authored');
   check('camera-channel-edit-keeps-device-animation',authored.project.camera.tracks.fov.keys.some(k=>k.t===1&&k.v===35)&&same(authored.project.devices[0].transform['rotation.y'],rotation.devices[0].transform['rotation.y']));
   await preview(p,15,'01-manual-frame');
 });
 if(!base){let x=await session(browser,'bootstrap');base=(await save(x.page,'bootstrap-base')).project;await x.context.close();}
 if(cases.includes('02'))await run(browser,'02-canvas-selection-and-transform',async p=>{
   const fixture=two(base);await openFixture(p,fixture,'02-fixture');
   await p.getByRole('button',{name:'Select device',exact:true}).click();
   let pos=await center(p,fixture,1);await p.mouse.click(pos.x,pos.y);
   check('canvas-pick-selects-second-instance',await activeIndex(p)===1);
   pos=await center(p,fixture,0);await p.mouse.click(pos.x,pos.y);
   check('canvas-pick-synchronizes-list-and-inspector',await activeIndex(p)===0&&near(Number(await transform(p).locator('.numfield-value').nth(0).innerText()),-.5,.02));
   await p.getByRole('button',{name:'Move device',exact:true}).click();await p.waitForTimeout(250);
   const before=(await save(p,'02-before-move')).project;
   let moved=false,used;
   for(const offset of [32,45,20,60,12]){
     const origin=await center(p,before,0);const from={x:origin.x+offset,y:origin.y},to={x:origin.x+offset+45,y:origin.y};
     await drag(p,from,to);
     const after=(await save(p,'02-move-probe-'+offset)).project;
     if(!same(after.devices[0].transform,before.devices[0].transform)){moved=true;used={offset,from,to};break;}
   }
   const after=(await save(p,'02-after-move')).project;
   check('canvas-move-real-handle-targets-only-selected-device',moved&&same(after.devices[1],before.devices[1])&&same(after.camera,before.camera),{used});
   check('canvas-move-syncs-numeric-fields',near(Number(await transform(p).locator('.numfield-value').nth(0).innerText()),after.devices[0].transform['position.x'].keys[0].v,.02));
   if(moved){await undo(p);check('canvas-drag-single-undo',same((await save(p,'02-move-undone')).project,before));await redo(p);}
   await openFixture(p,fixture,'02-rotate-fixture');await p.getByRole('button',{name:'Rotate device',exact:true}).click();await p.waitForTimeout(250);
   const rotBefore=(await save(p,'02-before-rotate')).project;
   let rotated=false,rotateUsed;
   for(const radius of [52,42,65,32,80,22]){
     const origin=await center(p,fixture,0);const from={x:origin.x+radius,y:origin.y},to={x:origin.x+radius*.7,y:origin.y-radius*.7};
     await drag(p,from,to,12);const after=(await save(p,'02-rotate-probe-'+radius)).project;
     if(!same(after.devices[0].transform,rotBefore.devices[0].transform)){rotated=true;rotateUsed={radius};break;}
   }
   const rotAfter=(await save(p,'02-after-rotate')).project;
   check('canvas-rotate-real-handle',rotated&&same(rotAfter.devices[1],rotBefore.devices[1]),{rotateUsed});
   await openFixture(p,fixture,'02-scale-fixture');await p.getByRole('button',{name:'Scale device',exact:true}).click();await p.waitForTimeout(250);
   let scaled=false,scaleUsed;
   for(const offset of [32,45,20,60,12]){
     const origin=await center(p,fixture,0);await drag(p,{x:origin.x+offset,y:origin.y},{x:origin.x+offset+30,y:origin.y},12);
     const after=(await save(p,'02-scale-probe-'+offset)).project;
     if(!near(after.devices[0].transform.scale.keys[0].v,.55)){scaled=true;scaleUsed={offset};break;}
   }
   const scaleAfter=(await save(p,'02-after-scale')).project;
   check('canvas-scale-real-handle-uniform-document-scale',scaled&&same(scaleAfter.devices[1],fixture.devices[1])&&Number.isFinite(scaleAfter.devices[0].transform.scale.keys[0].v),{scaleUsed});
   await openFixture(p,fixture,'02-cancel-fixture');await p.getByRole('button',{name:'Move device',exact:true}).click();await p.waitForTimeout(200);
   const origin=await center(p,fixture,0),off=used?.offset||32;
   await p.mouse.move(origin.x+off,origin.y);await p.mouse.down();await p.mouse.move(origin.x+off+35,origin.y,{steps:10});await p.keyboard.press('Escape');await p.mouse.up();
   check('escape-cancels-device-gesture',same((await save(p,'02-cancelled')).project,fixture));
   const animated=two(base);animated.devices[0].transform['position.x'].keys.push({t:2,v:-.5,ease:[0,0,1,1]});
   await openFixture(p,animated,'02-animated-fixture');await time(p,1);
   await p.getByRole('button',{name:'Move device',exact:true}).click();await p.waitForTimeout(200);
   const animatedOrigin=await center(p,animated,0);
   await drag(p,{x:animatedOrigin.x+off,y:animatedOrigin.y},{x:animatedOrigin.x+off+30,y:animatedOrigin.y},12);
   const animatedAfter=(await save(p,'02-animated-moved')).project;
   check('canvas-transform-at-playhead-adds-key-without-changing-endpoints',
     animatedAfter.devices[0].transform['position.x'].keys.some(k=>near(k.t,1)&&!near(k.v,-.5))
     &&same(animatedAfter.devices[0].transform['position.x'].keys.filter(k=>k.t!==1),animated.devices[0].transform['position.x'].keys)
     &&same(animatedAfter.devices[1],animated.devices[1]));
   await undo(p);check('animated-canvas-edit-single-undo',same((await save(p,'02-animated-undone')).project,animated));
   const field=transform(p).locator('.numfield-box').nth(1);await field.scrollIntoViewIfNeeded();const fieldBox=await field.boundingBox();
   await p.mouse.move(fieldBox.x+fieldBox.width/2,fieldBox.y+fieldBox.height/2);await p.mouse.down();
   await p.mouse.move(fieldBox.x+fieldBox.width/2+20,fieldBox.y+fieldBox.height/2,{steps:4});
   await p.waitForTimeout(650);await p.mouse.move(fieldBox.x+fieldBox.width/2+30,fieldBox.y+fieldBox.height/2,{steps:4});await p.mouse.up();
   const fieldAfter=(await save(p,'02-number-drag')).project;
   check('number-field-drag-writes-pose',!same(fieldAfter,animated));
   await undo(p);check('long-number-field-drag-single-undo',same((await save(p,'02-number-undone')).project,animated));

   await openFixture(p,fixture,'02-overlay-fixture');
   await p.getByRole('button',{name:'Move device',exact:true}).click();
   await preview(p,0,'02-gizmo-reference');const gizmo=fs.readFileSync(await preview(p,0,'02-gizmo-clean'));
   await p.getByRole('button',{name:'Orbit camera',exact:true}).click();const orbit=fs.readFileSync(await preview(p,0,'02-orbit-clean'));
   check('export-excludes-gizmo-and-selection-outline',hash(gizmo)===hash(orbit));
   const orbitBefore=(await save(p,'02-before-camera')).project,rect=await p.locator('.artboard').boundingBox();
   await drag(p,{x:rect.x+rect.width*.85,y:rect.y+rect.height*.2},{x:rect.x+rect.width*.7,y:rect.y+rect.height*.3},15);
   const orbitAfter=(await save(p,'02-after-camera')).project;
   check('orbit-tool-moves-camera-only',!same(orbitAfter.camera,orbitBefore.camera)&&same(orbitAfter.devices,orbitBefore.devices));
   await undo(p);check('camera-gesture-single-undo',same((await save(p,'02-camera-undone')).project,orbitBefore));
 });
 if(cases.includes('03'))await run(browser,'03-independent-presets-and-media',async p=>{
   await openFixture(p,two(base),'03-fixture');
   await p.locator('.device-open').click();await p.getByRole('button',{name:'iPhone 17 Pro',exact:true}).click();await ready(p);
   await p.locator('.device-row').nth(1).locator('.device-row-name').click();
   await p.locator('.device-open').click();await p.getByRole('button',{name:'Google Pixel 9 Pro XL',exact:true}).click();await ready(p);
   const realModels=(await save(p,'03-real-models')).project;
   await p.getByRole('button',{name:'Select device',exact:true}).click();
   const glbPoint=await center(p,realModels,0);await p.mouse.click(glbPoint.x,glbPoint.y);
   check('canvas-pick-real-GLB',await activeIndex(p)===0);

   await p.locator('.device-row').nth(1).locator('.device-row-name').click();
   const before=(await save(p,'03-before-preset')).project;
   await commit(p,'Preset start',.5);await commit(p,'Preset duration',1);
   await p.getByLabel('Add animation',{exact:true}).selectOption('spin-y-360');
   const spun=(await save(p,'03-second-spun')).project;
   check('MAN-005-preset-only-selected-instance',same(spun.devices[0],before.devices[0])&&spun.devices[1].transform['rotation.y'].keys.some(k=>near(k.t,1.5)&&near(k.v,2*Math.PI)));
   check('preset-protects-unrelated-channels',same(spun.devices[1].transform['position.x'],before.devices[1].transform['position.x'])&&same(spun.camera,before.camera));
   await p.locator('.device-row').nth(0).locator('.device-row-name').click();await commit(p,'Preset start',0);await commit(p,'Preset duration',1.5);
   await p.getByLabel('Add animation',{exact:true}).selectOption('float');
   const floated=(await save(p,'03-first-float')).project;
   check('devices-have-independent-actions-and-times',same(floated.devices[1],spun.devices[1])&&floated.devices[0].transform['position.y'].keys.length===3);
   check('timeline-owner-follows-device-selection',(await p.locator('.timeline-owner').innerText()).includes('Device 1'));
   await undo(p);check('preset-undo-is-one-operation',same((await save(p,'03-preset-undone')).project,spun));await redo(p);
   const orbitBefore=(await save(p,'03-before-orbit')).project;
   await commit(p,'Preset start',0);await commit(p,'Preset duration',2);await p.getByLabel('Add animation',{exact:true}).selectOption('orbit');
   const orbited=(await save(p,'03-orbited')).project;
   check('orbit-preset-has-camera-scope',same(orbited.devices,orbitBefore.devices)&&same(orbited.camera.tracks.fov,orbitBefore.camera.tracks.fov)&&!same(orbited.camera.tracks['position.x'],orbitBefore.camera.tracks['position.x']));
   await undo(p);
   await p.locator('.device-row').nth(0).locator('.device-row-name').click();
   await p.locator('.dropzone input[type=file]').setInputFiles(path.join(root,'assets','demo.mp4'));await p.waitForFunction(()=>document.querySelector('video.dropzone-preview')?.videoWidth>0);
   await p.locator('.device-row').nth(1).locator('.device-row-name').click();
   await p.locator('.dropzone input[type=file]').setInputFiles(process.env.P10305_SECONDARY_VIDEO||path.join(root,'reports','current','p103-p105-20261102','reproduce','secondary-recording.mp4'));await p.waitForFunction(()=>document.querySelector('video.dropzone-preview')?.videoWidth>0);
   await ready(p);dual=await save(p,'03-dual-independent-animation-media');
   check('independent-recordings-are-preserved',dual.project.devices[0].screen.id!==dual.project.devices[1].screen.id&&Object.keys(dual.entries).filter(n=>n.startsWith('media/')).length===2);
 });
 if(cases.includes('04'))await run(browser,'04-new-session-and-export',async p=>{
   if(!dual)throw new Error('03 fixture missing');
   if(authored) {
     await p.locator('.topbar input[type=file]').setInputFiles(authored.file);await ready(p);
     check('manual-animation-new-session-roundtrip',same((await save(p,'04-manual-reopened')).project,authored.project));
     report.manualReferences=[];
     for(const frame of [0,15,59]){const file=await preview(p,frame,'04-manual-reference-'+frame);report.manualReferences.push({frame,file});write();}
     await p.getByRole('button',{name:'Standard',exact:true}).click();await p.getByRole('button',{name:'30 fps',exact:true}).click();
     await p.getByRole('button',{name:'MP4 (H.264)',exact:true}).click();
     const downloading=p.waitForEvent('download',{timeout:180000});downloading.catch(()=>{});
     await p.getByRole('button',{name:'Export video (MP4 (H.264))',exact:true}).click();
     const file=path.join(out,'P1-03-manual-720-1080p30.mp4');await (await downloading).saveAs(file);
     const meta=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
     fs.writeFileSync(path.join(out,'04-manual-ffprobe.json'),JSON.stringify(meta,null,2));
     const v=meta.streams.find(s=>s.codec_type==='video');
     check('manual-animation-real-1080p30-export',v.width===1920&&v.height===1080&&v.avg_frame_rate==='30/1'&&Number(v.nb_frames)===60);
   }

   await p.locator('.topbar input[type=file]').setInputFiles(dual.file);await ready(p);
   const reopened=await save(p,'04-reopened');
   check('new-session-restores-tracks-and-media-bytes',same(reopened.project,dual.project)&&Object.keys(dual.entries).filter(n=>n.startsWith('media/')).every(n=>hash(dual.entries[n])===hash(reopened.entries[n])));
   await p.getByRole('button',{name:'Rotate device',exact:true}).click();
   report.references=[];
   for(const frame of [0,30,59]){const file=await preview(p,frame,'04-reference-'+frame);report.references.push({frame,file});write();}
   await p.getByRole('button',{name:'Standard',exact:true}).click();await p.getByRole('button',{name:'30 fps',exact:true}).click();await p.getByRole('button',{name:'MP4 (H.264)',exact:true}).click();
   const pending=p.waitForEvent('download',{timeout:180000});pending.catch(()=>{});const timer=setInterval(()=>console.log('EXPORT_IN_PROGRESS'),10000);
   try{await p.getByRole('button',{name:'Export video (MP4 (H.264))',exact:true}).click();const dl=await pending;await dl.saveAs(path.join(out,'P1-03-05-dual-animation-1080p30.mp4'));}finally{clearInterval(timer);}
   const file=path.join(out,'P1-03-05-dual-animation-1080p30.mp4');
   const meta=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));fs.writeFileSync(path.join(out,'04-ffprobe.json'),JSON.stringify(meta,null,2));
   const v=meta.streams.find(s=>s.codec_type==='video');
   check('dual-animation-dual-recording-1080p30-mp4',v.width===1920&&v.height===1080&&v.avg_frame_rate==='30/1'&&Number(v.nb_frames)===60,{width:v.width,height:v.height,fps:v.avg_frame_rate,frames:v.nb_frames,duration:meta.format.duration});
   await channel(p,'rotation.y');await time(p,1);await p.getByRole('button',{name:'Add keyframe',exact:true}).click();await keyValue(p,90);
   const changed=await save(p,'04-edited-after-export');
   check('editing-after-export-remains-usable',changed.project.devices[0].transform['rotation.y'].keys.some(k=>near(k.t,1)&&near(k.v,Math.PI/2)));
 });
 if(cases.includes('05'))await run(browser,'05-P1-02-regression',async p=>{
   await p.getByRole('button',{name:'Add a second device',exact:true}).click();await undo(p);
   check('P1-02-add-undo-no-crash',await transform(p).locator('.numfield-box').count()===7);
   await redo(p);check('P1-02-redo-valid-selection',await activeIndex(p)===0&&await transform(p).locator('.numfield-box').count()===7);
   await p.locator('.device-row').nth(1).getByTitle('Duplicate',{exact:true}).click();
   check('P1-02-duplicate-selects-copy',await activeIndex(p)===2);
   await p.locator('.device-row').nth(0).getByTitle('Remove',{exact:true}).click();
   check('P1-02-removal-selection-valid',await activeIndex(p)===1&&await transform(p).locator('.numfield-box').count()===7);
 });
 check('no-unhandled-page-errors',report.pageErrors.length===0,{pageErrors:report.pageErrors});
 check('all-local-assets-loaded',report.requestFailures.length===0,{failures:report.requestFailures});
 report.status=report.cases.some(c=>c.status==='INCOMPLETE')?'INCOMPLETE':report.checks.some(c=>c.status!=='PASS')?'FAIL':'PASS';
}catch(error){report.status='ENVIRONMENT_BLOCKED';report.error=String(error);report.stack=error.stack;}finally{await browser?.close().catch(()=>{});write();console.log(JSON.stringify({status:report.status,checks:report.checks.length,failures:report.checks.filter(c=>c.status!=='PASS')}));if(report.status!=='PASS')process.exitCode=1;}})();
