/// <reference types="node" />
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { solidFont } from './solidFont'
import { makeSolidGeometry } from './solidGeometry'
import type { TextObject } from '../store/schema'
const text:TextObject={instanceId:'solid',name:'实体',textKind:'solid',content:'中文口 Aa 8',fontSize:64,fontWeight:400,color:'#ffffff',align:'center',lineHeight:1.3,width:.8,transform:{}}
beforeAll(()=>{const file=readFileSync(new URL('../../public/fonts/NotoSansCJKsc-Regular.otf',import.meta.url));vi.stubGlobal('fetch',async()=>new Response(file))})
afterAll(()=>vi.unstubAllGlobals())
describe('real Chinese solid text',()=>{
  it('generates portable glyph outlines for Chinese and Latin',async()=>{const {font,data}=await solidFont(text);expect(font.generateShapes('中文',.4).length).toBeGreaterThan(0);const subset=JSON.parse(data);expect(subset.glyphs['中'].o).toContain('m ');expect(data.length).toBeLessThan(100000)})
  it('preserves the hole in the Chinese character 口',async()=>{const {font}=await solidFont(text);expect(font.generateShapes('口',1).some(shape=>shape.holes.length>0)).toBe(true)})
  it('builds front, side and back geometry of nonzero depth',async()=>{const {font}=await solidFont(text),geometry=makeSolidGeometry(text,font);geometry.computeBoundingBox();expect(geometry.boundingBox!.max.z-geometry.boundingBox!.min.z).toBeCloseTo(1);expect(geometry.attributes.position.count).toBeGreaterThan(100);geometry.dispose()})
  it('loads embedded glyphs without accessing the font service',async()=>{const first=await solidFont(text);vi.stubGlobal('fetch',()=>{throw Error('offline')});const next=await solidFont({...text,fontData:first.data});expect(next.font.generateShapes('中文',1).length).toBeGreaterThan(0)})
})
