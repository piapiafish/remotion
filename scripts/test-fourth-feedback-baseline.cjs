const fs=require('node:fs'),path=require('node:path');
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
 await p.evaluate(async()=>{window.S=(await import('/src/store/project.ts')).useProjectStore;window.T=await import('/src/timeline/sample.ts');window.O=await import('/src/timeline/objectEditing.ts');window.C=(await import('/src/store/cameraSession.ts')).useCameraSession;window.R=await import('/src/export/renderer.ts');window.F=await import('/src/export/frameRenderer.ts');window.V=await import('/src/media/screenVideo.ts');window.P=await import('/src/store/persist.ts');window.L=await import('/src/media/screenClips.ts');window.B=await import('/src/scene/solidBounds.ts')});
}
const ready=()=>p.evaluate(()=>window.__PROMO_BRIDGE__.waitForReady(20000));
async function init(){await p.getByRole('button',{name:/双机并排/}).first().click();await p.evaluate(()=>{const s=window.S.getState();s.setDuration(4);s.setOutput({width:1920,height:1080});s.setActiveDevice(0);s.setDeviceId('iphone-17-pro');s.renameObject('手机 A');s.setActiveDevice(1);s.setDeviceId('pixel-9-pro-xl');s.renameObject('手机 B');s.setActiveDevice(0)});await ready()}
const fixtureFile=path.join(root,'reports/current/p126-p134-implementation-20261104/browser-final/second-feedback-scene.mockup');
const fixtureZip=unzipSync(fs.readFileSync(fixtureFile)),fixtureProject=JSON.parse(strFromU8(fixtureZip['project.json']));
const fixtureVideos=fixtureProject.devices.map(d=>d.screen).filter(r=>r?.kind==='video').map(r=>({ref:r,buffer:Buffer.from(fixtureZip['media/'+r.id])}));
async function upload(index,name){const v=fixtureVideos[index%fixtureVideos.length],webm=v.buffer[0]===0x1a;await p.getByLabel('添加屏幕素材文件',{exact:true}).setInputFiles({name:name+(webm?'.webm':'.mp4'),mimeType:webm?'video/webm':'video/mp4',buffer:v.buffer});await p.waitForFunction(name=>window.S.getState().project.devices[window.S.getState().activeDevice].screenClips?.some(c=>c.name.startsWith(name)),name);await ready()}
(async()=>{try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--enable-webgl','--use-gl=angle','--enable-unsafe-swiftshader']});
 await session();await init();await p.evaluate(()=>window.S.getState().setDevicePosition([.8,.4,0]));
 const before=await p.evaluate(()=>window.T.sampleTimeline(window.S.getState().project,0).devices[0]);
 const board=await p.getByTestId('artboard').boundingBox();await p.mouse.move(board.x+board.width*.1,board.y+board.height*.1);await p.mouse.wheel(0,120);await p.waitForTimeout(300);
 const after=await p.evaluate(()=>window.T.sampleTimeline(window.S.getState().project,0).devices[0]);
 check('baseline-shrinking-phone-changes-x',Math.abs(before.position[0]-after.position[0])>.01,{before,after});
 await p.getByTestId('artboard').focus();const camera=await p.evaluate(()=>window.T.sampleTimeline(window.S.getState().project,0).camera);await p.keyboard.down('w');await p.waitForTimeout(300);await p.keyboard.up('w');
 const moved=await p.evaluate(()=>window.C.getState().view??window.T.sampleTimeline(window.S.getState().project,0).camera);
 check('baseline-selected-object-blocks-wasd',JSON.stringify(camera)===JSON.stringify(moved));
 check('baseline-repeated-playhead-heads',await p.locator('.playhead-handle').count()>1);
 await upload(0,'测试 A');await upload(1,'测试 B');await p.evaluate(()=>{const s=window.S.getState(),clips=s.project.devices[0].screenClips;s.updateScreenClip(clips[0].clipId,{displayRange:{start:0,end:1},playback:{start:0,stop:3}});s.updateScreenClip(clips[1].clipId,{displayRange:{start:2,end:4},playback:{start:2,stop:4}});s.setDuration(4)});
 check('baseline-packing-ignores-overlapping-playback',await p.evaluate(()=>window.L.packClips(window.S.getState().project.devices[0].screenClips).count===1));
 await p.evaluate(()=>{const s=window.S.getState(),c=s.project.devices[0].screenClips[0];s.updateScreenClip(c.clipId,{playback:{start:2,stop:2+1/30}})});
 const handles=await p.locator('.video-lane-group').first().locator('.video-play-handle').evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}}));
 check('baseline-one-frame-play-handles-overlap',handles.length===2&&handles[0].left<handles[1].right&&handles[1].left<handles[0].right&&handles[0].top<handles[1].bottom,{handles});
 await p.screenshot({path:path.join(out,'before-editor.png'),fullPage:true});report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1}finally{write();await browser?.close()}})();