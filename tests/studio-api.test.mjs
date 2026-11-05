import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createStudioApi, parseStoryboard, renderEnvironment } from '../services/studio-api/index.mjs';
import { deterministicPlan } from '../services/agent-orchestrator/planner.mjs';

const board = () => deterministicPlan({ width:540, height:960, brief:'智能分析；自动规划；精彩呈现' });
const headers = { 'Content-Type':'application/json', 'X-Promo-Studio':'1' };
async function until(callback) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) { const result = await callback(); if (result) return result; await new Promise(resolve => setTimeout(resolve, 10)); }
  throw new Error('Condition did not complete');
}

async function fixture(t, options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'promo studio 中文 & '));
  await mkdir(path.join(root,'assets'));
  await mkdir(path.join(root,'work'));
  await writeFile(path.join(root,'assets/demo.mp4'), Buffer.alloc(2048));
  await writeFile(path.join(root,'assets/music-demo.mp3'), Buffer.alloc(2048));
  await writeFile(path.join(root,'work/storyboard.json'), 'keep original');
  const calls = [];
  const pending = [];
  function spawnProcess(program, args, config) {
    const child = new EventEmitter();
    Object.assign(child, { stdout:new PassThrough(), stderr:new PassThrough(), exitCode:null, pid:12345 + calls.length });
    calls.push({ program,args,config });
    const finish = async ({ code=0, reportStatus='DONE', createVideo=true, error } = {}) => {
      if (child.exitCode !== null) return;
      const out = args[args.indexOf('--out') + 1];
      if (createVideo) await writeFile(path.join(out,'final.mp4'), Buffer.alloc(8192, 7));
      await writeFile(path.join(out,'render-report.json'), JSON.stringify({ status:reportStatus, compositor:'remotion',
        final:{ ok:createVideo }, jobs:[{id:'shot-001',status:'DONE'}], error }));
      child.stdout.end('test renderer stdout\n');
      child.stderr.end(code ? 'test dependency failure\n' : '');
      child.exitCode = code;
      child.emit('close', code);
    };
    pending.push({ child, finish });
    if (!options.hold) setImmediate(() => void finish(options.finish));
    return child;
  }
  let service;
  const config = { root, spawnProcess, inspect:() => ({ok:true}),
    environment:async () => ({...process.env, PYTHONUTF8:'1', NODE_BINARY:process.execPath}),
    terminate: child => { const job = pending.find(job => job.child===child); void job?.finish({code:1,reportStatus:'ERROR',createVideo:false}); }, ...options.api };
  service = await createStudioApi(config);
  const server = createServer((req,res) => service.middleware(req,res,() => { res.writeHead(404); res.end(); }));
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const url = `http://127.0.0.1:${server.address().port}/__studio__`;
  async function request(route, data, extra = {}) {
    const response = await fetch(url+route, data === undefined ? extra : { method:'POST',headers,body:JSON.stringify(data),...extra });
    return { response, value:await response.json() };
  }
  t.after(async () => {
    await service.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(root,{recursive:true,force:true});
  });
  return { root, url, request, calls, pending, service,
    restart: async () => { await service.close(); service = await createStudioApi(config); return service; } };
}

test('AI reply import accepts raw/BOM/fenced/prose/wrapped JSON and preserves quoted braces', () => {
  const value = board();
  value.overlays[0].text = '文字 { } 与 "引号" 和 \\ 路径';
  const raw = JSON.stringify(value);
  for (const source of [raw, '\uFEFF'+raw, '```json\n'+raw+'\n```', '这是你的方案：\n```json\n'+raw+'\n```\n可以开始制作。', JSON.stringify({storyboard:value})]) {
    assert.deepEqual(parseStoryboard(source), value);
  }
});

test('AI reply import rejects malformed, ambiguous, oversized and illegal-device content', () => {
  const raw=JSON.stringify(board());
  for (const source of ['', '这是一段提示词', '{not json}', raw+'\n'+raw]) assert.throws(() => parseStoryboard(source));
  assert.throws(() => parseStoryboard('x'.repeat(1024*1024+1)), { code:'BODY_TOO_LARGE' });
  const value=board(); value.shots[0].deviceId='invented-device';
  assert.throws(() => parseStoryboard(JSON.stringify(value)), error => error.code==='INVALID_STORYBOARD' && error.details[0].path.includes('deviceId'));
});

test('local import saves unique UTF-8 work files and preserves the previous default storyboard', async t => {
  const f=await fixture(t);
  const a=await f.request('/storyboards',{source:JSON.stringify(board())});
  const b=await f.request('/storyboards',{source:JSON.stringify(board())});
  assert.equal(a.response.status,201); assert.equal(a.value.status,'READY');
  assert.notEqual(a.value.id,b.value.id);
  assert.deepEqual(JSON.parse(await readFile(path.join(f.root,a.value.path),'utf8')),board());
  assert.equal(await readFile(path.join(f.root,'work/storyboard.json'),'utf8'),'keep original');
  assert.equal(f.calls.length,0);
  const download=await fetch(f.url+`/storyboards/${a.value.id}/json`);
  assert.match(download.headers.get('content-disposition'),/storyboard.json/);
  assert.deepEqual(await download.json(),board());
});

test('offline planning uses the existing validated planner without a model call', async t => {
  const f=await fixture(t);
  const {response,value}=await f.request('/plans',{brief:'智能分析；自动规划；精彩呈现',deviceId:'iphone-17-pro'});
  assert.equal(response.status,201);
  assert.equal(value.summary.seconds,15); assert.equal(value.summary.shots.length,3);
  assert.equal(value.summary.width,540); assert.equal(value.summary.height,960);
  assert.equal(value.storyboard.reasoning,'本地确定性导演模板；可修改分镜后再次运行');
  assert.equal((await f.request('/plans',{brief:'x',deviceId:'invalid'})).response.status,422);
});

test('missing media and unsafe paths fail before a storyboard or renderer is created', async t => {
  const f=await fixture(t);
  for (const uri of ['assets/missing.mp4','../outside.mp4','C:\\outside.mp4','https://example.com/a.mp4']) {
    const value=board(); value.assets[0].uri=uri;
    const result=await f.request('/storyboards',{source:JSON.stringify(value)});
    assert.equal(result.response.status,422);
  }
  assert.equal(f.calls.length,0);
  assert.deepEqual(await readdir(path.join(f.root,'work')),['storyboard.json']);
});

test('local API rejects foreign origins, missing explicit header, malformed/oversized JSON and invalid IDs', async t => {
  const f=await fixture(t);
  assert.equal((await f.request('/capabilities',undefined,{headers:{Origin:'https://other.example'}})).response.status,403);
  assert.equal((await f.request('/storyboards',{source:JSON.stringify(board())},{headers:{'Content-Type':'application/json'}})).response.status,415);
  for (const body of ['null','[]','broken']) {
    const response=await fetch(f.url+'/storyboards',{method:'POST',headers,body});
    assert.equal(response.status,400);
  }
  const large=await f.request('/storyboards',{source:'x'.repeat(1024*1024+1)});
  assert.equal(large.response.status,413);
  assert.equal((await f.request('/storyboards/not-an-id')).response.status,400);
  assert.equal(f.calls.length,0);
});

test('concurrent render clicks are idempotent and different storyboards render serially', async t => {
  const f=await fixture(t,{hold:true});
  const a=(await f.request('/storyboards',{source:JSON.stringify(board())})).value;
  const b=(await f.request('/storyboards',{source:JSON.stringify(board())})).value;
  await f.restart(); // Also exercise concurrent initial loads from disk.
  await Promise.all(Array.from({length:5},()=>f.request(`/storyboards/${a.id}/render`,{})));
  await until(()=>f.calls.length===1);
  const queued=await f.request(`/storyboards/${b.id}/render`,{});
  assert.equal(queued.value.status,'QUEUED'); assert.equal(f.calls.length,1);
  const first=f.calls[0];
  assert.equal(first.program,process.execPath); assert.equal(first.config.shell,false);
  assert.equal(first.config.cwd,f.root); assert.match(first.args[0],/cli\.mjs$/);
  assert.equal(first.args[first.args.indexOf('--storyboard')+1],path.join(f.root,a.path));
  await f.pending[0].finish();
  await until(()=>f.calls.length===2);
  await f.pending[1].finish();
  await until(async()=> (await f.request(`/storyboards/${b.id}`)).value.status==='DONE');
  assert.equal((await f.request(`/storyboards/${a.id}`)).value.status,'DONE');
});

test('failure logs stay visible, no failed video link is exposed, and retry is allowed', async t => {
  const f=await fixture(t,{hold:true});
  const saved=(await f.request('/storyboards',{source:JSON.stringify(board())})).value;
  await f.request(`/storyboards/${saved.id}/render`,{});
  await until(()=>f.pending.length===1);
  await f.pending[0].finish({code:1,createVideo:false,reportStatus:'ERROR',error:{code:'REMOTION_MISSING',message:'Install Remotion first'}});
  const failed=await until(async()=>{const s=(await f.request(`/storyboards/${saved.id}`)).value;return s.status==='ERROR'&&s;});
  assert.equal(failed.error.code,'REMOTION_MISSING'); assert.equal(failed.videoUrl,undefined);
  assert.match(failed.logTail,/test dependency failure/);
  assert.equal((await f.request(`/storyboards/${saved.id}/video`)).response.status,409);
  await f.request(`/storyboards/${saved.id}/render`,{});
  await until(()=>f.pending.length===2); await f.pending[1].finish();
  await until(async()=> (await f.request(`/storyboards/${saved.id}`)).value.status==='DONE');
});

test('an exit code of zero without a verified final MP4 is still a failure', async t => {
  const f=await fixture(t,{finish:{createVideo:false},api:{inspect:()=>({ok:false})}});
  const saved=(await f.request('/storyboards',{source:JSON.stringify(board())})).value;
  await f.request(`/storyboards/${saved.id}/render`,{});
  const failed=await until(async()=>{const s=(await f.request(`/storyboards/${saved.id}`)).value;return s.status==='ERROR'&&s;});
  assert.equal(failed.error.code,'FINAL_NOT_VERIFIED'); assert.equal(failed.videoUrl,undefined);
});

test('completed work survives restart and the video endpoint supports download, HEAD and byte ranges', async t => {
  const f=await fixture(t);
  const saved=(await f.request('/storyboards',{source:JSON.stringify(board())})).value;
  await f.request(`/storyboards/${saved.id}/render`,{});
  await until(async()=> (await f.request(`/storyboards/${saved.id}`)).value.status==='DONE');
  await f.restart();
  const restored=(await f.request(`/storyboards/${saved.id}`)).value;
  assert.equal(restored.status,'DONE'); assert.ok(restored.videoUrl);
  const url=f.url.replace('/__studio__','')+restored.videoUrl;
  const response=await fetch(url+'?download=1');
  assert.match(response.headers.get('content-disposition'),/final.mp4/);
  assert.equal((await response.arrayBuffer()).byteLength,8192);
  const head=await fetch(url,{method:'HEAD'}); assert.equal(head.status,200); assert.equal(head.headers.get('content-length'),'8192');
  const range=await fetch(url,{headers:{Range:'bytes=100-199'}}); assert.equal(range.status,206);
  assert.equal(range.headers.get('content-range'),'bytes 100-199/8192'); assert.equal((await range.arrayBuffer()).byteLength,100);
  const suffix=await fetch(url,{headers:{Range:'bytes=-32'}}); assert.equal(suffix.status,206); assert.equal((await suffix.arrayBuffer()).byteLength,32);
  assert.equal((await fetch(url,{headers:{Range:'bytes=99999-'}})).status,416);
});

test('stopping the local service marks the active task interrupted', async t => {
  const f=await fixture(t,{hold:true});
  const saved=(await f.request('/storyboards',{source:JSON.stringify(board())})).value;
  await f.request(`/storyboards/${saved.id}/render`,{});
  await until(()=>f.pending.length===1);
  await f.service.close();
  const state=JSON.parse(await readFile(path.join(f.root,saved.path.replace('storyboard.json','state.json')),'utf8'));
  assert.equal(state.status,'INTERRUPTED');
  await f.restart();
  assert.equal((await f.request(`/storyboards/${saved.id}`)).value.status,'INTERRUPTED');
});

test('symlinks cannot write work files or read media outside the project', async t => {
  const f=await fixture(t);
  const outside=await mkdtemp(path.join(os.tmpdir(),'promo-outside-'));
  t.after(()=>rm(outside,{recursive:true,force:true}));
  await writeFile(path.join(outside,'video.mp4'),Buffer.alloc(2048));
  try { await symlink(path.join(outside,'video.mp4'),path.join(f.root,'assets/linked.mp4')); }
  catch(error) { if(error.code==='EPERM'){ t.skip('OS does not allow symlinks'); return; } throw error; }
  const value=board(); value.assets[0].uri='assets/linked.mp4';
  assert.equal((await f.request('/storyboards',{source:JSON.stringify(value)})).response.status,422);
  await symlink(outside,path.join(f.root,'work/studio'),'dir');
  const result=await f.request('/storyboards',{source:JSON.stringify(board())});
  assert.equal(result.value.error.code,'UNSAFE_WORKSPACE');
  assert.deepEqual(await readdir(outside),['video.mp4']);
});

test('rendering prefers the project Python environment over a changed global Python', async t => {
  const root=await mkdtemp(path.join(os.tmpdir(),'promo-python-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const python=path.join(root,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
  await mkdir(path.dirname(python),{recursive:true}); await writeFile(python,'');
  const env=await renderEnvironment(root,{PYTHON:'C:\\Python315\\python.exe',CHROME_PATH:'existing-browser'});
  assert.equal(env.PYTHON,python); assert.equal(env.PYTHONUTF8,'1'); assert.equal(env.NODE_BINARY,process.execPath);
});
