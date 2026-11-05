/** Stable tool functions for Agent callers. No arbitrary shell, file:// or JavaScript execution. */
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {realpathSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {safeAssetUri,assertStoryboard,DEVICE_IDS} from '../../packages/video-schema/index.mjs';
import {compileShot} from '../compiler/compile.mjs';
import {inspectMedia} from './critic.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const TOOLS = Object.freeze(['list_devices','probe_media','create_device_shot','inspect_render']);
const labels={'iphone-17-pro':'iPhone 17 Pro','iphone-17-pro-max':'iPhone 17 Pro Max','galaxy-s26-ultra':'Samsung Galaxy S26 Ultra','pixel-9-pro-xl':'Google Pixel 9 Pro XL'};
function projectPath(uri){
 if(!safeAssetUri(uri)) throw Object.assign(new Error('Only project-local media is allowed'),{code:'UNSAFE_ASSET_PATH'});
 const full=path.resolve(root,uri);
 if(!full.startsWith(root+path.sep) || !existsSync(full) || !realpathSync(full).startsWith(root+path.sep)) throw Object.assign(new Error('File missing or outside workspace'),{code:'ASSET_MISSING_OR_UNSAFE'});
 return full;
}
export async function callTool(name,input={}){
 if(!TOOLS.includes(name)) throw Object.assign(new Error(`Unknown tool: ${name}`),{code:'UNKNOWN_TOOL'});
 if(name==='list_devices') return DEVICE_IDS.map(id=>({id,name:labels[id],asset:`public/devices/${id}.glb`,isRealGlb:true}));
 if(name==='probe_media'){
  const file=projectPath(input.uri);
  const out=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,codec_name,width,height','-of','json',file],{encoding:'utf8'}));
  return {uri:input.uri,format:out.format,streams:out.streams};
 }
 if(name==='create_device_shot'){
  const board=assertStoryboard(input.storyboard),shot=board.shots.find(x=>x.shotId===input.shotId);
  if(!shot) throw Object.assign(new Error('Unknown shot ID'),{code:'SHOT_NOT_FOUND'});
  const asset=board.assets.find(x=>x.id===shot.screenAssetId);
  projectPath(asset.uri);
  if(!input.assetInfo || !input.publicUrl?.startsWith('/__automation__/')) throw Object.assign(new Error('Missing compiler media probe or safe public URL'),{code:'INVALID_COMPILATION_INPUT'});
  return compileShot(board,shot,input.assetInfo,input.publicUrl);
 }
 if(name==='inspect_render') return inspectMedia(projectPath(input.uri));
}
