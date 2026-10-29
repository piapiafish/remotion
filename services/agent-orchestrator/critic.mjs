import {spawnSync} from 'node:child_process';
import {statSync,existsSync} from 'node:fs';
export function inspectMedia(file,{minSeconds=0.1}={}){
 if(!existsSync(file)) return {ok:false,error:'OUTPUT_MISSING',file};
 const bytes=statSync(file).size; if(bytes<1024) return {ok:false,error:'OUTPUT_TOO_SMALL',file,bytes};
 const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height,codec_type','-of','json',file],{encoding:'utf8'});
 if(probe.status!==0) return {ok:false,error:'FFPROBE_FAILED',details:probe.stderr};
 const info=JSON.parse(probe.stdout);const duration=Number(info.format?.duration)||0;
 const video=info.streams?.find(s=>s.codec_type==='video');
 if(!video || !video.width || !video.height || duration<minSeconds) return {ok:false,error:'INVALID_VIDEO',duration,info};
 return {ok:true,bytes,duration,width:video.width,height:video.height,codec:video.codec_name,file};
}
