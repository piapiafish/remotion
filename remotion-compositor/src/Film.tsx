import React from 'react';
import { AbsoluteFill, Audio, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';

type Shot={src:string;durationFrames:number;shotId:string};
type Overlay={kind:'title'|'subtitle'|'tagline';text:string;startFrame:number;durationFrames:number};
export type FilmProps={canvas:{width:number;height:number;fps:number};shots:Shot[];overlays:Overlay[];audio:{src:string;volume:number}|null};
const TextOverlay:React.FC<{overlay:Overlay}>=({overlay})=>{
 const frame=useCurrentFrame();
 const enter=interpolate(frame,[0,12],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 const exit=interpolate(frame,[Math.max(0,overlay.durationFrames-10),overlay.durationFrames],[1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 const title=overlay.kind==='title';const emphasis=overlay.kind==='tagline';
 return <AbsoluteFill style={{justifyContent:title?'flex-start':'flex-end',alignItems:'center',padding:36,paddingTop:title?'10%':0,paddingBottom:title?0:emphasis?'13%':'8%',pointerEvents:'none',opacity:Math.min(enter,exit),transform:`translateY(${(1-enter)*30}px)`}}>
   <div style={{maxWidth:'92%',textAlign:'center',color:'#ffffff',fontSize:title?64:emphasis?58:45,fontWeight:title?850:720,lineHeight:1.25,letterSpacing:1.5,textShadow:'0 3px 24px rgba(0,0,0,.85)',padding:'12px 25px',borderRadius:16,background:'rgba(4,10,22,.46)',fontFamily:'Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif'}}>{overlay.text}</div>
 </AbsoluteFill>;
};
export const PromoFilm:React.FC<FilmProps>=({canvas,shots,overlays,audio})=>{
 let start=0;
 return <AbsoluteFill style={{backgroundColor:'#080d18',width:canvas.width,height:canvas.height,overflow:'hidden'}}>
   {shots.map(shot=>{const at=start;start+=shot.durationFrames;return <Sequence key={shot.shotId} from={at} durationInFrames={shot.durationFrames} name={shot.shotId}>
     <AbsoluteFill><OffthreadVideo src={staticFile(shot.src)} muted style={{width:'100%',height:'100%',objectFit:'cover'}} /></AbsoluteFill>
   </Sequence>})}
   {overlays.map((overlay,i)=><Sequence key={`${i}-${overlay.startFrame}`} from={overlay.startFrame} durationInFrames={overlay.durationFrames}><TextOverlay overlay={overlay}/></Sequence>)}
   {audio&&<Audio src={staticFile(audio.src)} volume={Math.max(0,Math.min(audio.volume,1))}/>}
 </AbsoluteFill>;
};
