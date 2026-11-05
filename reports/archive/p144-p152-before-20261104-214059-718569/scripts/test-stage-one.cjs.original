const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.PHASE_OUT||path.join(root,'output','p10709-'+Date.now()));
const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH||path.join(root,'.venv','Lib','site-packages','playwright','driver','package'));
const {zipSync,unzipSync,strToU8,strFromU8}=require(path.join(root,'node_modules/fflate'));
const url=process.env.STUDIO_URL||'http://127.0.0.1:4207',phase=process.env.PHASE||'errors';
fs.mkdirSync(out,{recursive:true});
const report={date:new Date().toISOString(),phase,url,method:'Real Vite HTTP/TCP, existing native store/actions and UI, real Chrome/WebGL/WebCodecs. Controlled faults are restored after each case.',checks:[],pageErrors:[],status:'RUNNING'};
const write=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
function check(id,ok,detail={}){report.checks.push({id,status:ok?'PASS':'FAIL',...detail});write();console.log((ok?'PASS ':'FAIL ')+id);}
const linear=[0,0,1,1],key=(t,v)=>({t,v,ease:linear}),track=v=>({keys:[key(0,v)]}),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function session(browser){const context=await browser.newContext({viewport:{width:1440,height:1040},acceptDownloads:true});await context.route('**/*',r=>{const u=new URL(r.request().url());return ['127.0.0.1','localhost'].includes(u.hostname)?r.continue():r.abort()});const page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>{report.pageErrors.push(String(e));write()});page.on('dialog',d=>d.accept());await page.goto(url+'/?automation=1',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__PROMO_BRIDGE__);await page.getByRole('button',{name:'Movie',exact:true}).click();await page.evaluate(async()=>{window.S=(await import('/src/store/project.ts')).useProjectStore;window.E=await import('/src/ui/ExportDialog/ExportDialog.tsx');window.F=await import('/src/export/frameRenderer.ts');window.X=await import('/src/export/session.ts')});await page.evaluate(()=>window.__PROMO_BRIDGE__.waitForReady());return {page,context};}
async function getProject(p){return p.evaluate(()=>JSON.parse(JSON.stringify(window.S.getState().project)));}
function stage(base,name,w=640,h=360,seconds=.2){const x=structuredClone(base);x.name=name;x.duration=seconds;x.fps=30;x.output={width:w,height:h};x.background={type:'solid',color:'#172232'};x.camera.preset='front';Object.entries({'position.x':0,'position.y':0,'position.z':3.2,'target.x':0,'target.y':0,'target.z':0,fov:32}).forEach(([c,v])=>x.camera.tracks[c]=track(v));x.devices=[structuredClone(x.devices[0])];x.devices[0].screen=null;delete x.devices[0].screenPlayback;Object.entries({'position.x':0,'position.y':0,'position.z':0,'rotation.x':0,'rotation.y':0,'rotation.z':0,scale:.8}).forEach(([c,v])=>x.devices[0].transform[c]=track(v));return x;}
function fixture(project,name,media={}){const file=path.join(out,name+'.mockup');fs.writeFileSync(file,zipSync({'project.json':strToU8(JSON.stringify(project)),...media}));return file;}
async function open(p,file){await p.locator('.topbar input[type=file]').setInputFiles(file);await p.evaluate(()=>window.__PROMO_BRIDGE__.waitForReady());await p.waitForTimeout(300);}
async function save(p,name){const waiting=p.waitForEvent('download');await p.getByTitle(/^Save \.mockup/).click();const dl=await waiting,file=path.join(out,name+'.mockup');await dl.saveAs(file);const entries=unzipSync(fs.readFileSync(file));return {file,entries,project:JSON.parse(strFromU8(entries['project.json']))};}
async function standard(p){await p.getByRole('button',{name:'Standard',exact:true}).click();const mp4=p.getByRole('button',{name:'MP4 (H.264)',exact:true});await mp4.waitFor();await mp4.click();}
async function video(p,name,timeout=1200000){const started=Date.now(),waiting=p.waitForEvent('download',{timeout});waiting.catch(()=>{});await p.getByRole('button',{name:'Export video (MP4 (H.264))',exact:true}).click();const dl=await waiting,file=path.join(out,name+'.mp4');await dl.saveAs(file);const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-count_frames','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));fs.writeFileSync(path.join(out,name+'-ffprobe.json'),JSON.stringify(probe,null,2));return {file,probe,seconds:(Date.now()-started)/1000};}
async function frame(p,i,name){const data=await p.evaluate(i=>window.__PROMO_BRIDGE__.previewFrame(i,'standard'),i);const file=path.join(out,name+'.png');fs.writeFileSync(file,Buffer.from(data.split(',')[1],'base64'));return file;}
async function state(p){return p.evaluate(()=>({project:JSON.stringify(window.S.getState().project),playing:window.S.getState().playing,playhead:window.S.getState().playhead,active:window.F.isFrameExportActive(),busy:window.X.useExportSession.getState().busy,ratio:window.__mockup.renderer.getPixelRatio(),width:window.__mockup.renderer.domElement.width,height:window.__mockup.renderer.domElement.height}));}
async function fault(p,kind){await p.evaluate(kind=>{
 window.restoreFault?.();
 const undo=[];const patch=(obj,k,val)=>{const old=Object.getOwnPropertyDescriptor(obj,k);Object.defineProperty(obj,k,{configurable:true,...val});undo.push(()=>old?Object.defineProperty(obj,k,old):delete obj[k])};
 const fail=()=>{throw new Error('Controlled '+kind+' failure')};
 if(kind==='configure'||kind==='encode'||kind==='flush')patch(VideoEncoder.prototype,kind,{value:fail});
 if(kind==='stall')patch(VideoEncoder.prototype,'flush',{value:()=>new Promise(()=>{})});
 if(kind==='output')patch(HTMLAnchorElement.prototype,'click',{value:function(){if(this.download.endsWith('.mp4'))fail();}});
 if(kind==='render'){const old=window.__mockup.renderer.render;window.__mockup.renderer.render=function(...args){if(window.F.isFrameExportActive())fail();return old.apply(this,args)};undo.push(()=>window.__mockup.renderer.render=old)}
 if(kind==='allocation'){const old=window.OffscreenCanvas;window.OffscreenCanvas=class extends old{constructor(...a){if(window.F.isFrameExportActive())fail();super(...a)}};undo.push(()=>window.OffscreenCanvas=old)}
 if(kind==='decode')patch(HTMLMediaElement.prototype,'error',{get:()=>({message:'Controlled decode failure'})});
 if(kind==='seek') {const desc=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');patch(HTMLMediaElement.prototype,'currentTime',{get:desc.get,set:()=>{}})}
 window.restoreFault=()=>{undo.reverse().forEach(f=>f());window.restoreFault=null};
},kind);}
async function recovered(p,label,before){await p.waitForFunction(()=>!window.X.useExportSession.getState().busy);const after=await state(p);check(label+'-resources-and-document-restored',!after.busy&&!after.active&&before.project===after.project&&before.width===after.width&&before.height===after.height&&before.ratio===after.ratio,{after:{...after,project:undefined}});await p.getByRole('button',{name:'Play',exact:true}).click();await p.waitForTimeout(160);await p.getByRole('button',{name:'Pause',exact:true}).click();check(label+'-preview-plays',await p.getByRole('button',{name:'Play',exact:true}).isVisible());}
async function pattern(p){return Buffer.from((await p.evaluate(()=>{const c=document.createElement('canvas');c.width=640;c.height=1380;const x=c.getContext('2d');x.fillStyle='#f5f7fb';x.fillRect(0,0,640,1380);x.fillStyle='#101828';x.font='bold 36px Arial';x.fillText('SCREEN CHECK',125,210);x.font='28px Arial';for(let i=0;i<12;i++)x.fillText('0123456789  Row '+i,95,300+i*70);for(const [color,left,top,text]of [['#f52222',0,0,'TL'],['#15d52a',480,0,'TR'],['#2255f5',0,1210,'BL'],['#efce12',480,1210,'BR']]){x.fillStyle=color;x.fillRect(left,top,160,170);x.fillStyle='#000';x.font='bold 45px Arial';x.fillText(text,left+20,top+100)}return c.toDataURL('image/png')})).split(',')[1],'base64');}
(async()=>{let browser;try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',downloadsPath:path.join(out,'downloads'),args:['--no-sandbox','--enable-webgl','--use-gl=angle','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});report.browser=browser.version();
 const {page:p,context}=await session(browser);const base=await getProject(p);
 if(phase==='errors'){
   const small=stage(base,'P1-07 controlled failures');await open(p,fixture(small,'small'));await standard(p);
   for(const kind of ['configure','encode','flush','render','allocation','output']){
     await fault(p,kind);const before=await state(p);await p.getByRole('button',{name:'Export video (MP4 (H.264))',exact:true}).click();
     await p.getByRole('alert').filter({hasText:'Controlled '+kind}).first().waitFor();check(kind+'-has-visible-cause-and-retry',await p.getByRole('button',{name:'重试导出',exact:true}).isVisible());await p.evaluate(()=>window.restoreFault());await recovered(p,kind,before);
     const waiting=p.waitForEvent('download');await p.getByRole('button',{name:'重试导出',exact:true}).click();await (await waiting).saveAs(path.join(out,kind+'-retry.mp4'));check(kind+'-retry-downloads-valid-file',fs.statSync(path.join(out,kind+'-retry.mp4')).size>1024);
   }
   await fault(p,'stall');await p.getByRole('button',{name:'Export video (MP4 (H.264))',exact:true}).click();await p.waitForTimeout(1000);await p.getByRole('button',{name:/^Cancel/}).click();await p.getByRole('status').filter({hasText:'已取消导出'}).waitFor();await p.evaluate(()=>window.restoreFault());check('cancel-during-stalled-flush-restores-editor',!(await state(p)).busy);
   const recording=stage(base,'P1-07 media errors');recording.devices[0].screen={id:'recording-a',kind:'video',width:480,height:960,duration:8};const bytes=fs.readFileSync(path.join(root,'assets/demo.mp4'));await open(p,fixture(recording,'media',{'media/recording-a':bytes}));await standard(p);
   for(const kind of ['decode','seek']){
     await fault(p,kind);const before=await state(p);await p.getByRole('button',{name:'Export video (MP4 (H.264))',exact:true}).click();await p.getByRole('alert').filter({hasText:kind==='decode'?'DECODE_FAILED':'SEEK_TIMEOUT'}).first().waitFor();check(kind+'-error-is-visible',true);await p.evaluate(()=>window.restoreFault());await recovered(p,kind,before);
   }
   await fault(p,'seek');await p.getByRole('button',{name:'Export video (MP4 (H.264))',exact:true}).click();await p.waitForTimeout(400);const t=Date.now();await p.getByRole('button',{name:/^Cancel/}).click();await p.waitForFunction(()=>!window.X.useExportSession.getState().busy);check('cancel-interrupts-pending-seek',Date.now()-t<2500,{milliseconds:Date.now()-t});await p.evaluate(()=>window.restoreFault());
   const cancelSample=stage(base,'Cancel and re-export',640,360,3);await open(p,fixture(cancelSample,'cancel'));await standard(p);const before=await state(p);await p.getByRole('button',{name:'Export video (MP4 (H.264))',exact:true}).click();await p.getByRole('button',{name:/^Cancel/}).waitFor();check('editor-controls-locked-during-export',await p.locator('main').evaluate(el=>el.inert)&&await p.locator('.topbar').evaluate(el=>el.closest('[inert]')!==null));await p.getByRole('button',{name:/^Cancel/}).click();await recovered(p,'cancel',before);const re=await video(p,'after-cancel');check('cancel-followed-by-successful-export',re.probe.streams[0].nb_read_frames==='90');
   await open(p,fixture(small,'fallback'));await p.evaluate(()=>{window.originalEncoder=window.VideoEncoder;window.VideoEncoder=undefined});await p.getByRole('button',{name:'High',exact:true}).click();await p.getByRole('button',{name:'Standard',exact:true}).click();await p.waitForTimeout(150);check('no-encoder-offers-png-fallback',await p.getByText(/This browser can't encode video/).isVisible());const waiting=p.waitForEvent('download');await p.getByRole('button',{name:/^Export PNG sequence/}).click();const zip=path.join(out,'fallback.zip');await(await waiting).saveAs(zip);const entries=unzipSync(fs.readFileSync(zip));check('png-fallback-contains-all-frames',Object.keys(entries).length===6&&entries['frame_0000.png'][0]===137);await p.evaluate(()=>window.VideoEncoder=window.originalEncoder);
 }
 if(phase==='models'){
   const bytes=await pattern(p);fs.writeFileSync(path.join(out,'screen-check.png'),bytes);const all=await p.evaluate(async()=>Object.values((await import('/src/devices/manifest.ts')).DEVICE_MANIFESTS));const manifest=process.env.MODEL_IDS?all.filter(m=>process.env.MODEL_IDS.split(',').includes(m.id)):all;report.inventory=[];
   for(const m of manifest){
     const x=stage(base,'P1-08 '+m.id,800,800,2);x.devices[0].id=m.id;x.devices[0].colorway=m.colorways[0].id;x.devices[0].screen={id:'pattern-'+m.id,kind:'image',width:640,height:1380};x.devices[0].transform['rotation.y']={keys:[key(0,0),key(2,Math.PI*2)]};
     await open(p,fixture(x,m.id,{['media/'+x.devices[0].screen.id]:bytes}));await standard(p);
     const views={};for(const [name,i]of [['front',0],['left',15],['back',30],['right',45]])views[name]=path.basename(await frame(p,i,m.id+'-'+name));
     const clip=await video(p,m.id+'-spin');check(m.id+'-loads-and-exports-rotation',clip.probe.streams[0].nb_read_frames==='60',{seconds:clip.seconds});
     const colors=[];for(const c of m.colorways){await p.evaluate(c=>window.S.getState().setColorway(c),c.id);await p.waitForTimeout(130);await frame(p,30,m.id+'-'+c.id+'-back');colors.push(c.id)}
     const src=m.glb?path.join(root,'public',m.glb.replace(/^\//,'')):null;
     report.inventory.push({id:m.id,name:m.name,source:m.glb,sha256:src?hash(fs.readFileSync(src)):null,views,video:path.basename(clip.file),colors,screenMaterial:m.screenMaterialName,screenAspect:m.screenAspect});write();
   }
   for(const m of manifest){
     const x=stage(base,'P1-08 instance isolation '+m.id,800,600,.2);x.devices=[structuredClone(x.devices[0]),structuredClone(x.devices[0])];for(let i=0;i<2;i++){const a=x.devices[i];a.instanceId=crypto.randomUUID();a.id=m.id;a.colorway=m.colorways[0].id;a.screen={id:'isolate-'+i,kind:'image',width:640,height:1380};a.transform['position.x']=track(i?.5:-.5);a.transform.scale=track(.55)}
     await open(p,fixture(x,m.id+'-isolation',{'media/isolate-0':bytes,'media/isolate-1':bytes}));const signatures=()=>p.evaluate(()=>{const values=[];window.__mockup.scene.traverse(o=>{if(o.userData.deviceIndex===undefined)return;let mats=[];o.traverse(i=>{if(i.isMesh){for(const m of (Array.isArray(i.material)?i.material:[i.material]))mats.push({uuid:m.uuid,name:m.name,color:m.color?.getHexString(),map:m.uniforms?.map?.value?.uuid||m.map?.uuid})}});values[o.userData.deviceIndex]=mats});return values});const before=await signatures();await p.evaluate(c=>{window.S.getState().setActiveDevice(1);window.S.getState().setColorway(c)},m.colorways.at(-1).id);await p.waitForTimeout(200);const after=await signatures();check(m.id+'-material-and-screen-instance-isolation',JSON.stringify(before[0])===JSON.stringify(after[0])&&before[0].some(a=>a.map&&!before[1].some(b=>b.map===a.map)));
   }
 }
 if(phase==='workflow'){
   // Independently capture two actual local demo pages. These are test footage, not the user's app.
   const footage={};for(const kind of ['Meals','Activity']){
     if(process.env.FOOTAGE_ROOT){
       const previous=JSON.parse(fs.readFileSync(path.join(process.env.FOOTAGE_ROOT,'report.json'),'utf8')).footage[kind];
       const mp4=path.join(out,kind.toLowerCase()+'-recording.mp4'),bytes=fs.readFileSync(path.join(process.env.FOOTAGE_ROOT,kind.toLowerCase()+'-recording.mp4'));
       if(hash(bytes)!==previous.sha256)throw new Error('Footage hash changed');
       fs.writeFileSync(mp4,bytes);footage[kind]={...previous,path:mp4};continue;
     }
     const rc=await browser.newContext({viewport:{width:480,height:960},recordVideo:{dir:path.join(out,'captures'),size:{width:480,height:960}}});const rp=await rc.newPage();
     await rp.setContent('<html><body style="margin:0;background:#f2f5f4;font-family:Arial;color:#17252b;padding:28px"><p>LOCAL DEMO RECORDING</p><h1>'+kind+'</h1><h2 id="count">0</h2><button style="font-size:24px;padding:20px" onclick="document.getElementById(\'count\').textContent=Number(document.getElementById(\'count\').textContent)+1">Add '+(kind==='Meals'?'meal':'activity')+'</button><div id="list"></div><script>setInterval(()=>{let d=document.createElement("p");d.textContent="'+kind+' entry "+document.getElementById("count").textContent+" - "+new Date().toLocaleTimeString();document.getElementById("list").prepend(d)},1100)</script></body></html>');
     for(let i=0;i<6;i++){await rp.getByRole('button').click();await rp.waitForTimeout(700)}
     const recorded=rp.video();await rc.close();const webm=await recorded.path(),mp4=path.join(out,kind.toLowerCase()+'-recording.mp4');execFileSync('ffmpeg',['-v','error','-y','-i',webm,'-vf','fps=30,scale=480:960','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-an',mp4]);const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_format','-of','json',mp4],{encoding:'utf8'}));footage[kind]={path:mp4,duration:Number(probe.format.duration),sha256:hash(fs.readFileSync(mp4))};
   }report.footage=footage;write();check('two-independent-browser-recordings',footage.Meals.sha256!==footage.Activity.sha256);
   // UI creation starts from a blank composition; positioning/camera fixture avoids subjective layout noise.
   const x=stage(base,'Stage one sample',1920,1080,4);await open(p,fixture(x,'blank-composition'));await p.getByTitle('Change device',{exact:true}).click();await p.getByRole('button',{name:'iPhone 17 Pro',exact:true}).click();await p.locator('.dropzone input[type=file]').setInputFiles(footage.Meals.path);await p.evaluate(()=>window.__PROMO_BRIDGE__.waitForReady());
   await p.getByRole('button',{name:'Add a second device',exact:true}).click();await p.getByTitle('Change device',{exact:true}).click();await p.getByRole('button',{name:'Google Pixel 9 Pro XL',exact:true}).click();await p.locator('.dropzone input[type=file]').setInputFiles(footage.Activity.path);await p.evaluate(()=>window.__PROMO_BRIDGE__.waitForReady());
   async function number(label,v){const f=p.getByLabel(label,{exact:true});await f.fill(String(v));await f.press('Tab')}
   await p.locator('.device-row').nth(0).locator('.device-row-name').click();await number('Source in',.3);await number('Source out',2.4);await number('Timeline start',.3);
   await p.locator('.device-row').nth(1).locator('.device-row-name').click();await number('Source in',.8);await number('Source out',2.7);await number('Timeline start',1.1);await p.getByLabel('Loop selected recording range',{exact:true}).check();
   // Create the complete animation through the inspector and keyframe controls.
   async function inspector(index,value){const box=p.locator('.field-header').filter({hasText:'Transform'}).locator('..').locator('.numfield-box').nth(index);await box.click();const input=box.locator('input');await input.fill(String(value));await input.press('Enter')}
   async function animated(channel,keys){
     await p.getByLabel('Track target',{exact:true}).selectOption('device');
     await p.getByLabel('Animation channel',{exact:true}).selectOption(channel);
     for(const [t,v]of keys){
       await number('Playhead time',t);
       await p.getByRole('button',{name:'Add keyframe',exact:true}).click();
       await number('Keyframe value',v);
       await p.getByLabel('Keyframe easing',{exact:true}).selectOption('linear');
     }
   }
   for(let i=0;i<2;i++){
     await p.locator('.device-row').nth(i).locator('.device-row-name').click();await number('Playhead time',0);
     await inspector(0,i?.5:-.5);await inspector(6,.55);
     await animated('position.y',[[0,-1.7],[i?.8:.4,-1.7],[i?1.3:.9,0],[3.4,0],[4,1.7]]);
     await animated('rotation.y',[[0,0],[i?1.2:.8,0],[i?2.7:2.3,360],[4,360]]);
   }
   const saved=await save(p,'authored');await standard(p);const short=await video(p,'stage-one-short');check('dual-real-recordings-short-export',short.probe.streams[0].nb_read_frames==='120');
   report.references=[];for(const i of [0,11,12,13,26,27,28,32,33,34,47,48,49,71,72,73,101,102,103,119]){const file=await frame(p,i,'short-reference-'+i);report.references.push({frame:i,file:path.basename(file)});}write();
   const fresh=await session(browser);await open(fresh.page,saved.file);const reopened=await save(fresh.page,'reopened');check('fresh-context-restores-media-and-tracks',JSON.stringify(reopened.project)===JSON.stringify(saved.project)&&Object.keys(saved.entries).filter(k=>k.startsWith('media/')).every(k=>hash(saved.entries[k])===hash(reopened.entries[k])));
   await fresh.page.getByLabel('Project name',{exact:true}).fill('Stage one revised');await fresh.page.locator('.device-row').nth(1).locator('.device-row-name').click();await fresh.page.getByLabel('Timeline start',{exact:true}).fill('1.3');await fresh.page.getByLabel('Timeline start',{exact:true}).press('Tab');await fresh.page.getByTitle(/^Undo/).click();check('reopened-edit-can-undo',await fresh.page.getByLabel('Timeline start',{exact:true}).inputValue()==='1.1');await fresh.page.getByTitle(/^Redo/).click();const revised=await save(fresh.page,'revised');check('reopened-edit-preserves-first-device',JSON.stringify(revised.project.devices[0])===JSON.stringify(saved.project.devices[0]));await standard(fresh.page);const re=await video(fresh.page,'stage-one-revised');check('reopened-modified-project-reexports',re.probe.streams[0].nb_read_frames==='120');await fresh.context.close();
   // Scale key times through the same native document format for duration/performance coverage.
   report.performance=[];for(const duration of [30,60]){
     const long=structuredClone(saved.project);long.name='Stage-one-'+duration+'s';long.duration=duration;for(const d of long.devices){for(const t of Object.values(d.transform))for(const k of t.keys)k.t*=duration/4;d.screenPlayback.loop=true;d.screenPlayback.start*=duration/4}
     await open(p,fixture(long,'long-'+duration,Object.fromEntries(Object.entries(saved.entries).filter(([k])=>k.startsWith('media/')))));await standard(p);
     const cdp=await context.newCDPSession(p);await cdp.send('Performance.enable');const memory=[];let sample=true;const sampling=(async()=>{while(sample){try{const a=await cdp.send('Performance.getMetrics');const m=Object.fromEntries(a.metrics.map(x=>[x.name,x.value]));memory.push({time:Date.now(),heap:m.JSHeapUsedSize,documents:m.Documents,nodes:m.Nodes})}catch{}await new Promise(r=>setTimeout(r,1000))}})();
     const result=await video(p,'stage-one-'+duration+'s');sample=false;await sampling;const st=result.probe.streams[0];check(duration+'s-1080p30-real-mp4',st.width===1920&&st.height===1080&&st.r_frame_rate==='30/1'&&Number(st.nb_read_frames)===duration*30,{elapsedSeconds:result.seconds});
     const perf={duration,elapsedSeconds:result.seconds,outputBytes:fs.statSync(result.file).size,peakSampledJsHeap:Math.max(...memory.map(x=>x.heap)),samples:memory,frames:st.nb_read_frames};report.performance.push(perf);fs.writeFileSync(path.join(out,'performance-'+duration+'.json'),JSON.stringify(perf,null,2));write();
     for(const i of [0,Math.round(duration*15),duration*30-1])await frame(p,i,duration+'s-reference-'+i);
     await cdp.detach();
   }
 }
 await context.close();report.status=report.checks.some(c=>c.status==='FAIL')||report.pageErrors.length?'FAIL':'PASS';if(report.status!=='PASS')process.exitCode=1;write();
}catch(e){report.status='INCOMPLETE';report.error=String(e);report.stack=e.stack;write();console.error(e);process.exitCode=1}finally{await browser?.close();write()}})();

