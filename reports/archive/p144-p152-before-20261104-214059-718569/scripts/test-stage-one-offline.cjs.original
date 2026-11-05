const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.OFFLINE_OUT||path.join(root,'output','offline-stage-one-'+Date.now()));
const source=process.env.SOURCE_MOCKUP||path.join(root,'reports/current/p107-p109-20261102/workflow/authored.mockup'),dist=path.join(root,'dist');
const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH||path.join(root,'.venv','Lib','site-packages','playwright','driver','package'));
const {unzipSync,zipSync,strFromU8,strToU8}=require(path.join(root,'node_modules/fflate'));
fs.mkdirSync(out,{recursive:true});
const report={date:new Date().toISOString(),status:'RUNNING',method:'Actual production build supplied from local files only. Every page request is intercepted; non-local requests are denied. No Vite, API, recording helper, source imports or external page connections.',checks:[],pageErrors:[],deniedRequests:[],exports:[]};
const write=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
function check(id,pass,detail={}){report.checks.push({id,status:pass?'PASS':'FAIL',...detail});write();console.log((pass?'PASS ':'FAIL ')+id)}
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function ready(p){await p.evaluate(()=>window.__PROMO_BRIDGE__.waitForReady())}
async function open(p,file){await p.locator('.topbar input[type=file]').setInputFiles(file);await ready(p)}
async function save(p,name){const waiting=p.waitForEvent('download');await p.getByTitle(/^Save \.mockup/).click();const dl=await waiting,file=path.join(out,name+'.mockup');await dl.saveAs(file);const entries=unzipSync(fs.readFileSync(file));return{file,entries,project:JSON.parse(strFromU8(entries['project.json']))}}
async function standard(p){await p.getByRole('button',{name:'Standard',exact:true}).click();await p.getByRole('button',{name:'MP4 (H.264)',exact:true}).click()}
async function exportClip(p,name){
 const started=Date.now(),timeout=1200000;
 const pending=p.waitForEvent('download',{timeout});pending.catch(()=>{});
 const failure=p.getByRole('button',{name:'重试导出',exact:true}).waitFor({state:'visible',timeout}).then(async()=>{throw new Error('Visible export failure: '+await p.getByRole('alert').allTextContents())});failure.catch(()=>{});
 const cdp=await p.context().newCDPSession(p);await cdp.send('Performance.enable');
 let live=true;const samples=[],progress=[];
 const monitor=(async()=>{while(live){try{const data=await cdp.send('Performance.getMetrics');const metrics=Object.fromEntries(data.metrics.map(m=>[m.name,m.value]));samples.push({time:Date.now(),jsHeap:metrics.JSHeapUsedSize});const width=await p.locator('.export-progress-bar').getAttribute('style',{timeout:2000}).catch(()=>null);if(width){progress.push({time:Date.now(),style:width});if(progress.length%10===0)console.log(name+' '+width)}}catch{}await new Promise(r=>setTimeout(r,1000))}})();
 try {
   await p.getByRole('button',{name:'Export video (MP4 (H.264))',exact:true}).click();
   const dl=await Promise.race([pending,failure]),file=path.join(out,name+'.mp4');await dl.saveAs(file);
   const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-count_frames','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
   fs.writeFileSync(path.join(out,name+'-ffprobe.json'),JSON.stringify(probe,null,2));
   const item={name,file:path.basename(file),seconds:(Date.now()-started)/1000,bytes:fs.statSync(file).size,peakSampledJsHeap:Math.max(0,...samples.map(s=>s.jsHeap||0)),samples,progress,probe};
   report.exports.push(item);write();return item;
 } finally {live=false;await monitor;await cdp.detach()}
}
async function preview(p,index,name){const data=await p.evaluate(i=>window.__PROMO_BRIDGE__.previewFrame(i,'standard'),index);fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(data.split(',')[1],'base64'))}
(async()=>{let browser;try{
 if(!source)throw new Error('Set SOURCE_MOCKUP to an existing authored .mockup');
 const original=unzipSync(fs.readFileSync(source)),base=JSON.parse(strFromU8(original['project.json']));
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',downloadsPath:path.join(out,'downloads'),args:['--no-sandbox','--enable-webgl','--use-gl=angle','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-sync','--metrics-recording-only','--disable-domain-reliability','--no-pings','--disable-client-side-phishing-detection']});report.browser=browser.version();
 const context=await browser.newContext({viewport:{width:1440,height:1040},acceptDownloads:true,serviceWorkers:'block'});
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.hdr':'application/octet-stream','.glb':'model/gltf-binary','.svg':'image/svg+xml','.png':'image/png'};
 await context.route('**/*',async r=>{try{const u=new URL(r.request().url());if(!['127.0.0.1','localhost'].includes(u.hostname)){report.deniedRequests.push(u.origin);write();return r.abort()}const rel=decodeURIComponent(u.pathname).replace(/^\/+/,'')||'index.html',file=path.resolve(dist,rel);if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))return r.fulfill({status:404,body:'missing local file'});return r.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)})}catch{return r.abort()}});
 const p=await context.newPage();p.setDefaultTimeout(25000);p.on('pageerror',e=>{report.pageErrors.push(String(e));write()});p.on('dialog',d=>d.accept());
 await p.goto('http://127.0.0.1:4199/?automation=1',{waitUntil:'networkidle'});await p.getByRole('button',{name:'Movie',exact:true}).click();await open(p,source);
 const restored=await save(p,'restored');check('fresh-production-context-restores-engineering-and-media',JSON.stringify(restored.project)===JSON.stringify(base)&&Object.keys(original).filter(n=>n.startsWith('media/')).every(n=>hash(original[n])===hash(restored.entries[n])));
 await p.getByLabel('Project name',{exact:true}).fill('Stage one production revision');await p.locator('.device-row').nth(1).locator('.device-row-name').click();const start=p.getByLabel('Timeline start',{exact:true});await start.fill('1.3');await start.press('Tab');await p.getByTitle(/^Undo/).click();check('reopened-timing-edit-undo',await start.inputValue()==='1.1');await p.getByTitle(/^Redo/).click();const revised=await save(p,'revised');check('reopened-revision-preserves-other-device',JSON.stringify(revised.project.devices[0])===JSON.stringify(base.devices[0]));
 await standard(p);const re=await exportClip(p,'revised-short');check('reopened-modified-document-exports-1080p30',re.probe.streams[0].width===1920&&re.probe.streams[0].height===1080&&re.probe.streams[0].nb_read_frames==='120');
 for(const duration of [30,60]){
  const long=structuredClone(base);long.name='Stage-one-'+duration+'s';long.duration=duration;for(const d of long.devices){for(const t of Object.values(d.transform))for(const k of t.keys)k.t*=duration/4;d.screenPlayback.loop=true;d.screenPlayback.start*=duration/4}
  const file=path.join(out,'scene-'+duration+'s.mockup');fs.writeFileSync(file,zipSync({...original,'project.json':strToU8(JSON.stringify(long))}));await open(p,file);await standard(p);
  const result=await exportClip(p,'dual-'+duration+'s'),st=result.probe.streams[0];check(duration+'s-dual-device-1080p30-all-frames',st.width===1920&&st.height===1080&&st.r_frame_rate==='30/1'&&Number(st.nb_read_frames)===duration*30,{seconds:result.seconds,peakSampledJsHeap:result.peakSampledJsHeap});
  for(const i of [0,duration*15,duration*30-1])await preview(p,i,duration+'s-reference-'+i);
 }
 report.status=report.checks.every(c=>c.status==='PASS')&&report.pageErrors.length===0?'PASS':'FAIL';if(report.status!=='PASS')process.exitCode=1;
 await context.close();
}catch(error){report.status='INCOMPLETE';report.error=String(error);report.stack=error.stack;console.error(error);process.exitCode=1}finally{write();await browser?.close()}})();

