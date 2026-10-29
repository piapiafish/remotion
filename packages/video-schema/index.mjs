/** Video DSL 0.1.0 — shared contract for deterministic tooling and AI output. */
export const SCHEMA_VERSION = '0.1.0';
export const DEVICE_IDS = Object.freeze(['iphone-17-pro','iphone-17-pro-max','pixel-9-pro-xl','galaxy-s26-ultra']);
export const TEMPLATE_IDS = Object.freeze(['hero-straight','hero-tilt','duo-offset','duo-flat','trio-set','trio-fan','front-back','flat-lay','low-hero','perspective-row','stacked-depth']);
export const MOTION_IDS = Object.freeze(['none','float','spin-y-360','tilt-in','slide-in-left','hero-reveal','orbit']);
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
export function safeAssetUri(uri) {
  if(typeof uri !== 'string' || uri.length===0 || uri.length>260) return false;
  if(uri.includes('\\') || uri.includes('\0') || uri.includes('?') || uri.includes('#')) return false;
  if(uri.startsWith('/') || uri.startsWith('./') || /^[a-zA-Z]:/.test(uri) || /:\/\//.test(uri)) return false;
  return uri.split('/').every(s => s !== '' && s!=='.' && s!=='..' && !s.startsWith('.'));
}
export function validateStoryboard(input) {
  const problems=[];
  const fail=(path,message)=>problems.push({path,message});
  if(!isObj(input)) return {ok:false,errors:[{path:'$',message:'Expected object'}]};
  if(input.schemaVersion!==SCHEMA_VERSION) fail('schemaVersion','Expected 0.1.0');
  if(!isObj(input.canvas) || !isInt(input.canvas.width,256,3840) || !isInt(input.canvas.height,256,3840) || ![24,25,30,60].includes(input.canvas.fps)) fail('canvas','Invalid width/height/fps');
  if(!Array.isArray(input.assets) || input.assets.length>32) fail('assets','Expected assets array (max 32)');
  const assetIds=new Set();
  for(const [i,a] of (Array.isArray(input.assets)?input.assets:[]).entries()){
    if(!isObj(a) || typeof a.id!=='string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(a.id) || assetIds.has(a.id)) fail(`assets[${i}].id`,'Missing, duplicate or invalid ID');
    else assetIds.add(a.id);
    if(!['video','image','audio'].includes(a?.kind)) fail(`assets[${i}].kind`,'Expected video/image/audio');
    if(!safeAssetUri(a?.uri)) fail(`assets[${i}].uri`,'Only safe project-relative paths allowed');
  }
  if(!Array.isArray(input.shots) || input.shots.length<1 || input.shots.length>12) fail('shots','Expected 1..12 shots');
  const shotIds=new Set(); let total=0;
  for(const [i,s] of (Array.isArray(input.shots)?input.shots:[]).entries()){
    const p=`shots[${i}]`;
    if(!isObj(s)){fail(p,'Expected object');continue;}
    if(typeof s.shotId!=='string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(s.shotId) || shotIds.has(s.shotId)) fail(`${p}.shotId`,'Missing, duplicate or invalid ID');
    shotIds.add(s.shotId);
    if(!DEVICE_IDS.includes(s.deviceId)) fail(`${p}.deviceId`,'Unknown real GLB device');
    if(!isInt(s.durationFrames,1,1800)) fail(`${p}.durationFrames`,'Expected 1..1800 frames'); else total+=s.durationFrames;
    if(!TEMPLATE_IDS.includes(s.template)) fail(`${p}.template`,'Unknown template');
    if(!MOTION_IDS.includes(s.motion)) fail(`${p}.motion`,'Unknown motion');
    if(!['contain','cover'].includes(s.screenFit)) fail(`${p}.screenFit`,'Expected contain/cover');
    if(!isInt(s.screenOffsetFrames??0,0,36000)) fail(`${p}.screenOffsetFrames`,'Expected nonnegative integer');
    const a=input.assets?.find?.(a=>a?.id===s.screenAssetId);
    if(!a || !['video','image'].includes(a.kind)) fail(`${p}.screenAssetId`,'Unknown image/video asset');
    if(s.background && (typeof s.background!=='string'||!/^#[0-9a-fA-F]{6}$/.test(s.background))) fail(`${p}.background`,'Use #RRGGBB');
  }
  if(!Array.isArray(input.overlays ?? [])) fail('overlays','Expected array');
  for(const [i,o] of (Array.isArray(input.overlays)?input.overlays:[]).entries()){
    if(!o || typeof o.text!=='string' || o.text.length>200 || !['title','subtitle','tagline'].includes(o.kind) || !isInt(o.startFrame,0,36000) || !isInt(o.durationFrames,1,1800) || o.startFrame+o.durationFrames>total) fail(`overlays[${i}]`,'Invalid text, kind or frame range');
  }
  if(input.audio?.length){
    if(!Array.isArray(input.audio)) fail('audio','Expected array');
    else for(const [i,a] of input.audio.entries()) if(!assetIds.has(a.assetId) || input.assets.find(x=>x.id===a.assetId)?.kind!=='audio' || !Number.isFinite(a.volume??0.4) || a.volume<0 || a.volume>1) fail(`audio[${i}]`,'Unknown audio asset or invalid volume');
  }
  if(total>9000) fail('shots','Total length over 9000 frames');
  return {ok:problems.length===0,errors:problems,totalFrames:total};
}
export function assertStoryboard(input) {
 const r=validateStoryboard(input);
 if(!r.ok){const e=new Error(r.errors.map(x=>`${x.path}: ${x.message}`).join('; '));e.code='INVALID_STORYBOARD';e.details=r.errors;throw e;}
 return input;
}
