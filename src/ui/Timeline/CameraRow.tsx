import { Camera, Plus } from 'lucide-react'
import { useProjectStore } from '../../store/project'
import { cameraSegments } from '../../timeline/cameraSegments'

export function CameraRow() {
  const s=useProjectStore(),segments=cameraSegments(s.project.camera)
  return <div className="object-track camera-track" data-testid="track-camera">
    <button className="object-track-name" onClick={()=>s.selectCameraSegment(null)}><strong><Camera size={15}/>相机运动</strong><small>{segments.length?segments.length+' 段动画':'尚未添加动画'}</small></button>
    <div className="camera-lane object-lane">
      {segments.map(segment=><button key={segment.id} data-testid={'camera-segment-'+segment.id} className={'camera-segment '+(s.selectedCameraSegmentId===segment.id?'selected':'')} style={{left:segment.start/s.project.duration*100+'%',width:(segment.end-segment.start)/s.project.duration*100+'%'}} aria-label={segment.name+' '+segment.start.toFixed(2)+'至'+segment.end.toFixed(2)+'秒'} title={segment.name+' · '+segment.start.toFixed(2)+'～'+segment.end.toFixed(2)+' 秒'} onClick={()=>s.selectCameraSegment(segment.id)}><Camera size={14}/><span>{segment.name}</span><small>{(segment.end-segment.start).toFixed(1)}秒</small></button>)}
      {!segments.length&&<button className="camera-empty-add" onClick={()=>s.startCameraRecording()}><Plus size={14}/>添加相机动画</button>}
    </div>
  </div>
}
