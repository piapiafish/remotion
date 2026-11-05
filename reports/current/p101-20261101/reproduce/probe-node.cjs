const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('D:/remotion/p0/MultiAgent-3D-Promo-Studio/.venv/lib/site-packages/playwright/driver/package');
const audit=__dirname, dist=path.join(audit,'project','dist'), out=path.join(audit,'evidence','node-browser');
fs.mkdirSync(out,{recursive:true});
const report={method:'Existing Playwright JavaScript API; unmodified production build served by local route fulfillment without a TCP server',status:'RUNNING',errors:[],requests:[]};
const save=()=>fs.writeFileSync(path.join(out,'probe.json'),JSON.stringify(report,null,2));
(async()=>{
 let browser;
 try {
  console.log('NODE_SDK_READY');
  browser=await chromium.launch({headless:true,timeout:30000,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--enable-webgl','--use-gl=angle','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  console.log('BROWSER_LAUNCHED '+browser.version());
  report.browser=browser.version();
  const context=await browser.newContext({viewport:{width:1440,height:960},acceptDownloads:true});
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.hdr':'application/octet-stream','.glb':'model/gltf-binary','.svg':'image/svg+xml'};
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname!=='127.0.0.1'){report.requests.push({url:u.origin+u.pathname,status:'ABORTED_EXTERNAL'});return route.abort();}
   const rel=decodeURIComponent(u.pathname).replace(/^\/+/, '')||'index.html';
   const f=path.resolve(dist,rel);
   if(!f.startsWith(dist+path.sep)){return route.abort();}
   if(!fs.existsSync(f)){report.requests.push({path:rel,status:404});return route.fulfill({status:404,body:'Not found'});}
   report.requests.push({path:rel,status:200});
   await route.fulfill({status:200,contentType:types[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)});
  });
  const page=await context.newPage();
  page.on('pageerror',e=>{report.errors.push(String(e));save()});
  await page.goto('http://127.0.0.1:4187/?automation=1',{waitUntil:'networkidle',timeout:30000});
  await page.getByRole('button',{name:'Movie',exact:true}).click({timeout:10000});
  await page.waitForFunction(()=>!!window.__PROMO_BRIDGE__,{timeout:15000});
  await page.evaluate(()=>window.__PROMO_BRIDGE__.waitForReady());
  report.title=await page.title();
  report.bodyText=(await page.locator('body').innerText()).slice(0,1000);
  report.capabilities=await page.evaluate(()=>({secure:isSecureContext,videoEncoder:typeof VideoEncoder,webgl:!!document.querySelector('canvas')?.getContext('webgl2')}));
  await page.screenshot({path:path.join(out,'editor.png')});
  report.status=report.errors.length?'FAIL':'PASS';
  await context.close();
 } catch(e){report.status='ENVIRONMENT_BLOCKED';report.error=String(e);report.stack=e.stack;}
 finally {if(browser)await browser.close().catch(()=>{});save();console.log(JSON.stringify(report));}
})().catch(e=>{console.error(e);process.exitCode=1});

