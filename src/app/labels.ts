export const templateLabels: Record<string, [string, string]> = {
  'hero-straight': ['正面展示', '单台手机正面朝向镜头，适合清楚展示内容。'],
  'hero-tilt': ['轻斜展示', '稍作倾斜，兼顾屏幕和机身质感。'],
  'duo-offset': ['双机交错', '两台手机错开，适合产品发布和功能介绍。'],
  'duo-flat': ['双机并排', '两块屏幕正面并排，适合内容对照。'],
  'trio-set': ['三机陈列', '三台手机整齐排列，中间一台突出。'],
  'trio-fan': ['三机展开', '两侧向外展开，适合展示多个功能。'],
  'perspective-row': ['纵深排列', '沿纵深排列，呈现连贯的功能流程。'],
  'front-back': ['正反展示', '同时展示屏幕内容与手机背面。'],
  'flat-lay': ['俯视平铺', '手机平放，画面简洁舒展。'],
  'low-hero': ['低角度展示', '从下方观看，突出机身轮廓。'],
  'stacked-depth': ['层叠展示', '手机前后层叠，适合海报式构图。'],
}
export const finishLabels: Record<string, string> = { graphite: '石墨色', silver: '银色', 'original-blue': '原色蓝', 'natural-titanium': '原色钛金属', 'black-titanium': '黑色钛金属', 'white-titanium': '白色钛金属', 'cosmic-orange': '星宇橙', 'deep-blue': '深蓝色', obsidian: '曜石黑', porcelain: '陶瓷白', hazel: '灰绿色', titanium: '钛金属' }
export const deviceLabel = (id: string, name: string) => id === 'procedural-phone' ? '通用手机' : name
export const easeLabels: Record<string, string> = { linear: '匀速', 'ease-in': '缓入', 'ease-out': '缓出', 'ease-in-out': '缓入缓出', smooth: '柔和过渡', continuous: '平滑连续' }
export const motionLabels: Record<string, string> = { none: '保持静止', 'spin-y-360': '旋转一周', 'spin-y-720': '旋转两周', float: '轻柔悬浮', 'slide-in': '滑入', 'push-in': '缓缓靠近', orbit: '相机环绕', 'tilt-in': '倾斜入场', 'slide-in-left': '从左滑入', 'hero-reveal': '产品亮相' }
