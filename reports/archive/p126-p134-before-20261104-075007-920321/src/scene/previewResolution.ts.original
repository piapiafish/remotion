/** Supersample low-DPI previews while bounding GPU buffer size on big windows. */
export function previewPixelRatio(width:number,height:number,deviceRatio=1):number {
  const pixels=Math.max(1,width*height)
  return Math.max(1,Math.min(2,Math.max(1.5,deviceRatio),Math.sqrt(3_200_000/pixels)))
}
