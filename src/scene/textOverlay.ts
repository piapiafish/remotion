import { stickerBlurRadius } from './depthOfField'
import { isDisplayed } from '../timeline/displayRange'
import { waitForSolidTexts } from './solidFont'
import type { Project, TextObject } from '../store/schema'
import { sampleTrack } from '../timeline/sample'

export const TITLE_FONT = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif'
type DrawingContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
export function textPose(text: TextObject, t: number) {
  const value = (c: string, fallback = 0) => sampleTrack(text.transform[c], t, fallback)
  return { x: value('position.x', .5), y: value('position.y', .14), rotation: value('rotation.z'), scale: value('scale', 1), opacity: Math.max(0,Math.min(1,value('opacity',1))) }
}
export function textLayout(ctx: DrawingContext, text: TextObject, width: number, height: number) {
  const size = text.fontSize * height / 1080, maxWidth = Math.max(1,width*text.width)
  ctx.font = `${text.fontWeight} ${size}px ${TITLE_FONT}`
  const lines: string[] = []
  for (const paragraph of text.content.split('\n')) {
    let line = ''
    for (const char of Array.from(paragraph)) {
      if (line && ctx.measureText(line+char).width > maxWidth) { lines.push(line); line='' }
      line += char
    }
    lines.push(line)
  }
  return { lines, width: maxWidth, height: lines.length*size*text.lineHeight, size, lineHeight: size*text.lineHeight }
}
export function paintTitles(ctx: DrawingContext, project: Project, t: number, width: number, height: number, layer: 'front'|'back'='front') {
  for (const text of project.texts ?? []) {
    if (!text.content || text.textKind==='solid' || !isDisplayed(text,t,project.duration) || (text.layer??'front')!==layer) continue
    ctx.save()
    const pose=textPose(text,t), layout=textLayout(ctx,text,width,height)
    ctx.translate(pose.x*width,pose.y*height);ctx.rotate(pose.rotation);ctx.scale(pose.scale,pose.scale)
    if(text.depthOfField?.enabled){const radius=stickerBlurRadius(project,t,text.depthOfField.distance,height);if(radius>.01)ctx.filter=`blur(${radius*.42*(ctx.canvas.width/width)}px)`}
    ctx.globalAlpha=pose.opacity;ctx.fillStyle=text.color;ctx.textBaseline='middle';ctx.textAlign=text.align
    const x=text.align==='left'?-layout.width/2:text.align==='right'?layout.width/2:0
    layout.lines.forEach((line,i)=>ctx.fillText(line,x,-layout.height/2+layout.lineHeight*(i+.5)))
    ctx.restore()
  }
}
export async function waitForTitleFonts(project: Project,signal?:AbortSignal) {
  await waitForSolidTexts(project,signal)
  if (!project.texts?.length || typeof document === 'undefined' || !document.fonts) return
  await document.fonts.load(`600 32px ${TITLE_FONT}`, '中文标题 Aa')
  await document.fonts.ready
}
