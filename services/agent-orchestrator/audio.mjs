import {spawnSync} from 'node:child_process';
import {copyFile} from 'node:fs/promises';
import path from 'node:path';

function run(args){
 const p=spawnSync('ffmpeg',args,{encoding:'utf8',maxBuffer:4*1024*1024});
 if(p.status!==0)throw Object.assign(new Error(p.error?.message||p.stderr),{code:'AUDIO_PREPARATION_FAILED'});
 return p.stderr;
}
export function measureVolume(file){
 const log=run(['-hide_banner','-i',file,'-vn','-af','volumedetect','-f','null','-']);
 const mean=Number(log.match(/mean_volume:\s*(-?[\d.]+) dB/)?.[1]);
 const peak=Number(log.match(/max_volume:\s*(-?[\d.]+) dB/)?.[1]);
 if(!Number.isFinite(mean)||!Number.isFinite(peak))throw Object.assign(new Error('Soundtrack is silent or has no decodable audio'),{code:'AUDIO_SILENT_OR_INVALID'});
 return {meanDb:mean,peakDb:peak};
}
export async function prepareSoundtrack(source,base){
 const original=measureVolume(source);
 // The bundled demo measures -50.2 dB mean before the DSL's 0.22 volume:
 // copying it directly made a technically valid but almost inaudible track.
 // Only lift exceptionally quiet inputs; preserve normal mastered music.
 const gainDb=original.meanDb < -35 ? Math.max(0,Math.min(-20-original.meanDb,-1-original.peakDb)) : 0;
 const file=base+(gainDb>0?'.wav':path.extname(source));
 if(gainDb>0)run(['-y','-v','error','-i',source,'-vn','-af',`volume=${gainDb}dB`,'-ar','48000','-c:a','pcm_s16le',file]);
 else await copyFile(source,file);
 return {file,audit:{source,original,gainDb,prepared:measureVolume(file),note:'Original asset unchanged; constant gain only for inputs below -35 dB mean. DSL volume is applied afterward by Remotion.'}};
}
