import {assertStoryboard} from '../../packages/video-schema/index.mjs';
const TAU=Math.PI*2, DEG=Math.PI/180;
const ease={linear:[0,0,1,1],smooth:[0.42,0,0.58,1],out:[0,0,0.3,1]};
const key=(t,v,e='smooth')=>({t,v,ease:ease[e]});
const track=(value)=>({keys:[key(0,value)]});
const vec=(prefix,values)=>Object.fromEntries('xyz'.split('').map((axis,i)=>[`${prefix}.${axis}`,track(values[i])]));
const move=(target,channel,frames,fps,e='smooth')=>({keys:target.map(([f,v])=>key(f/fps,v,e))});
const poses={
 'hero-straight': {pos:[0,0,0],rot:[0,0,0],scale:1,cam:[0,0,3.5]},
 'hero-tilt': {pos:[0,0,0],rot:[3*DEG,22*DEG,-6*DEG],scale:1,cam:[0,0,3.5]},
 'duo-offset': {pos:[-0.2,-0.1,0],rot:[0,22*DEG,7*DEG],scale:0.98,cam:[0,0,4.2]},
 'duo-flat':{pos:[0,0,0],rot:[0,0,0],scale:1,cam:[0,0,4.2]},
 'trio-set':{pos:[0,-0.1,0],rot:[0,21*DEG,0],scale:1,cam:[0,0,4.6]},
 'trio-fan':{pos:[0,0,0],rot:[0,7*DEG,0],scale:1,cam:[0,0,4.6]},
 'front-back':{pos:[0,0,0],rot:[0,20*DEG,-8*DEG],scale:1,cam:[0,0,4.2]},
 'flat-lay':{pos:[0,0,0],rot:[-88*DEG,0,12*DEG],scale:1,cam:[0,3.4,0.35]},
 'low-hero':{pos:[0,0,0],rot:[0,14*DEG,-4*DEG],scale:1,cam:[0.35,-1.5,2.9]},
 'perspective-row':{pos:[0,0,0],rot:[0,30*DEG,-5*DEG],scale:1,cam:[0,0,4.6]},
 'stacked-depth':{pos:[0,0,0],rot:[0,12*DEG,-10*DEG],scale:1,cam:[0,0,4.3]},
};
const colorway={
 'iphone-17-pro':'original-blue', 'iphone-17-pro-max':'cosmic-orange',
 'pixel-9-pro-xl':'obsidian','galaxy-s26-ultra':'titanium'
};
export function compileShot(board,shot,assetInfo,publicUrl){
 assertStoryboard(board);
 if(!board.shots.includes(shot)) throw new Error('Shot not in storyboard');
 const {fps,width,height}=board.canvas;
 const {motion,durationFrames}=shot; const d=durationFrames/fps;
 const pose=poses[shot.template];
 const transform={...vec('position',pose.pos),...vec('rotation',pose.rot),scale:track(pose.scale)};
 const frames=Math.max(1,durationFrames-1);
 if(motion==='float') transform['position.y']=move([[0,pose.pos[1]],[frames/2,pose.pos[1]+0.07],[frames,pose.pos[1]]],null,null,fps);
 if(motion==='spin-y-360') transform['rotation.y']=move([[0,pose.rot[1]],[frames,pose.rot[1]+TAU]],null,null,fps,'linear');
 if(motion==='tilt-in') { transform['rotation.y']=move([[0,pose.rot[1]-0.55],[frames*.7,pose.rot[1]]],null,null,fps,'out');transform['rotation.x']=move([[0,pose.rot[0]+.22],[frames*.7,pose.rot[0]]],null,null,fps,'out');}
 if(motion==='slide-in-left') transform['position.x']=move([[0,pose.pos[0]-2.4],[frames*.55,pose.pos[0]]],null,null,fps,'out');
 if(motion==='hero-reveal') { transform.scale=move([[0,pose.scale*.86],[frames*.65,pose.scale]],null,null,fps);transform['position.y']=move([[0,pose.pos[1]-.28],[frames*.65,pose.pos[1]]],null,null,fps);transform['rotation.y']=move([[0,pose.rot[1]+.45],[frames*.75,pose.rot[1]]],null,null,fps);}
 let cameraTracks={...vec('position',pose.cam),...vec('target',[0,0,0]),fov:track(30)};
 if(motion==='orbit'){
  const radius=Math.hypot(pose.cam[0],pose.cam[2]);
  const xs=[],zs=[];for(let i=0;i<=12;i++){const a=TAU*i/12;xs.push(key(d*i/12,Math.sin(a)*radius,'linear'));zs.push(key(d*i/12,Math.cos(a)*radius,'linear'));}
  cameraTracks['position.x']={keys:xs};cameraTracks['position.z']={keys:zs};
 }
 const screenOffset=(shot.screenOffsetFrames||0)/fps;
 // Offset handling is performed by trimming/cutting video in the worker prior to this compilation.
 const screen={id:`media-${shot.shotId}`,kind:assetInfo.kind,width:assetInfo.width,height:assetInfo.height,...(assetInfo.kind==='video'?{duration:assetInfo.duration}:{}),url:publicUrl};
 return {
  version:1,name:shot.shotId,duration:d,fps,
  output:{width,height},
  devices:[{instanceId:`device-${shot.shotId}`,id:shot.deviceId,colorway:colorway[shot.deviceId],orientation:'portrait',screen,screenFit:shot.screenFit,transform}],
  background:{type:'solid',color:shot.background||'#0b1020'},
  environment:{hdri:'studio',intensity:1,rotation:0,shadowOpacity:0.18,shadowBlur:14},
  camera:{fov:30,preset:null,tracks:cameraTracks},
  automation:{screenOffset}
 };
}
