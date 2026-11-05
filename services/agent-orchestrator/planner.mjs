import {DEVICE_IDS, assertStoryboard, SCHEMA_VERSION} from '../../packages/video-schema/index.mjs';
const motions=['hero-reveal','spin-y-360','tilt-in','float','orbit'];
const templates=['hero-tilt','hero-straight','low-hero','hero-tilt','hero-straight'];
function splitBenefits(brief){
 const parts=String(brief).split(/[。！？.!?；;\n]/u).map(s=>s.trim()).filter(Boolean);
 return parts.length?parts:['让创意更轻松','高效展示产品','从想法到精彩成片'];
}
export function deterministicPlan({brief='让你的产品脱颖而出',media='assets/demo.mp4',music='assets/music-demo.mp3',deviceId='iphone-17-pro',width=1080,height=1920,fps=30,seconds=5,shots=3}={}){
 if(!DEVICE_IDS.includes(deviceId)) throw new Error(`Unknown device: ${deviceId}`);
 if(!Number.isInteger(shots)||shots<1||shots>8) throw new Error('shots must be 1..8');
 const phrases=splitBenefits(brief); const frames=Math.round(seconds*fps);
 const out={schemaVersion:SCHEMA_VERSION,canvas:{width,height,fps},
  assets:[{id:'screen',kind:'video',uri:media},...(music?[{id:'music',kind:'audio',uri:music}]:[])],
  shots:Array.from({length:shots},(_,i)=>({shotId:`shot-${String(i+1).padStart(3,'0')}`,deviceId,screenAssetId:'screen',durationFrames:frames,template:templates[i%templates.length],motion:motions[i%motions.length],screenFit:'contain',screenOffsetFrames:0,background:i%2===0?'#0b1020':'#101827'})),
  overlays:Array.from({length:shots},(_,i)=>({kind:i===0?'title':i===shots-1?'tagline':'subtitle',text:phrases[i%phrases.length].slice(0,80),startFrame:i*frames+Math.round(fps*.6),durationFrames:Math.max(1,frames-Math.round(fps*1.0))})),
  audio:music?[{assetId:'music',volume:0.22}]:[],
  projectPolicy:{maxRetries:2,renderQuality:'standard',allowPngFallback:true,review:true},
  reasoning: '本地确定性导演模板；可修改分镜后再次运行'
 };
 return assertStoryboard(out);
}
export async function planWithModel(options){
 const fallback=deterministicPlan(options);
 if(!process.env.OPENAI_API_KEY) return {...fallback,plannerMode:'deterministic (OPENAI_API_KEY not set)'};
 const url=(process.env.OPENAI_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,'')+'/chat/completions';
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),35000);
 try{
  const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},signal:controller.signal,
   body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4o-mini',temperature:0.7,response_format:{type:'json_object'},messages:[
    {role:'system',content:'你是优秀的软件宣传片导演。只能输出一个合法 JSON 对象，字段必须符合给定示例；镜头总数、deviceId、canvas、assets URI 必须保留；只可调整 shots 中 template/motion/background，及 overlays 的文案。不可发明模型文件或网络路径；输出应令人印象深刻且节奏合理。'},
    {role:'user',content:`产品需求：${options.brief}\n允许设备：${DEVICE_IDS.join(', ')}\n请在以下合法分镜基础上优化，仅返回完整 JSON：\n${JSON.stringify(fallback)}`}
   ]})});
  if(!response.ok) throw new Error(`LLM HTTP ${response.status}`);
  const raw=await response.json();const candidate=JSON.parse(raw.choices[0].message.content);
  assertStoryboard(candidate);
  // Forbid model from altering the input asset map, canvas or shot count.
  if(JSON.stringify(candidate.assets)!==JSON.stringify(fallback.assets) || JSON.stringify(candidate.canvas)!==JSON.stringify(fallback.canvas) || candidate.shots.length!==fallback.shots.length || candidate.shots.some((s,i)=>s.deviceId!==fallback.shots[i].deviceId)) throw new Error('Model modified fixed resources');
  return {...candidate,plannerMode:'llm'};
 }catch(e){return {...fallback,plannerMode:'deterministic fallback',plannerWarning:String(e)};}
 finally{clearTimeout(timer)}
}
