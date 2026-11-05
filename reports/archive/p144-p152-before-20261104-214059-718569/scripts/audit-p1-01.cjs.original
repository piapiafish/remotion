const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root=path.resolve(__dirname,'..');
const audit=process.env.P101_AUDIT_ROOT ? path.resolve(process.env.P101_AUDIT_ROOT) : path.join(root,'output','p101-'+new Date().toISOString().replace(/[:.]/g,'-'));
const dist=path.join(root,'dist');
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || path.join(root,'.venv','Lib','site-packages','playwright','driver','package'));
const { unzipSync, strFromU8, zipSync, strToU8 } = require(path.join(root,'node_modules','fflate'));
const out=path.join(audit,'evidence','browser');
fs.mkdirSync(out,{recursive:true});
const report={date:new Date().toISOString(),source:root,method:'Unmodified current production build; existing Playwright JS SDK; localhost-origin requests fulfilled from local dist files, without TCP network. UI actions, file inputs and browser downloads exercise the real application. This does not validate Vite or studio API networking.',checks:[],cases:[],pageErrors:[],requestFailures:[],status:'RUNNING'};
const write=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function check(id,pass,details={}){report.checks.push({id,status:pass?'PASS':'FAIL',...details});write();console.log((pass?'PASS ':'FAIL ')+id);}
function note(id,status,details={}){report.checks.push({id,status,...details});write();console.log(status+' '+id);}
const sections={
 transform:p=>p.locator('.field-header').filter({hasText:'Transform'}).locator('..'),
 export:p=>p.locator('.section').filter({has:p.locator('.section-title').filter({hasText:/^Export$/})})
};
async function setNumber(page,index,value){
 const box=sections.transform(page).locator('.numfield-box').nth(index);
 await box.click();
 const input=box.locator('input');
 await input.fill(String(value)); await input.press('Enter');
}
async function saveProject(page,name){
 const pending=page.waitForEvent('download',{timeout:20000});
 await page.getByTitle('Save .mockup (⌘S)',{exact:true}).click();
 const dl=await pending, file=path.join(out,name+'.mockup');
 await dl.saveAs(file);
 const bytes=fs.readFileSync(file), entries=unzipSync(bytes);
 return {file,project:JSON.parse(strFromU8(entries['project.json'])),entries,sha256:hash(bytes)};
}
async function changeDevice(page,name){
 await page.locator('.device-open').click();
 await page.getByRole('button',{name,exact:true}).click();
 await page.waitForTimeout(250);
 await page.evaluate(()=>window.__PROMO_BRIDGE__.waitForReady());
}
async function duration(page,seconds){
 await page.locator('.time-duration').fill(String(seconds));
 await page.locator('.time-duration').press('Tab');
}
async function seek(page,fraction){
 const box=await page.locator('.ruler').boundingBox();
 await page.mouse.click(box.x+Math.max(.5,Math.min(box.width-.5,box.width*fraction)),box.y+box.height/2);
 await page.waitForTimeout(150);
}
async function preview(page,index,name){
 const data=await page.evaluate(i=>window.__PROMO_BRIDGE__.previewFrame(i,'standard'),index);
 const file=path.join(out,name+'.png');
 const bytes=Buffer.from(data.split(',')[1],'base64');fs.writeFileSync(file,bytes);
 return {file,sha256:hash(bytes),size:bytes.length};
}
async function openPage(browser,label,init){
 const context=await browser.newContext({viewport:{width:1440,height:960},acceptDownloads:true});
 if(init)await context.addInitScript(init);
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.hdr':'application/octet-stream','.glb':'model/gltf-binary','.svg':'image/svg+xml'};
 await context.route('**/*',async route=>{
  try{
   const u=new URL(route.request().url());
   if(u.hostname!=='127.0.0.1'){report.requestFailures.push({case:label,path:u.origin+u.pathname,reason:'EXTERNAL_REQUEST_ABORTED'});return await route.abort();}
   const rel=decodeURIComponent(u.pathname).replace(/^\/+/,'')||'index.html';
   const file=path.resolve(dist,rel);
   if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)){report.requestFailures.push({case:label,path:rel,reason:'NOT_FOUND'});return await route.fulfill({status:404,body:'Not found'});}
   await route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  }catch(e){report.requestFailures.push({case:label,error:String(e)});await route.abort().catch(()=>{});}
 });
 const page=await context.newPage();page.setDefaultTimeout(12000);
 page.on('pageerror',error=>{report.pageErrors.push({case:label,error:String(error)});write();});
 await page.goto('http://127.0.0.1:4187/?automation=1',{waitUntil:'networkidle',timeout:45000});
 await page.getByRole('button',{name:'Movie',exact:true}).click();
 await page.waitForFunction(()=>!!window.__PROMO_BRIDGE__);
 await page.evaluate(()=>window.__PROMO_BRIDGE__.waitForReady());
 return {context,page};
}
async function runCase(browser,id,fn,init){
 console.log('START_CASE '+id);const started=Date.now();let context,page;
 try{
  ({context,page}=await openPage(browser,id,init));
  await fn(page,context);
  report.cases.push({id,execution:'COMPLETED',seconds:(Date.now()-started)/1000});
 }catch(e){
  note(id,'INCOMPLETE',{error:String(e)});
  if(page)await page.screenshot({path:path.join(out,id+'-unexpected.png')}).catch(()=>{});
  report.cases.push({id,execution:'INCOMPLETE',error:String(e),stack:e.stack,seconds:(Date.now()-started)/1000});
 }finally{if(context)await context.close().catch(()=>{});write();}
}
let mediaProject, mediaProjectState;
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({headless:true,timeout:30000,executablePath:process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p)),args:['--no-sandbox','--enable-webgl','--use-gl=angle','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  report.browser=browser.version();write();
  await runCase(browser,'01-device-lifecycle',async page=>{
   const initial=await saveProject(page,'01-initial');
   check('startup-default-project',initial.project.devices.length===1&&initial.project.output.width===1920&&initial.project.output.height===1080);
   await page.getByRole('button',{name:'Add a second device',exact:true}).click();
   const added=await saveProject(page,'01-added');
   check('device-add',added.project.devices.length===2);
   const a=added.project.devices.map(d=>['position.x','position.y','position.z'].map(c=>d.transform[c].keys[0].v));
   check('MAN-004-added-device-visible-position',JSON.stringify(a[0])!==JSON.stringify(a[1]),{positions:a,issue:'MAN-004'});
   await page.locator('.device-row').nth(1).getByTitle('Duplicate',{exact:true}).click();
   const duplicated=await saveProject(page,'01-duplicated');
   check('device-duplicate',duplicated.project.devices.length===3&&new Set(duplicated.project.devices.map(d=>d.instanceId)).size===3);
   await page.locator('.device-row').nth(2).getByTitle('Remove',{exact:true}).click();
   check('device-remove',(await saveProject(page,'01-removed')).project.devices.length===2);
   await setNumber(page,0,.7);
   const moved=await saveProject(page,'01-independent-position');
   check('ordinary-edit-targets-selected-device',moved.project.devices[1].transform['position.x'].keys[0].v===.7&&moved.project.devices[0].transform['position.x'].keys[0].v===0);
   await page.getByRole('combobox',{name:'Add animation',exact:true}).selectOption('spin-y-360');
   const preset=await saveProject(page,'01-global-preset');
   const keyCounts=preset.project.devices.map(d=>d.transform['rotation.y'].keys.length);
   check('MAN-005-single-device-preset-isolation',keyCounts[0]===1&&keyCounts[1]>1,{keyCounts,issue:'MAN-005',note:'Preset action currently affects all devices.'});
   await page.screenshot({path:path.join(out,'01-multi-device.png')});
  });
  await runCase(browser,'02-undo-selection',async page=>{
   await page.getByRole('button',{name:'Add a second device',exact:true}).click();
   await page.getByTitle('Undo (⌘Z)',{exact:true}).click();
   await page.waitForTimeout(300);
   const fields=await page.locator('.numfield-box').count();
   const rows=await page.locator('.device-row').count();
   const errorCount=report.pageErrors.filter(x=>x.case==='02-undo-selection').length;
   check('MAN-003-undo-keeps-editor-usable',fields>=7&&errorCount===0,{fieldCount:fields,deviceRows:rows,pageErrors:errorCount,issue:'MAN-003'});
   await page.screenshot({path:path.join(out,'02-after-undo.png')});
   if(await page.getByTitle('Redo (⇧⌘Z)',{exact:true}).count()){
    await page.getByTitle('Redo (⇧⌘Z)',{exact:true}).click();
    check('redo-restores-editing',await sections.transform(page).locator('.numfield-box').count()===7);
   }else note('redo-after-undo-crash','BLOCKED');
  });
  await runCase(browser,'03-manual-animation',async page=>{
   await seek(page,0);await setNumber(page,1,0);
   await seek(page,.5);await setNumber(page,1,.45);
   const manual=await saveProject(page,'03-manual-parameters');
   const manualKeys=manual.project.devices[0].transform['position.y'].keys;
   check('MAN-001-manual-animation-start',manualKeys.length>=2,{keys:manualKeys,issue:'MAN-001',note:'This static-track behavior is intentional; explicit add-key/enable-animation UI is missing.'});
   await page.getByRole('combobox',{name:'Add animation',exact:true}).selectOption('spin-y-360');
   const before=await saveProject(page,'03-keys-before-drag');
   const key=page.getByRole('button',{name:'Device keyframe 0s',exact:true});
   const box=await key.boundingBox(),lane=await page.locator('.track-lane').last().boundingBox();
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
   await page.mouse.move(box.x+box.width/2+lane.width*.25,box.y+box.height/2,{steps:12});await page.mouse.up();
   const after=await saveProject(page,'03-keys-after-drag');
   check('MAN-002-drag-changes-key-time',JSON.stringify(before.project.devices[0].transform)!==JSON.stringify(after.project.devices[0].transform),{before:before.project.devices[0].transform['rotation.y'].keys,after:after.project.devices[0].transform['rotation.y'].keys,issue:'MAN-002'});
   await key.click();await page.keyboard.press('Delete');
   const deleted=await saveProject(page,'03-keys-after-delete');
   check('MAN-002-delete-key',deleted.project.devices[0].transform['rotation.y'].keys.length<after.project.devices[0].transform['rotation.y'].keys.length,{issue:'MAN-002'});
   await seek(page,.65);
   const value=Number((await page.locator('.time-now').innerText()).replace('s',''));
   check('timeline-click-seek',Math.abs(value-2.6)<.03,{actual:value,expected:2.6});
   const ruler=await page.locator('.ruler').boundingBox();
   await page.mouse.move(ruler.x+ruler.width*.2,ruler.y+ruler.height/2);await page.mouse.down();
   await page.mouse.move(ruler.x+ruler.width*.8,ruler.y+ruler.height/2,{steps:12});await page.mouse.up();
   const dragTime=Number((await page.locator('.time-now').innerText()).replace('s',''));
   check('timeline-drag-seek',Math.abs(dragTime-3.2)<.03,{actual:dragTime,expected:3.2});
   await page.screenshot({path:path.join(out,'03-timeline.png')});
  });
  await runCase(browser,'04-media-and-save',async page=>{
   await page.locator('.project-name').fill('P1-01-two-devices');
   await duration(page,2);
   await changeDevice(page,'iPhone 17 Pro');
   await setNumber(page,0,-.45);
   await page.locator('.dropzone input[type=file]').setInputFiles(path.join(root,'assets','demo.mp4'));
   await page.waitForFunction(()=>document.querySelector('.dropzone-preview')?.videoWidth>0);
   check('video-media-import',true,{source:'assets/demo.mp4'});
   await page.getByRole('button',{name:'Add a second device',exact:true}).click();
   await changeDevice(page,'Google Pixel 9 Pro XL');
   await setNumber(page,0,.45);await setNumber(page,6,.85);
   await page.locator('.dropzone input[type=file]').setInputFiles(path.join(root,'assets','demo-screen.png'));
   await page.waitForFunction(()=>document.querySelector('img.dropzone-preview')?.naturalWidth>0);
   check('image-media-import',true,{source:'assets/demo-screen.png'});
   await page.getByRole('combobox',{name:'Add animation',exact:true}).selectOption('spin-y-360');
   const saved=await saveProject(page,'04-media-project');
   const kinds=saved.project.devices.map(d=>d.screen?.kind);
   const media=Object.keys(saved.entries).filter(n=>n.startsWith('media/'));
   check('multi-device-independent-media',JSON.stringify(kinds)===JSON.stringify(['video','image'])&&media.length===2,{models:saved.project.devices.map(d=>d.id),kinds,mediaEntries:media});
   const missingUrls=saved.project.devices.every(d=>!d.screen||!('url' in d.screen));
   check('saved-project-embeds-media-without-session-urls',missingUrls&&media.every(n=>saved.entries[n].length>0));
   mediaProject=saved.file;mediaProjectState=saved;
   await seek(page,0);await page.screenshot({path:path.join(out,'04-multi-media.png')});
  });
  await runCase(browser,'05-fresh-context-reopen',async page=>{
   if(!mediaProject)throw Error('Media project not available');
   await page.locator('.topbar input[type=file]').setInputFiles(mediaProject);
   await page.waitForFunction(()=>document.querySelectorAll('.device-row').length===2);
   await page.evaluate(()=>window.__PROMO_BRIDGE__.waitForReady());
   await page.waitForFunction(()=>document.querySelector('video.dropzone-preview')?.videoWidth>0);
   const opened=await saveProject(page,'05-reopened-project');
   const equal=JSON.stringify(opened.project)===JSON.stringify(mediaProjectState.project);
   const mediaNames=Object.keys(mediaProjectState.entries).filter(n=>n.startsWith('media/'));
   const mediaEqual=mediaNames.every(n=>opened.entries[n]&&hash(opened.entries[n])===hash(mediaProjectState.entries[n]));
   check('fresh-session-project-and-media-roundtrip',equal&&mediaEqual,{projectEqual:equal,mediaBytesEqual:mediaEqual,storageIsolation:'new browser context with empty OPFS/IndexedDB'});
   await seek(page,.5);
   const y=Number(await sections.transform(page).locator('.numfield-value').nth(4).innerText());
   check('reopened-animation-scrubs',Math.abs(y-180)<.2,{rotationYDegrees:y});
   await page.screenshot({path:path.join(out,'05-fresh-session.png')});
  });
  await runCase(browser,'06-export-cancel-and-mp4',async page=>{
   await page.locator('.project-name').fill('P1-01-1080p30');
   await duration(page,2);
   await changeDevice(page,'iPhone 17 Pro');
   await page.locator('.dropzone input[type=file]').setInputFiles(path.join(root,'assets','demo.mp4'));
   await page.waitForFunction(()=>document.querySelector('video.dropzone-preview')?.videoWidth>0);
   await page.getByRole('combobox',{name:'Add animation',exact:true}).selectOption('spin-y-360');
   await page.getByRole('button',{name:'Standard',exact:true}).click();
   const mp4=page.getByRole('button',{name:'MP4 (H.264)',exact:true});
   if(!await mp4.count()){note('1080p30-mp4-export','ENVIRONMENT_BLOCKED',{reason:'Browser H.264 encoder unavailable'});return;}
   await mp4.click();
   await page.getByRole('button',{name:'30 fps',exact:true}).click();
   let downloads=0;page.on('download',()=>downloads++);
   await page.getByRole('button',{name:'Export video (MP4 (H.264))',exact:true}).click();
   await page.getByRole('button',{name:/^Cancel/}).click({timeout:30000});
   await page.getByRole('button',{name:'Export video (MP4 (H.264))',exact:true}).waitFor({state:'visible',timeout:45000});
   await setNumber(page,0,.08);
   const editable=Number(await sections.transform(page).locator('.numfield-value').first().innerText())===.08;
   check('cancel-restores-editing',editable&&downloads===0,{editable,downloads});
   await setNumber(page,0,0);
   const exportedProject=await saveProject(page,'06-export-project');
   const references=[];
   for(const frame of [0,30,59])references.push({frame,...await preview(page,frame,'06-reference-'+String(frame).padStart(2,'0'))});
   report.previewReferences=references;write();
   await seek(page,.5);
   const download=page.waitForEvent('download',{timeout:180000});
   await page.getByRole('button',{name:'Export video (MP4 (H.264))',exact:true}).click();
   const timer=setInterval(async()=>{try{const text=await page.getByRole('button',{name:/^Cancel/}).innerText({timeout:500});console.log('EXPORT_PROGRESS '+text);}catch{}},8000);
   let dl;try{dl=await download;}finally{clearInterval(timer);}
   const file=path.join(out,'P1-01-1080p30.mp4');await dl.saveAs(file);
   const meta=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
   fs.writeFileSync(path.join(out,'06-ffprobe.json'),JSON.stringify(meta,null,2));
   const v=meta.streams.find(x=>x.codec_type==='video');
   check('1080p30-mp4-export',v.width===1920&&v.height===1080&&v.avg_frame_rate==='30/1'&&Number(v.nb_frames)===60&&Math.abs(Number(meta.format.duration)-2)<.05,{codec:v.codec_name,width:v.width,height:v.height,fps:v.avg_frame_rate,frames:v.nb_frames,duration:meta.format.duration,size:fs.statSync(file).size,artifact:path.basename(file),project:path.basename(exportedProject.file)});
   await page.getByRole('button',{name:'Export video (MP4 (H.264))',exact:true}).waitFor({state:'visible'});
   await seek(page,.25);check('editing-after-successful-export',Math.abs(Number((await page.locator('.time-now').innerText()).replace('s',''))-.5)<.03);
  });
  await runCase(browser,'07-no-encoder-fallback',async page=>{
   await duration(page,.5);
   const box=sections.export(page).locator('.row input[type=number]');
   await box.nth(0).fill('320');await box.nth(1).fill('180');
   await page.getByRole('button',{name:'Standard',exact:true}).click();
   const hint=page.getByText(/This browser can't encode video/);
   const hasHint=await hint.count()>0;
   const sequence=page.getByRole('button',{name:/^Export PNG sequence/});
   check('no-codec-fallback-is-visible',hasHint&&await sequence.count()>0,{simulation:'VideoEncoder absent in isolated context'});
   const pending=page.waitForEvent('download',{timeout:90000});
   await sequence.click();const dl=await pending,file=path.join(out,'07-fallback-frames.zip');await dl.saveAs(file);
   const entries=unzipSync(fs.readFileSync(file));
   check('no-codec-png-sequence-works',Object.keys(entries).length===15&&Object.keys(entries).every(n=>entries[n].length>100),{frames:Object.keys(entries).length,width:320,height:180});
  },()=>{Object.defineProperty(window,'VideoEncoder',{value:undefined,configurable:true});});
  await runCase(browser,'08-encoding-failure-feedback',async page=>{
   await duration(page,.5);
   await page.getByRole('button',{name:'Standard',exact:true}).click();
   const mp4=page.getByRole('button',{name:'MP4 (H.264)',exact:true});
   if(await mp4.count())await mp4.click();
   const exportButton=page.getByRole('button',{name:/^Export video/});
   if(!await exportButton.count()){note('encoding-failure-feedback','ENVIRONMENT_BLOCKED',{reason:'No supported format in injected failure context'});return;}
   await exportButton.click();
   await page.waitForTimeout(600);
   const alerts=await page.getByRole('alert').allTextContents();
   const errors=report.pageErrors.filter(x=>x.case==='08-encoding-failure-feedback');
   const busy=await page.getByRole('button',{name:/^Cancel/}).count();
   check('MAN-008-encoding-failure-has-visible-feedback',alerts.length>0,{simulation:'VideoEncoder.configure throws a deliberate diagnostic error',visibleAlerts:alerts,pageErrors:errors,busy,issue:'MAN-008'});
   check('encoding-failure-clears-busy-state',busy===0);
  },()=>{const Native=window.VideoEncoder;if(Native)window.VideoEncoder=class extends Native{configure(){throw new DOMException('P1-01 deliberately simulated encoder configuration failure','NotSupportedError');}};});
  await runCase(browser,'09-invalid-project-feedback',async page=>{
   const file=path.join(out,'09-invalid.mockup');fs.writeFileSync(file,zipSync({'readme.txt':strToU8('P1-01 invalid project fixture: project.json is missing')}));
   await page.locator('.topbar input[type=file]').setInputFiles(file);await page.waitForTimeout(500);
   const alerts=await page.getByRole('alert').allTextContents();
   check('MAN-008-invalid-project-visible-error',alerts.length>0,{visibleAlerts:alerts,pageErrors:report.pageErrors.filter(x=>x.case==='09-invalid-project-feedback'),issue:'MAN-008'});
   check('invalid-project-preserves-editor',await sections.transform(page).locator('.numfield-box').count()===7);
  });
  report.status=report.cases.some(x=>x.execution==='INCOMPLETE')?'INCOMPLETE':report.checks.some(x=>x.status==='FAIL')?'COMPLETED_WITH_FINDINGS':'PASS';
 }catch(e){report.status='ENVIRONMENT_BLOCKED';report.error=String(e);report.stack=e.stack;}
 finally{if(browser)await browser.close().catch(()=>{});write();console.log(JSON.stringify({status:report.status,checks:report.checks.length,cases:report.cases,failures:report.checks.filter(x=>x.status!=='PASS')}));}
})().catch(e=>{console.error(e);process.exitCode=1});

