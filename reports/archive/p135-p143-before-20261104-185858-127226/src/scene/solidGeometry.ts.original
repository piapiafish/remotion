import { BoxGeometry, ExtrudeGeometry, type BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import type { TextObject } from '../store/schema'
export function makeSolidGeometry(text:Pick<TextObject,'content'|'fontSize'|'width'|'align'|'lineHeight'>,font:Font):BufferGeometry{
  const size=text.fontSize/160,parts:BufferGeometry[]=[],lines:string[]=[]
  for(const paragraph of text.content.split('\n')){let line='';for(const char of Array.from(paragraph)){const next=line+char,width=font.generateShapes(next,size).reduce((max,shape)=>Math.max(max,...shape.getPoints(4).map(p=>p.x)),0);if(line&&width>text.width*5){lines.push(line);line=char}else line=next}lines.push(line)}
  for(let i=0;i<lines.length;i++){
    const shapes=font.generateShapes(lines[i],size);if(!shapes.length)continue
    const geometry=new ExtrudeGeometry(shapes,{depth:1,bevelEnabled:false,curveSegments:6,steps:1})
    geometry.computeBoundingBox();const box=geometry.boundingBox!,width=box.max.x-box.min.x
    const x=text.align==='left'?0:text.align==='right'?-width:-width/2
    geometry.translate(x-box.min.x,(lines.length-1)*size*text.lineHeight/2-i*size*text.lineHeight-size/2,-.5);parts.push(geometry)
  }
  if(!parts.length)return new BoxGeometry(0,0,0)
  const merged=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());return merged
}
