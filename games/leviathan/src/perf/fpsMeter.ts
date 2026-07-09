// Rig de mesure du critère (a) : FPS via requestAnimationFrame, overlay on-screen.
export function mountFpsMeter(): () => void {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;top:env(safe-area-inset-top,8px);left:8px;z-index:9999;' +
    'font:12px/1.4 monospace;color:#9fe;background:rgba(0,0,0,.55);padding:4px 8px;border-radius:6px;pointer-events:none'
  document.body.appendChild(el)
  let frames = 0, last = performance.now(), raf = 0
  const loop = (now: number) => {
    frames++
    if (now - last >= 500) { el.textContent = `${Math.round((frames * 1000) / (now - last))} fps`; frames = 0; last = now }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  return () => { cancelAnimationFrame(raf); el.remove() }
}
