import { describe, expect, it } from 'vitest'
import { createDefaultProject } from '../store/defaults'
import { defaultEffects } from '../store/schema'
import { exposureTimes, focusDistance } from './sceneEffects'
import { EASE_LINEAR } from '../timeline/easing'

describe('deterministic scene effects',()=>{
  it('uses one center frame when blur is off, and scales exposure with frame rate',()=>{
    const p=createDefaultProject();expect(exposureTimes(p,1)).toEqual([1]);p.effects=defaultEffects();p.effects.motionBlur={enabled:true,strength:1,samples:4}
    const thirty=exposureTimes(p,1);p.fps=60;const sixty=exposureTimes(p,1)
    expect(thirty).toHaveLength(4);expect(thirty[0]+thirty[3]).toBeCloseTo(2)
    expect(thirty[3]-thirty[0]).toBeCloseTo(2*(sixty[3]-sixty[0]))
    expect(exposureTimes(p,1)).toEqual(sixty)
  })
  it('clamps exposure to project bounds and does not depend on the previous rendered time',()=>{
    const p=createDefaultProject();p.effects=defaultEffects();p.effects.motionBlur={enabled:true,strength:1,samples:8}
    const first=exposureTimes(p,0);expect(first.every(t=>t>=0)).toBe(true)
    exposureTimes(p,3);expect(exposureTimes(p,0)).toEqual(first)
    expect(exposureTimes(p,p.duration).every(t=>t<=p.duration)).toBe(true)
    expect(exposureTimes(p,2,2)).toHaveLength(2)
  })
  it('follows the animated focus object along the camera viewing direction',()=>{
    const p=createDefaultProject();p.effects=defaultEffects();p.effects.depthOfField.focusDevice=p.devices[0].instanceId
    p.camera.tracks['position.x'].keys[0].v=0;p.camera.tracks['position.y'].keys[0].v=0;p.camera.tracks['position.z'].keys[0].v=4
    p.devices[0].transform['position.z']={keys:[{t:0,v:0,ease:EASE_LINEAR},{t:2,v:2,ease:EASE_LINEAR}]}
    expect(focusDistance(p,0)).toBeCloseTo(4);expect(focusDistance(p,1)).toBeCloseTo(3);expect(focusDistance(p,2)).toBeCloseTo(2)
    p.effects.depthOfField.focusDevice='missing';p.effects.depthOfField.distance=2.7;expect(focusDistance(p,1)).toBe(2.7)
  })
})
