const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'project'),out=path.join(__dirname,'evidence','browser');
const {chromium}=require('D:/remotion/p0/MultiAgent-3D-Promo-Studio/.venv/Lib/site-packages/playwright/driver/package');
const {unzipSync,strFromU8,zipSync,strToU8}=require(path.join(root,'node_modules/fflate'));
const THREE=require(path.join(root,'node_modules/three'));
const dist=path.join(root,'dist');fs.mkdirSync(out,{recursive:true});
const report={date:new Date().toISOString(),method:'Actual P1-02 production build; Chrome; local route fulfillment without TCP. UI actions and actual file downloads. Vite/API network not tested.',checks:[],cases:[],pageErrors:[],requestFailures:[],status:'RUNNING'};
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
 const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>{report.pageErrors.push({label,error:String(error)});write();});
 await page.goto('http://127.0.0.1:4187/?automation=1',{waitUntil:'networkidle',timeout:45000});
 await page.getByRole('button',{name:'Movie',exact:true}).click();await ready(page);return {context,page};
}
async function run(browser,label,fn){let context,page;const started=Date.now();console.log('START '+label);try{({context,page}=await session(browser,label));await fn(page,context);report.cases.push({label,status:'COMPLETED',seconds:(Date.now()-started)/1000});}catch(error){check(label,false,{execution:'INCOMPLETE',error:String(error),stack:error.stack});report.cases.push({label,status:'INCOMPLETE'});}finally{await context?.close().catch(()=>{});write();}}
const position=d=>['x','y','z'].map(a=>d.transform['position.'+a]?.keys[0]?.v??0);
const activeIndex=async p=>{const el=p.locator('.device-row.active .device-row-index');return await el.count()?Number(await el.innerText())-1:0;};
let base,media;
(async()=>{let browser;try{
 browser=await chromium.launch({headless:true,timeout:30000,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--enable-webgl','--use-gl=angle','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 report.browser=browser.version();
 await run(browser,'01-device-lifecycle',async p=>{
  base=(await save(p,'01-base')).project;
  await p.getByRole('button',{name:'Add a second device',exact:true}).click();
  const added=await save(p,'01-added');
  check('add-selects-new-device',await activeIndex(p)===1&&added.project.devices.length===2);
  check('add-visible-offset',JSON.stringify(position(added.project.devices[0]))!==JSON.stringify(position(added.project.devices[1])));
  await p.getByTitle(/^Undo \(/).click();
  check('MAN-003-undo-does-not-crash',await transform(p).locator('.numfield-box').count()===7&&await p.locator('.device-row').count()===0);
  await p.getByTitle(/^Redo \(/).click();
  check('redo-restores-valid-editing',await p.locator('.device-row').count()===2&&await transform(p).locator('.numfield-box').count()===7);
  await p.locator('.device-row').nth(1).getByTitle('Duplicate',{exact:true}).click();
  check('duplicate-selects-copy',await activeIndex(p)===2&&await p.locator('.device-row[aria-current="true"]').count()===1);
  await p.getByRole('button',{name:'Add device',exact:true}).click();
  await p.getByRole('button',{name:'Add device',exact:true}).click();
  await p.getByTitle(/^Undo \(/).click();
  check('first-rapid-add-undo-is-one-action',await p.locator('.device-row').count()===4);
  await p.getByTitle(/^Undo \(/).click();
  check('second-rapid-add-undo-is-one-action',await p.locator('.device-row').count()===3);
  const before=await save(p,'01-before-remove'),id=before.project.devices[await activeIndex(p)].instanceId;
  await p.locator('.device-row').nth(0).getByTitle('Remove',{exact:true}).click();
  const removed=await save(p,'01-removed');
  check('remove-other-row-retains-instance',removed.project.devices[await activeIndex(p)].instanceId===id&&removed.project.devices.length===2);
  await setNumber(p,6,0.65);
  const edited=await save(p,'01-edited'),index=await activeIndex(p);
  check('editing-after-removal-targets-selected-device',edited.project.devices[index].transform.scale.keys[0].v===0.65&&JSON.stringify(edited.project.devices[1-index])===JSON.stringify(removed.project.devices[1-index]));
  await p.getByTitle(/^Undo \(/).click();await p.getByTitle(/^Undo \(/).click();
  check('undo-remove-retains-selection-by-instance',(await save(p,'01-restored')).project.devices[await activeIndex(p)].instanceId===id);
  await p.getByTitle(/^Redo \(/).click();
  check('redo-remove-keeps-editor-usable',await transform(p).locator('.numfield-box').count()===7&&await p.locator('.device-row').count()===2);
  await p.evaluate(project=>window.__PROMO_BRIDGE__.loadProject(project),base);
  check('bridge-project-replacement-resets-selection',await transform(p).locator('.numfield-box').count()===7);
 });
 await run(browser,'02-camera-aware-placement',async p=>{
  const variants=[
   {name:'front',camera:[0,0,3.2],output:{width:1920,height:1080},orientation:'portrait'},
   {name:'side',camera:[3.2,0,0],output:{width:1920,height:1080},orientation:'portrait'},
   {name:'portrait-canvas',camera:[-2.2,.9,2.4],output:{width:1080,height:1920},orientation:'landscape'}
  ];
  for(const v of variants){
   const project=structuredClone(base);project.output=v.output;project.camera.preset=null;project.devices[0].orientation=v.orientation;
   ['x','y','z'].forEach((a,i)=>project.camera.tracks['position.'+a].keys[0].v=v.camera[i]);
   await openFixture(p,project,'02-fixture-'+v.name);
   await p.getByRole('button',{name:'Add a second device',exact:true}).click();await ready(p);
   const added=(await save(p,'02-'+v.name)).project;
   const camera=new THREE.PerspectiveCamera(project.camera.fov,v.output.width/v.output.height,.01,1000);camera.position.fromArray(v.camera);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
   const centers=added.devices.map(d=>new THREE.Vector3(...position(d)).project(camera).toArray());
   const separated=Math.hypot(centers[0][0]-centers[1][0],centers[0][1]-centers[1][1])>.12;
   const visible=centers[1].every(Number.isFinite)&&Math.abs(centers[1][0])<1&&Math.abs(centers[1][1])<1;
   check('camera-aware-placement-'+v.name,separated&&visible,{centers,output:v.output});
   await preview(p,0,'02-'+v.name+'-frame');
  }
 });
 await run(browser,'03-real-media-animated-duplicate',async p=>{
  await p.locator('.time-duration').fill('1');await p.locator('.time-duration').press('Tab');
  await p.locator('.device-open').click();await p.getByRole('button',{name:'iPhone 17 Pro',exact:true}).click();await ready(p);
  await setNumber(p,6,.75);
  await p.locator('.dropzone input[type=file]').setInputFiles(path.join(root,'assets','demo.mp4'));await p.waitForFunction(()=>document.querySelector('video.dropzone-preview')?.videoWidth>0);
  await p.getByRole('combobox',{name:'Add animation',exact:true}).selectOption('spin-y-360');
  const before=await save(p,'03-before-duplicate');
  await p.getByRole('button',{name:'Add a second device',exact:true}).click();
  await p.locator('.device-row').nth(0).getByTitle('Duplicate',{exact:true}).click();
  await p.locator('.device-row').nth(2).getByTitle('Remove',{exact:true}).click();
  await ready(p);
  media=await save(p,'03-animated-duplicate');
  const [a,b]=media.project.devices;
  check('duplicate-preserves-original-animation-and-media',JSON.stringify(a)===JSON.stringify(before.project.devices[0])&&a.instanceId!==b.instanceId&&JSON.stringify(a.screen)===JSON.stringify(b.screen)&&JSON.stringify(a.transform['rotation.y'])===JSON.stringify(b.transform['rotation.y']));
  const mediaNames=Object.keys(media.entries).filter(n=>n.startsWith('media/'));
  check('duplicate-media-serialized-once',mediaNames.length===1&&media.entries[mediaNames[0]].length>0);
  check('animated-copy-has-distinct-pose',JSON.stringify(position(a))!==JSON.stringify(position(b)));
  await preview(p,0,'03-duplicate-frame');
 });
 await run(browser,'04-fresh-session-and-export',async p=>{
  if(!media)throw new Error('Media fixture unavailable');
  await p.locator('.topbar input[type=file]').setInputFiles(media.file);await ready(p);
  const reopened=await save(p,'04-reopened');
  const mediaNames=Object.keys(media.entries).filter(n=>n.startsWith('media/'));
  check('fresh-session-project-and-media-roundtrip',JSON.stringify(reopened.project)===JSON.stringify(media.project)&&mediaNames.every(n=>hash(reopened.entries[n])===hash(media.entries[n])));
  await p.locator('.device-row').nth(1).locator('.device-row-name').click();
  await setNumber(p,1,.08);
  const exported=await save(p,'04-export-project');
  check('restored-copy-remains-independently-editable',JSON.stringify(exported.project.devices[0])===JSON.stringify(media.project.devices[0]));
  report.references=[];
  for(const frame of [0,15,29]){const file=await preview(p,frame,'04-reference-'+frame);report.references.push({frame,file});write();}
  await p.getByRole('button',{name:'Standard',exact:true}).click();await p.getByRole('button',{name:'30 fps',exact:true}).click();await p.getByRole('button',{name:'MP4 (H.264)',exact:true}).click();
  const pending=p.waitForEvent('download',{timeout:180000});
  const timer=setInterval(()=>console.log('EXPORT_IN_PROGRESS'),10000);
  try{await p.getByRole('button',{name:'Export video (MP4 (H.264))',exact:true}).click();const dl=await pending;await dl.saveAs(path.join(out,'P1-02-dual-device-1080p30.mp4'));}finally{clearInterval(timer);}
  const file=path.join(out,'P1-02-dual-device-1080p30.mp4');
  const meta=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));fs.writeFileSync(path.join(out,'04-ffprobe.json'),JSON.stringify(meta,null,2));
  const v=meta.streams.find(s=>s.codec_type==='video');
  check('dual-device-1080p30-export',v.width===1920&&v.height===1080&&v.avg_frame_rate==='30/1'&&Number(v.nb_frames)===30&&Math.abs(Number(meta.format.duration)-1)<.05,{width:v.width,height:v.height,codec:v.codec_name,frames:v.nb_frames,fps:v.avg_frame_rate,duration:meta.format.duration});
  await setNumber(p,6,.7);check('editing-after-export',Number(await transform(p).locator('.numfield-value').nth(6).innerText())===.7);
 });
 check('no-unhandled-page-errors',report.pageErrors.length===0,{pageErrors:report.pageErrors});
 check('all-local-assets-loaded',report.requestFailures.length===0,{failures:report.requestFailures});
 report.status=report.cases.some(c=>c.status==='INCOMPLETE')?'INCOMPLETE':report.checks.some(c=>c.status!=='PASS')?'FAIL':'PASS';
}catch(error){report.status='ENVIRONMENT_BLOCKED';report.error=String(error);report.stack=error.stack;}finally{await browser?.close().catch(()=>{});write();console.log(JSON.stringify({status:report.status,cases:report.cases,checks:report.checks.length,failures:report.checks.filter(c=>c.status!=='PASS')}));if(report.status!=='PASS')process.exitCode=1;}})();

