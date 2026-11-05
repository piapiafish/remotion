const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.P106_AUDIT_ROOT||path.join(root,'output','p106-'+new Date().toISOString().replace(/[:.]/g,'-')));
const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH||path.join(root,'.venv','Lib','site-packages','playwright','driver','package'));
const {unzipSync,strFromU8,zipSync,strToU8}=require(path.join(root,'node_modules/fflate'));
const dist=path.join(root,'dist'),secondary=process.env.P106_SECONDARY_VIDEO||path.join(root,'reports/current/p106-20261102/reproduce/secondary-recording.mp4');
const baseUrl=process.env.P106_BASE_URL;
fs.mkdirSync(out,{recursive:true});
const report={date:new Date().toISOString(),method:'Actual production build in Chrome, local route fulfillment; UI edits, isolated contexts, .mockup bytes and actual MP4 downloads. Vite/API TCP not tested.',checks:[],cases:[],pageErrors:[],requestFailures:[],dialogs:[],status:'RUNNING'};
if(baseUrl)report.method='Actual local Vite HTTP/TCP in Chrome without route interception; UI edits, isolated contexts, portable archives and actual MP4 downloads.';
const write=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
function check(id,pass,details={}){report.checks.push({id,status:pass?'PASS':'FAIL',...details});write();console.log((pass?'PASS ':'FAIL ')+id);}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),near=(a,b,e=.04)=>Math.abs(a-b)<e,hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function save(p,name){const pending=p.waitForEvent('download',{timeout:15000});pending.catch(()=>{});await p.getByTitle(/^Save \.mockup/).click();const dl=await pending,file=path.join(out,name+'.mockup');await dl.saveAs(file);const entries=unzipSync(fs.readFileSync(file));return {file,entries,project:JSON.parse(strFromU8(entries['project.json']))};}
async function ready(p){return p.evaluate(()=>window.__PROMO_BRIDGE__.waitForReady());}
async function open(p,file){await p.locator('.topbar input[type=file]').setInputFiles(file);await ready(p);}
function fixture(project,name,entries={}){const file=path.join(out,name+'.mockup');fs.writeFileSync(file,zipSync({...entries,'project.json':strToU8(JSON.stringify(project))}));return file;}
async function commit(p,label,value){const field=p.getByLabel(label,{exact:true});await field.fill(String(value));await field.press('Tab');}
async function time(p,t){await commit(p,'Playhead time',t);await p.waitForTimeout(180);}
async function clocks(p){return p.evaluate(()=>window.__PROMO_BRIDGE__.videoClocks());}
async function preview(p,frame,name){const data=await p.evaluate(i=>window.__PROMO_BRIDGE__.previewFrame(i,'standard'),frame);const file=path.join(out,name+'.png');fs.writeFileSync(file,Buffer.from(data.split(',')[1],'base64'));return file;}
async function upload(p,file){await p.locator('.dropzone input[type=file]').setInputFiles(file);await p.waitForFunction(()=>document.querySelector('video.dropzone-preview')?.videoWidth>0);await ready(p);}
async function select(p,index){await p.locator('.device-row').nth(index).locator('.device-row-name').click();}
async function session(browser,label){
 const context=await browser.newContext({viewport:{width:1440,height:1040},acceptDownloads:true});
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.hdr':'application/octet-stream','.glb':'model/gltf-binary','.svg':'image/svg+xml','.png':'image/png'};
 if(!baseUrl)await context.route('**/*',async route=>{try{const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();const rel=decodeURIComponent(u.pathname).replace(/^\/+/,'')||'index.html',file=path.resolve(dist,rel);if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)){report.requestFailures.push({label,rel});return route.fulfill({status:404,body:'Not found'});}await route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}catch(error){report.requestFailures.push({label,error:String(error)});await route.abort().catch(()=>{});}});
 const page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',error=>{report.pageErrors.push({label,error:String(error)});write();});
 if(baseUrl)page.on('response',response=>{if(response.status()>=400){report.requestFailures.push({label,url:response.url(),status:response.status()});write();}});
 page.on('dialog',async d=>{report.dialogs.push({label,type:d.type(),message:d.message(),accepted:page.keepUnsaved!==true});write();if(page.keepUnsaved)await d.dismiss();else await d.accept();});
 await page.goto((baseUrl||'http://127.0.0.1:4187')+'/?automation=1',{waitUntil:'networkidle',timeout:45000});await page.getByRole('button',{name:'Movie',exact:true}).click();await ready(page);return {context,page};
}
async function run(browser,label,fn){let context,page;const started=Date.now();console.log('START '+label);try{({context,page}=await session(browser,label));await fn(page,context);await page.screenshot({path:path.join(out,label+'.png'),fullPage:true});report.cases.push({label,status:'COMPLETED',seconds:(Date.now()-started)/1000});}catch(error){check(label,false,{execution:'INCOMPLETE',error:String(error),stack:error.stack});await page?.screenshot({path:path.join(out,label+'-failure.png')}).catch(()=>{});report.cases.push({label,status:'INCOMPLETE'});}finally{await context?.close().catch(()=>{});write();}}
function two(p){const x=structuredClone(p);x.name='P1-06 dual recording timing';x.duration=4;x.camera.preset='front';for(const [i,a] of ['x','y','z'].entries())x.camera.tracks['position.'+a]={keys:[{t:0,v:[0,0,3.2][i],ease:[0,0,1,1]}]};x.devices=[structuredClone(x.devices[0]),structuredClone(x.devices[0])];x.devices[1].instanceId=crypto.randomUUID();x.devices.forEach((d,i)=>{d.id=i?'pixel-9-pro-xl':'iphone-17-pro';d.colorway=i?'obsidian':'natural';d.screen=null;delete d.screenPlayback;for(const [c,v]of Object.entries({'position.x':i?.5:-.5,'position.y':0,'position.z':0,'rotation.x':0,'rotation.y':0,'rotation.z':0,scale:.55}))d.transform[c]={keys:[{t:0,v,ease:[0,0,1,1]}]};});return x;}
let base,dual;
(async()=>{let browser;try{
 browser=await chromium.launch({headless:true,downloadsPath:path.join(out,'downloads'),timeout:30000,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--enable-webgl','--use-gl=angle','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});report.browser=browser.version();
 const bootstrap=await session(browser,'bootstrap');base=(await save(bootstrap.page,'00-base')).project;await bootstrap.context.close();
 const cases=process.env.CASES?.split(',')||['01','02','03','04','05','06','07','08'];
 if(cases.includes('01'))await run(browser,'01-independent-device-clocks',async p=>{
   await open(p,fixture(two(base),'01-two'));
   await select(p,0);await upload(p,path.join(root,'assets/demo.mp4'));await commit(p,'Source in',1);await commit(p,'Source out',2.2);await commit(p,'Timeline start',.4);
   await select(p,1);await upload(p,secondary);await commit(p,'Source in',4);await commit(p,'Source out',5.3);await commit(p,'Timeline start',1.1);await p.getByLabel('Loop selected recording range',{exact:true}).check();
   const before=await save(p,'01-before-undo');
   check('per-device-trims-starts-and-loop',same(before.project.devices.map(d=>d.screenPlayback),[{in:1,out:2.2,start:.4,loop:false},{in:4,out:5.3,start:1.1,loop:true}]));
   await p.getByTitle(/^Undo \(/).click();const undone=await save(p,'01-undo');check('timing-one-step-undo-keeps-other-device',undone.project.devices[1].screenPlayback.loop===false&&same(undone.project.devices[0],before.project.devices[0]));
   await p.getByTitle(/^Redo \(/).click();const redone=await save(p,'01-redo');check('timing-redo-restores-document',same(redone.project,before.project));
   await commit(p,'Source in',7);await p.getByRole('alert').filter({hasText:'录屏时序未修改'}).waitFor();const invalid=await save(p,'01-invalid-range');check('invalid-trim-is-visible-and-does-not-edit',same(invalid.project,redone.project));
   // Native keyframe editing remains usable next to the new media controls.
   await p.getByLabel('Animation channel',{exact:true}).selectOption('rotation.y');await time(p,0);await p.getByRole('button',{name:'Add keyframe',exact:true}).click();await p.getByLabel('Keyframe easing',{exact:true}).selectOption('linear');await p.getByRole('button',{name:'Device rotation.y keyframe 4s',exact:true}).click();await commit(p,'Keyframe value',720);
   dual=await save(p,'01-dual-timed');
   check('media-controls-preserve-hand-authored-720-animation',near(dual.project.devices[1].transform['rotation.y'].keys.at(-1).v,Math.PI*4,1e-6)&&same(dual.project.devices[0].screenPlayback,before.project.devices[0].screenPlayback));
   check('archive-contains-two-different-source-bytes',Object.keys(dual.entries).filter(n=>n.startsWith('media/')).length===2&&hash(dual.entries['media/'+dual.project.devices[0].screen.id])!==hash(dual.entries['media/'+dual.project.devices[1].screen.id]));
   for(const [t,a,b]of [[0,1,4],[.4,1,4],[1,1.6,4],[1.7,2.199999,4.6],[2.4,2.199999,4],[3.8,2.199999,4.1]]){
     await time(p,t);const c=await clocks(p),aa=c.find(x=>x.playback?.in===1),bb=c.find(x=>x.playback?.in===4);
     check('paused-source-mapping-'+t,!!aa&&!!bb&&near(aa.time,a,.002)&&near(bb.time,b,.002),{timeline:t,actual:c,expected:[a,b]});
   }
   check('both-video-elements-remain-paused-while-scrubbing',(await clocks(p)).every(c=>c.paused));
 });
 if(!dual&&fs.existsSync(path.join(out,'01-dual-timed.mockup'))){const file=path.join(out,'01-dual-timed.mockup'),entries=unzipSync(fs.readFileSync(file));dual={file,entries,project:JSON.parse(strFromU8(entries['project.json']))};}
 if(cases.includes('02'))await run(browser,'02-new-session-restoration-and-export',async p=>{
   if(!dual)throw new Error('01 fixture not available');await open(p,dual.file);const reopened=await save(p,'02-reopened');
   check('new-session-exact-timing-tracks-and-media-recovery',same(reopened.project,dual.project)&&Object.keys(dual.entries).filter(n=>n.startsWith('media/')).every(n=>hash(dual.entries[n])===hash(reopened.entries[n])));
   report.references=[];for(const frame of [0,11,12,13,30,32,33,34,47,48,49,71,72,73,110,111,112,114,119]){const file=await preview(p,frame,'02-reference-'+frame);report.references.push({frame,file});write();}
   await p.getByRole('button',{name:'Standard',exact:true}).click();await p.getByRole('button',{name:'30 fps',exact:true}).click();await p.getByRole('button',{name:'MP4 (H.264)',exact:true}).click();
   const pending=p.waitForEvent('download',{timeout:180000});pending.catch(()=>{});const timer=setInterval(()=>console.log('EXPORT_IN_PROGRESS'),10000);
   const file=path.join(out,'P1-06-dual-timing-1080p30.mp4');try{await p.getByRole('button',{name:'Export video (MP4 (H.264))',exact:true}).click();await(await pending).saveAs(file);}finally{clearInterval(timer);}
   const meta=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));fs.writeFileSync(path.join(out,'02-ffprobe.json'),JSON.stringify(meta,null,2));const v=meta.streams.find(s=>s.codec_type==='video');
   check('real-dual-trimmed-delayed-looping-1080p30-mp4',v.codec_name==='h264'&&v.width===1920&&v.height===1080&&v.avg_frame_rate==='30/1'&&Number(v.nb_frames)===120,{frames:v.nb_frames,duration:meta.format.duration});
   await select(p,0);await commit(p,'Timeline start',.6);const edited=await save(p,'02-edit-after-export');check('reopened-project-remains-editable-after-export',edited.project.devices[0].screenPlayback.start===.6&&same(edited.project.devices[1],dual.project.devices[1]));
 });
 if(cases.includes('03'))await run(browser,'03-errors-and-retry-keep-current-project',async p=>{
   await open(p,dual.file);let current=await save(p,'03-before-errors');
   const files=[['not-zip',Buffer.from('bad zip')],['missing-json',zipSync({other:strToU8('x')})],['bad-json',zipSync({'project.json':strToU8('{no')})],['bad-root',zipSync({'project.json':strToU8('[]')})],['bad-model',zipSync({'project.json':strToU8(JSON.stringify({...dual.project,devices:[{...dual.project.devices[0],id:'unknown'}]}))})]];
   for(const [name,data]of files){const file=path.join(out,'03-'+name+'.mockup');fs.writeFileSync(file,data);await p.locator('.topbar input[type=file]').setInputFiles(file);await p.getByRole('alert').filter({hasText:'打开工程失败'}).waitFor();const after=await save(p,'03-after-'+name);check('visible-'+name+'-keeps-existing-document',same(after.project,current.project));current=after;}
   const corruptedEntries={...dual.entries};corruptedEntries['media/'+dual.project.devices[0].screen.id]=strToU8('not a video');await p.locator('.topbar input[type=file]').setInputFiles(fixture(dual.project,'03-bad-embedded-media',corruptedEntries));await p.getByRole('alert').filter({hasText:'打开工程失败'}).waitFor();check('corrupt-embedded-media-does-not-replace-project',same((await save(p,'03-after-corrupt-archive-media')).project,current.project));
   const corrupt=path.join(out,'03-corrupt.mp4');fs.writeFileSync(corrupt,'not a video');await p.locator('.dropzone input[type=file]').setInputFiles(corrupt);await p.getByRole('alert').filter({hasText:'导入素材失败'}).waitFor();check('bad-recording-has-visible-error-and-keeps-source',same((await save(p,'03-after-bad-video')).project,current.project));
   // Inject a storage read failure without touching any existing file bytes.
   await p.evaluate(()=>{window.__originalDirectory=navigator.storage.getDirectory.bind(navigator.storage);Object.defineProperty(navigator.storage,'getDirectory',{configurable:true,value:async()=>({getDirectoryHandle:async()=>({getFileHandle:async()=>{throw new Error('Injected unavailable storage')}})})});});
   await p.getByLabel('Project name',{exact:true}).fill('unsaved after storage failure');let downloads=0;p.on('download',()=>downloads++);await p.getByTitle(/^Save \.mockup/).click();await p.getByRole('alert').filter({hasText:'保存工程失败'}).waitFor();check('failed-save-is-visible-and-remains-dirty',downloads===0&&await p.getByText('未保存',{exact:true}).isVisible());
   await p.evaluate(()=>Object.defineProperty(navigator.storage,'getDirectory',{configurable:true,value:window.__originalDirectory}));
   const retried=await save(p,'03-save-retry');check('save-retry-preserves-original-media-bytes',retried.project.name==='unsaved after storage failure'&&Object.keys(current.entries).filter(n=>n.startsWith('media/')).every(n=>hash(retried.entries[n])===hash(current.entries[n])));
   await select(p,0);await commit(p,'Timeline start',.9);check('editing-continues-after-failed-open-and-save',(await save(p,'03-final')).project.devices[0].screenPlayback.start===.9);
 });
 if(cases.includes('04'))await run(browser,'04-missing-media-relink-and-background',async p=>{
   const entries={...dual.entries};delete entries['media/'+dual.project.devices[1].screen.id];const missingFile=fixture(dual.project,'04-missing',entries);
   p.keepUnsaved=true;await p.locator('.topbar input[type=file]').setInputFiles(missingFile);await p.getByRole('status').filter({hasText:'已取消打开'}).waitFor();p.keepUnsaved=false;
   check('cancel-missing-media-open-keeps-current-project',(await save(p,'04-cancelled-missing')).project.name==='Untitled');
   await open(p,missingFile);
   await p.getByRole('alert').filter({hasText:'素材缺失，点击设备'}).waitFor();await select(p,1);
   check('missing-source-identifies-device-and-preserves-timing',await p.getByText('素材缺失 · 点击重新绑定',{exact:true}).isVisible()&&await p.getByLabel('Source in',{exact:true}).inputValue()==='4'&&await p.getByLabel('Timeline start',{exact:true}).inputValue()==='1.1');
   await p.getByTitle(/^Save \.mockup/).click();await p.getByRole('alert').filter({hasText:'保存工程失败'}).waitFor();check('missing-source-blocks-incomplete-save',await p.getByRole('alert').filter({hasText:'保存工程失败'}).isVisible());
   await upload(p,secondary);const relinked=await save(p,'04-relinked');check('relink-keeps-timing-tracks-and-other-device',same(relinked.project.devices[1].screenPlayback,dual.project.devices[1].screenPlayback)&&same(relinked.project.devices[1].transform,dual.project.devices[1].transform)&&same(relinked.project.devices[0],dual.project.devices[0]));
   await p.getByRole('button',{name:'Background',exact:true}).click();await p.getByLabel('Background image',{exact:true}).setInputFiles(path.join(root,'assets/demo-screen.png'));await p.waitForTimeout(300);
   const withBackground=await save(p,'04-background');check('background-image-bytes-are-portable',withBackground.project.background.type==='image'&&!!withBackground.entries['media/'+withBackground.project.background.ref.id]);
   await open(p,withBackground.file);const reopened=await save(p,'04-background-reopened');check('background-restores-with-new-session-url',same(reopened.project,withBackground.project)&&hash(reopened.entries['media/'+reopened.project.background.ref.id])===hash(withBackground.entries['media/'+withBackground.project.background.ref.id]));
   const fresh=await session(browser,'04-background-fresh-context');try{await open(fresh.page,withBackground.file);const portable=await save(fresh.page,'04-background-fresh-context');check('background-and-device-media-restore-in-empty-context',same(portable.project,withBackground.project)&&Object.keys(withBackground.entries).filter(n=>n.startsWith('media/')).every(n=>hash(portable.entries[n])===hash(withBackground.entries[n])));}finally{await fresh.context.close();}
 });
 if(cases.includes('05'))await run(browser,'05-unsaved-work-protection',async p=>{
   await p.getByLabel('Project name',{exact:true}).fill('keep unsaved work');check('editing-shows-dirty-state',await p.getByText('未保存',{exact:true}).isVisible());
   const beforeUnload=await p.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;});check('refresh-close-listener-protects-unsaved-work',beforeUnload);
   p.keepUnsaved=true;const priorDialogs=report.dialogs.length;let cancelled=false;try{await p.reload({waitUntil:'commit',timeout:4000});}catch{cancelled=true;}
   check('actual-browser-reload-can-be-cancelled',cancelled&&report.dialogs.slice(priorDialogs).some(d=>d.type==='beforeunload'&&!d.accepted)&&await p.getByLabel('Project name',{exact:true}).inputValue()==='keep unsaved work');
   p.keepUnsaved=true;await p.getByTitle('New project',{exact:true}).click();check('cancel-new-preserves-unsaved-project',await p.getByLabel('Project name',{exact:true}).inputValue()==='keep unsaved work');
   await p.locator('.topbar input[type=file]').setInputFiles(dual.file);await p.waitForTimeout(150);check('cancel-open-preserves-unsaved-project',await p.getByLabel('Project name',{exact:true}).inputValue()==='keep unsaved work');
   p.keepUnsaved=false;await save(p,'05-user-saved');check('download-handoff-clears-dirty-state',!await p.getByText('未保存',{exact:true}).isVisible());
   check('saved-document-does-not-block-close',!await p.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;}));
   await p.getByTitle('New project',{exact:true}).click();check('new-after-save-creates-clean-default-project',await p.getByLabel('Project name',{exact:true}).inputValue()==='Untitled');
   await p.getByLabel('Project name',{exact:true}).fill('discard this');await open(p,dual.file);check('confirmed-open-replaces-with-validated-project',same((await save(p,'05-confirmed-open')).project,dual.project));
 });
 if(cases.includes('06'))await run(browser,'06-shared-source-and-procedural-readiness',async p=>{
   const x=two(base),shared=dual.project.devices[0].screen;
   x.devices.forEach((d,i)=>{d.id='procedural-phone';d.colorway='graphite';d.screen=structuredClone(shared);d.screenPlayback=i?{in:4,out:5.5,start:1,loop:false}:{in:0,out:1.5,start:0,loop:false};});
   await open(p,fixture(x,'06-shared-procedural',{['media/'+shared.id]:dual.entries['media/'+shared.id]}));
   check('procedural-phone-video-ready-probe-works',(await clocks(p)).length===2);
   await time(p,1.5);const c=await clocks(p);check('shared-source-uses-independent-device-decoders',c.length===2&&near(c.find(v=>v.playback.in===0).time,1.499999,.002)&&near(c.find(v=>v.playback.in===4).time,4.5,.002));
   const restored=await save(p,'06-shared-restored');check('shared-source-is-saved-once-with-two-independent-clocks',Object.keys(restored.entries).filter(n=>n.startsWith('media/')).length===1&&same(restored.project.devices.map(d=>d.screenPlayback),x.devices.map(d=>d.screenPlayback)));
   await time(p,.1);await time(p,.1+1/30);check('paused-one-frame-scrub-updates-source',near((await clocks(p)).find(v=>v.playback.in===0).time,.1+1/30,.002));
   await select(p,0);const number=p.getByLabel('Source in',{exact:true});await number.fill('.2');await number.press('Enter');await p.getByTitle(/^Undo \(/).click();check('numeric-enter-is-one-undo-step',await number.inputValue()==='0');await p.getByTitle(/^Redo \(/).click();await number.fill('.4');await number.press('Escape');await number.press('Tab');check('numeric-escape-cancels-draft',await number.inputValue()==='0.2');
   await select(p,1);await commit(p,'Timeline start',3);await time(p,0);await p.getByRole('button',{name:'Play',exact:true}).click();await p.waitForTimeout(450);const running=await clocks(p),playhead=Number(await p.getByLabel('Playhead time',{exact:true}).inputValue());await p.getByRole('button',{name:'Pause',exact:true}).click();
   check('live-playback-keeps-delayed-device-paused',playhead>0&&playhead<3&&running.find(v=>v.playback.in===4).paused&&near(running.find(v=>v.playback.in===4).time,4,.002)&&near(running.find(v=>v.playback.in===.2).time,Math.min(.2+playhead,1.499999),.15),{playhead,clocks:running});
   await preview(p,0,'06-procedural-frame');check('procedural-video-can-render-a-real-frame',fs.statSync(path.join(out,'06-procedural-frame.png')).size>1024);
 });
 if(cases.includes('07'))await run(browser,'07-upload-finishes-after-document-replacement',async p=>{
   const original=await save(p,'07-original');
   await p.evaluate(()=>{const create=document.createElement.bind(document);let once=true;document.createElement=function(tag,...args){const el=create(tag,...args);if(tag==='video'&&once){once=false;Object.defineProperty(el,'onloadedmetadata',{configurable:true,set(fn){if(fn)el.addEventListener('loadedmetadata',()=>setTimeout(fn,900),{once:true});}});}return el;};});
   await p.locator('.dropzone input[type=file]').setInputFiles(path.join(root,'assets/demo.mp4'));
   await open(p,original.file);await p.waitForTimeout(1300);const after=await save(p,'07-after-replacement');
   check('late-upload-cannot-write-into-reopened-same-instance-id',same(after.project,original.project)&&after.project.devices[0].screen===null);
 });
 if(cases.includes('08'))await run(browser,'08-background-and-shorter-source-recovery',async p=>{
   await p.getByRole('button',{name:'Background',exact:true}).click();await p.getByLabel('Background image',{exact:true}).setInputFiles(path.join(root,'assets/demo-screen.png'));
   await p.waitForTimeout(300);const complete=await save(p,'08-complete-background');
   const entries={...complete.entries};delete entries['media/'+complete.project.background.ref.id];const missingFile=fixture({...complete.project,name:'Missing background recovery'},'08-missing-background',entries);
   p.keepUnsaved=true;await p.locator('.topbar input[type=file]').setInputFiles(missingFile);await p.getByRole('status').filter({hasText:'已取消打开'}).waitFor();p.keepUnsaved=false;
   check('cancel-missing-background-preserves-current-project',same((await save(p,'08-background-cancelled')).project,complete.project));
   await open(p,missingFile);await p.getByRole('alert').filter({hasText:'背景图片缺失，请展开'}).waitFor();
   let downloads=0;p.on('download',()=>downloads++);await p.getByTitle(/^Save \.mockup/).click();await p.getByRole('alert').filter({hasText:'保存工程失败'}).waitFor();
   check('missing-background-is-visible-and-blocks-incomplete-save',downloads===0);await p.screenshot({path:path.join(out,'08-missing-background.png'),fullPage:true});
   await p.getByLabel('Background image',{exact:true}).setInputFiles(path.join(root,'assets/demo-screen.png'));await p.waitForTimeout(300);const repaired=await save(p,'08-background-repaired');
   check('background-relink-preserves-device-and-embeds-bytes',same(repaired.project.devices,complete.project.devices)&&!!repaired.entries['media/'+repaired.project.background.ref.id]);
   await upload(p,path.join(root,'assets/demo.mp4'));await commit(p,'Source in',1);await commit(p,'Source out',5);await commit(p,'Timeline start',2.5);await p.getByLabel('Loop selected recording range',{exact:true}).check();
   const timed=await save(p,'08-timed-source'),missing={...timed.entries};delete missing['media/'+timed.project.devices[0].screen.id];await open(p,fixture(timed.project,'08-missing-source',missing));
   const shorter=path.join(out,'08-shorter-source.mp4');execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',path.join(root,'assets/demo.mp4'),'-t','2','-c:v','libx264','-pix_fmt','yuv420p','-r','30','-an',shorter]);
   await upload(p,shorter);await p.getByRole('status').filter({hasText:'新录屏较短'}).waitFor();const relinked=await save(p,'08-shorter-relinked');
   check('shorter-source-relink-shows-clamped-range',same(relinked.project.devices[0].screenPlayback,{in:1,out:2,start:2.5,loop:true}));
   check('shorter-source-relink-keeps-animation-and-background',same(relinked.project.devices[0].transform,timed.project.devices[0].transform)&&same(relinked.project.background,timed.project.background));
   const field=p.getByLabel('Source in',{exact:true});await field.fill('');await field.press('Tab');await p.getByRole('alert').filter({hasText:'请输入有效的秒数'}).waitFor();
   check('empty-timing-input-is-visible-and-keeps-valid-document',same((await save(p,'08-empty-range')).project,relinked.project));
   await time(p,2.7);check('shorter-relinked-source-uses-preserved-delay',near((await clocks(p))[0].time,1.2,.002));
   await field.scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,'08-timing-controls.png'),fullPage:true});
   await upload(p,path.join(root,'assets/demo.mp4'));const replaced=await save(p,'08-ordinary-replacement');
   check('ordinary-recording-replacement-resets-timing',replaced.project.devices[0].screenPlayback===undefined&&await p.getByLabel('Source in',{exact:true}).inputValue()==='0'&&await p.getByLabel('Timeline start',{exact:true}).inputValue()==='0');
   await p.getByTitle(/^Undo \(/).click();check('source-replacement-undo-restores-timing-and-media',same((await save(p,'08-replacement-undone')).project,relinked.project));
 });
 check('no-unhandled-page-errors',report.pageErrors.length===0,{errors:report.pageErrors});check('no-missing-build-resources',report.requestFailures.length===0,{requests:report.requestFailures});
 report.status=report.checks.every(c=>c.status==='PASS')&&report.cases.every(c=>c.status==='COMPLETED')?'PASS':'FAIL';write();console.log('FINAL '+report.status+' '+report.checks.length+' assertions');process.exitCode=report.status==='PASS'?0:1;
}catch(error){report.status='INCOMPLETE';report.error=String(error);write();console.error(error);process.exitCode=1;}finally{await browser?.close();}})();
