/** Local editor -> existing Video DSL/CLI. No model calls or shell commands. */
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir, readFile, realpath, rename, stat, writeFile, open } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import path from 'node:path';
import { assertStoryboard, safeAssetUri } from '../../packages/video-schema/index.mjs';
import { deterministicPlan } from '../agent-orchestrator/planner.mjs';
import { inspectMedia } from '../agent-orchestrator/critic.mjs';

const PREFIX = '/__studio__';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const LIMIT = 1024 * 1024;
const ACTIVE = new Set(['QUEUED', 'RENDERING']);
const fault = (code, message, status = 400, details) => Object.assign(new Error(message), { code, status, details });

function validate(board) {
  try { return assertStoryboard(board); }
  catch (error) { throw fault('INVALID_STORYBOARD', `分镜校验失败：${error.message}`, 422, error.details); }
}

/** Accept raw JSON, a JSON code block or prose surrounding one JSON object. */
export function parseStoryboard(source) {
  if (typeof source !== 'string' || !source.trim()) throw fault('EMPTY_STORYBOARD', '请粘贴 AI 返回的分镜 JSON，或选择 JSON 文件。');
  if (Buffer.byteLength(source, 'utf8') > LIMIT) throw fault('BODY_TOO_LARGE', '方案内容不能超过 1 MiB。', 413);
  const text = source.replace(/^\uFEFF/, '').trim();
  let objects;
  try { objects = [JSON.parse(text)]; }
  catch {
    objects = [];
    let start = -1, depth = 0, quoted = false, escaped = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (start < 0) { if (char === '{') { start = i; depth = 1; } continue; }
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === '{') depth++;
      else if (char === '}' && --depth === 0) {
        try { objects.push(JSON.parse(text.slice(start, i + 1))); } catch { /* Not JSON. */ }
        start = -1;
      }
      if (objects.length > 20) throw fault('AMBIGUOUS_STORYBOARD', '回复中包含太多对象，请只保留一份分镜方案。');
    }
  }
  const boards = objects.map(value => value?.storyboard ?? value).filter(value => value?.schemaVersion || value?.shots);
  if (boards.length > 1) throw fault('AMBIGUOUS_STORYBOARD', '检测到多份分镜，请只导入其中一份。');
  if (!boards.length) throw fault('INVALID_STORYBOARD_JSON', '未找到 Video DSL 分镜 JSON。请导入 AI 生成的方案，字段应包含 schemaVersion、canvas、assets 和 shots。', 422);
  return validate(boards[0]);
}

function localRequest(req) {
  const host = String(req.headers.host || '');
  let url;
  try { url = new URL(`http://${host}`); } catch { return false; }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return false;
  const address = req.socket.remoteAddress;
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) return false;
  const origin = req.headers.origin;
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.host !== host) return false;
    } catch { return false; }
  }
  return true;
}

async function requestJson(req) {
  if (!req.headers['content-type']?.startsWith('application/json') || req.headers['x-promo-studio'] !== '1') {
    throw fault('INVALID_REQUEST', '请从本机编辑器提交方案。', 415);
  }
  const chunks = []; let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > LIMIT) throw fault('BODY_TOO_LARGE', '请求内容不能超过 1 MiB。', 413);
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('object required');
    return value;
  }
  catch { throw fault('INVALID_JSON', '请求不是有效的 JSON。'); }
}

function sendJson(res, code, value) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
}

async function json(file, value) {
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  await rename(temp, file);
}

function stopChild(child) {
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, shell: false, stdio: 'ignore' });
    killer.on('error', () => child.kill());
  } else {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill(); }
  }
}

export async function renderEnvironment(base, sourceEnv = process.env) {
  const env = { ...sourceEnv, PYTHONUTF8: '1', NODE_BINARY: process.execPath };
  const python = path.join(base, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  if (existsSync(python)) env.PYTHON = python;
  if (!env.CHROME_PATH) {
    const installed = [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    ].find(file => existsSync(file));
    if (installed) env.CHROME_PATH = installed;
    else {
      // Share the already installed Playwright browser with Remotion too.
      try {
        const { stdout } = await promisify(execFile)(env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),
          ['-c', 'from playwright.sync_api import sync_playwright; p=sync_playwright().start(); print(p.chromium.executable_path); p.stop()'],
          { env, encoding: 'utf8', timeout: 15000, windowsHide: true });
        const candidate = stdout.trim();
        if (existsSync(candidate)) env.CHROME_PATH = candidate;
      } catch { /* The worker reports missing Python/Playwright clearly. */ }
    }
  }
  return env;
}

export async function createStudioApi({ root, spawnProcess = spawn, inspect = inspectMedia, terminate = stopChild, environment = renderEnvironment } = {}) {
  const base = await realpath(root);
  const records = new Map();
  const loading = new Map();
  const queue = [];
  let running = null, closed = false, pumping = false, activeTask = null;
  const within = file => file.startsWith(base + path.sep);
  const relative = file => path.relative(base, file).split(path.sep).join('/');

  async function directory(dir) {
    let ancestor = dir;
    while (!existsSync(ancestor)) ancestor = path.dirname(ancestor);
    const resolved = await realpath(ancestor);
    if (resolved !== base && !within(resolved)) throw fault('UNSAFE_WORKSPACE', '工作目录必须位于当前项目内部。', 422);
    await mkdir(dir, { recursive: true });
    if (!within(await realpath(dir))) throw fault('UNSAFE_WORKSPACE', '工作目录必须位于当前项目内部。', 422);
    return dir;
  }

  async function checkAssets(board) {
    for (const [i, asset] of board.assets.entries()) {
      const full = path.resolve(base, asset.uri);
      if (!safeAssetUri(asset.uri) || !within(full)) throw fault('ASSET_PATH_UNSAFE', '素材必须使用项目内的相对路径。', 422);
      try {
        if (!within(await realpath(full)) || !(await stat(full)).isFile()) throw new Error('unsafe');
      } catch {
        throw fault('ASSET_MISSING_OR_UNSAFE', `找不到素材：${asset.uri}。请将对应素材放入项目，或修改方案中的素材路径。`, 422, [{ path: `assets[${i}].uri`, message: asset.uri }]);
      }
    }
  }

  function paths(id) {
    if (!UUID.test(id)) throw fault('INVALID_ID', '无效的方案编号。');
    const dir = path.join(base, 'work', 'studio', id);
    return { dir, boardFile: path.join(dir, 'storyboard.json'), stateFile: path.join(dir, 'state.json'),
      out: path.join(base, 'output', 'studio', id) };
  }

  async function persist(record) {
    await json(record.stateFile, record.state);
  }

  async function load(id) {
    if (records.has(id)) return records.get(id);
    if (loading.has(id)) return loading.get(id);
    const files = paths(id);
    const request = (async () => { try {
      if (!within(await realpath(files.dir))) throw new Error('unsafe');
      if (!within(await realpath(files.boardFile)) || !within(await realpath(files.stateFile))) throw new Error('unsafe');
      const board = validate(JSON.parse(await readFile(files.boardFile, 'utf8')));
      const stored = JSON.parse(await readFile(files.stateFile, 'utf8'));
      const state = { status: ['READY','DONE','ERROR','INTERRUPTED'].includes(stored.status) ? stored.status : 'INTERRUPTED',
        createdAt: stored.createdAt, finishedAt: stored.finishedAt, error: stored.error };
      if (state.status === 'INTERRUPTED') state.error = { code: 'RENDER_INTERRUPTED', message: '本地服务已重启，任务未确认完成。可以重新生成，已完成镜头会尝试复用缓存。' };
      const record = { id, ...files, board, state };
      records.set(id, record);
      return record;
    } catch (error) {
      if (error.code === 'INVALID_STORYBOARD') throw error;
      throw fault('STORYBOARD_NOT_FOUND', '没有找到已保存的方案。请重新导入或生成。', 404);
    } })();
    loading.set(id, request);
    try { return await request; }
    finally { loading.delete(id); }
  }

  async function reportFor(record) {
    try { return JSON.parse(await readFile(path.join(record.out, 'render-report.json'), 'utf8')); }
    catch { return null; } // The CLI may be rewriting its progress report.
  }

  async function logTail(record) {
    let file;
    try {
      file = await open(path.join(record.out, 'studio.log'), 'r');
      const size = (await file.stat()).size;
      const buffer = Buffer.alloc(Math.min(size, 12000));
      await file.read(buffer, 0, buffer.length, Math.max(0, size - buffer.length));
      return buffer.toString('utf8');
    } catch { return ''; }
    finally { await file?.close(); }
  }

  async function view(record) {
    const report = await reportFor(record);
    const done = report?.jobs?.filter(job => ['DONE','CACHED'].includes(job.status)).length ?? 0;
    const ready = record.state.status === 'DONE' && report?.status === 'DONE' && report?.final?.ok === true;
    return { id: record.id, ...record.state, storyboard: record.board, path: relative(record.boardFile), outputPath: relative(record.out),
      summary: { width: record.board.canvas.width, height: record.board.canvas.height, fps: record.board.canvas.fps,
        shots: record.board.shots.map(shot => ({ id: shot.shotId, motion: shot.motion, seconds: shot.durationFrames / record.board.canvas.fps })),
        seconds: record.board.shots.reduce((n, shot) => n + shot.durationFrames, 0) / record.board.canvas.fps },
      progress: { done, total: record.board.shots.length, composing: report?.status === 'SHOTS_DONE' },
      renderReport: report, logTail: await logTail(record),
      boardUrl: `${PREFIX}/storyboards/${record.id}/json`,
      ...(ready ? { videoUrl: `${PREFIX}/storyboards/${record.id}/video` } : {}) };
  }

  async function save(board) {
    validate(board);
    await checkAssets(board);
    const id = randomUUID(), files = paths(id);
    await directory(path.join(base, 'work', 'studio'));
    await directory(files.dir);
    const record = { id, ...files, board, state: { status: 'READY', createdAt: new Date().toISOString() } };
    await json(files.boardFile, board);
    await persist(record);
    records.set(id, record);
    return record;
  }

  async function execute(record) {
    await directory(path.join(base, 'output', 'studio'));
    await directory(record.out);
    record.state = { ...record.state, status: 'RENDERING', startedAt: new Date().toISOString(), error: undefined, finishedAt: undefined };
    await persist(record);
    const env = await environment(base);
    const args = [path.join(base, 'services', 'agent-orchestrator', 'cli.mjs'), 'render', '--storyboard', record.boardFile, '--out', record.out];
    const log = createWriteStream(path.join(record.out, 'studio.log'), { flags: 'a' });
    log.on('error', () => {}); // Also cover shutdown before the child is spawned.
    try {
      if (closed) throw fault('RENDER_INTERRUPTED', '本地服务正在关闭。', 503);
      await new Promise((resolve, reject) => {
        log.once('error', reject);
        const child = spawnProcess(process.execPath, args, { cwd: base, env, shell: false, windowsHide: true,
          detached: process.platform !== 'win32', stdio: ['ignore','pipe','pipe'] });
        running = { record, child };
        for (const stream of [child.stdout, child.stderr]) stream?.pipe(log, { end: false });
        child.once('error', reject);
        child.once('close', code => code === 0 ? resolve() : reject(fault('RENDER_FAILED', `视频生成失败（退出码 ${code}），请展开渲染日志查看原因。`, 500)));
      });
      const report = await reportFor(record);
      const canvas = record.board.canvas;
      const final = inspect(path.join(record.out, 'final.mp4'), { expectedWidth: canvas.width, expectedHeight: canvas.height,
        expectedFps: canvas.fps, expectedSeconds: record.board.shots.reduce((n,s) => n + s.durationFrames, 0) / canvas.fps,
        requireAudio: !!record.board.audio?.length });
      if (report?.status !== 'DONE' || report?.compositor !== 'remotion' || !final.ok) {
        throw fault('FINAL_NOT_VERIFIED', '输出未通过完整成片验证。请检查渲染报告。', 500);
      }
      record.state = { ...record.state, status: 'DONE', finishedAt: new Date().toISOString() };
    } catch (error) {
      const report = await reportFor(record);
      record.state = { ...record.state, status: closed ? 'INTERRUPTED' : 'ERROR', finishedAt: new Date().toISOString(),
        error: report?.error ?? { code: error.code || 'RENDER_FAILED', message: error.message } };
    } finally {
      await new Promise(resolve => log.end(resolve));
      await persist(record);
      running = null;
    }
  }

  async function pump() {
    if (pumping || closed) return;
    pumping = true;
    try {
      while (queue.length && !closed) {
        const record = queue.shift();
        try { activeTask = execute(record); await activeTask; }
        catch (error) {
          record.state = { ...record.state, status: 'ERROR', error: { code: error.code || 'RENDER_FAILED', message: error.message } };
          await persist(record).catch(() => {});
        }
      }
    } finally { pumping = false; activeTask = null; }
  }

  async function enqueue(record) {
    if (record.enqueuing) return record.enqueuing;
    if (ACTIVE.has(record.state.status)) return;
    record.enqueuing = (async () => {
      await checkAssets(record.board);
      const previous = record.state;
      record.state = { ...record.state, status: 'QUEUED', error: undefined, finishedAt: undefined };
      try { await persist(record); }
      catch (error) { record.state = previous; throw error; }
      queue.push(record);
      void pump();
    })();
    try { await record.enqueuing; }
    finally { record.enqueuing = null; }
  }

  async function video(req, res, record, attachment) {
    const report = await reportFor(record);
    if (record.state.status !== 'DONE' || report?.status !== 'DONE' || !report?.final?.ok) throw fault('VIDEO_NOT_READY', '视频尚未成功生成。', 409);
    const file = path.join(record.out, 'final.mp4');
    if (!within(await realpath(file))) throw fault('UNSAFE_OUTPUT', '输出文件路径无效。', 422);
    const info = await stat(file);
    if (!info.isFile() || info.size < 1024) throw fault('INVALID_OUTPUT', '输出视频为空或不完整。', 422);
    let start = 0, end = info.size - 1;
    const headers = { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', ...(attachment ? { 'Content-Disposition': 'attachment; filename="final.mp4"' } : {}) };
    if (req.headers.range) {
      res.setHeader('Content-Range', `bytes */${info.size}`);
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!match || (!match[1] && !match[2])) throw fault('INVALID_RANGE', '不支持的视频字节范围。', 416);
      if (!match[1]) start = Math.max(0, info.size - Number(match[2]));
      else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) throw fault('INVALID_RANGE', '视频字节范围越界。', 416);
      headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length'] = end - start + 1;
    res.writeHead(req.headers.range ? 206 : 200, headers);
    if (req.method === 'HEAD') res.end();
    else createReadStream(file, { start, end }).on('error', error => res.destroy(error)).pipe(res);
  }

  async function handle(req, res, next) {
    const pathname = String(req.url || '').split('?')[0];
    if (pathname !== PREFIX && !pathname.startsWith(PREFIX + '/')) return next();
    try {
      if (!localRequest(req)) throw fault('LOCAL_ONLY', '自动保存和渲染仅允许从本机 localhost 编辑器访问。', 403);
      if (closed) throw fault('SERVICE_CLOSED', '本地服务正在关闭，请稍后重试。', 503);
      if (pathname === `${PREFIX}/capabilities` && req.method === 'GET') return sendJson(res, 200, { ok: true, planning: 'offline', schemaVersion: '0.1.0' });
      if (pathname === `${PREFIX}/storyboards` && req.method === 'POST') {
        const input = await requestJson(req);
        return sendJson(res, 201, await view(await save(parseStoryboard(input.source))));
      }
      if (pathname === `${PREFIX}/plans` && req.method === 'POST') {
        const input = await requestJson(req);
        if (typeof input.brief !== 'string' || input.brief.length > 10000 || (input.media !== undefined && typeof input.media !== 'string')) throw fault('INVALID_PLAN_INPUT', '请输入有效的宣传重点和素材相对路径。');
        let board;
        try { board = deterministicPlan({ brief: input.brief, deviceId: input.deviceId || 'iphone-17-pro',
          media: input.media || 'assets/demo.mp4', width: 540, height: 960, fps: 30, seconds: 5, shots: 3 }); }
        catch (error) { throw fault('INVALID_PLAN_INPUT', error.message, 422); }
        return sendJson(res, 201, await view(await save(board)));
      }
      const match = new RegExp(`^${PREFIX}/storyboards/([^/]+)(?:/(render|json|video))?$`).exec(pathname);
      if (!match) throw fault('NOT_FOUND', '没有这个操作入口。', 404);
      const record = await load(match[1]);
      if (!match[2] && req.method === 'GET') return sendJson(res, 200, await view(record));
      if (match[2] === 'render' && req.method === 'POST') { await requestJson(req); await enqueue(record); return sendJson(res, 202, await view(record)); }
      if (match[2] === 'json' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="storyboard.json"', 'Cache-Control': 'no-store' });
        return res.end(JSON.stringify(record.board, null, 2) + '\n');
      }
      if (match[2] === 'video' && ['GET','HEAD'].includes(req.method)) return await video(req, res, record, new URL(req.url, 'http://localhost').searchParams.get('download') === '1');
      throw fault('METHOD_NOT_ALLOWED', '不支持的请求方法。', 405);
    } catch (error) {
      if (res.headersSent) return res.destroy(error);
      sendJson(res, error.status || 500, { error: { code: error.code || 'STUDIO_ERROR', message: error.message || '本地服务执行失败。', ...(error.details ? { details: error.details } : {}) } });
    }
  }

  return { middleware: (req, res, next) => { void handle(req, res, next); },
    close: async () => {
      closed = true;
      if (running) terminate(running.child);
      await activeTask;
    } };
}

export function studioApiPlugin() {
  let api;
  return { name: 'local-promo-studio', apply: 'serve',
    async configureServer(server) {
      api = await createStudioApi({ root: server.config.root });
      server.middlewares.use(api.middleware);
    },
    async closeBundle() { await api?.close(); } };
}
