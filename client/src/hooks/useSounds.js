import { useCallback } from 'react'

// One AudioContext for the whole app. Browsers cap how many can exist at once
// (WebKit allows 4), and every game screen calls useSounds() — a context per
// hook instance would exhaust the cap after a few navigations and audio would
// die for good.
let sharedCtx = null

function discardCtx() {
  const dead = sharedCtx
  sharedCtx = null
  try { dead?.close() } catch { /* already gone */ }
}

function getCtx() {
  const Ctor = window.AudioContext ?? window.webkitAudioContext
  if (!Ctor) return null

  if (sharedCtx?.state === 'closed') sharedCtx = null
  if (!sharedCtx) {
    try { sharedCtx = new Ctor() } catch { return null }
    watchLifecycle()
  }
  return sharedCtx
}

// iOS parks the context in 'interrupted' (not 'suspended') when the PWA is
// backgrounded or another app grabs the audio session. Resume on the way back
// in so the first tap after reopening makes a sound.
let watching = false

function watchLifecycle() {
  if (watching) return
  watching = true

  function wake() {
    if (document.visibilityState !== 'visible') return
    if (!sharedCtx || sharedCtx.state === 'running' || sharedCtx.state === 'closed') return
    sharedCtx.resume().catch(() => discardCtx())
  }

  document.addEventListener('visibilitychange', wake)
  window.addEventListener('pageshow', wake)   // bfcache restore
  window.addEventListener('focus', wake)
}

function schedule(build) {
  const ctx = getCtx()
  if (!ctx) return

  function run() {
    try { build(ctx, ctx.currentTime) }
    catch { discardCtx() }   // context is unusable — next play() builds a fresh one
  }

  if (ctx.state === 'running') run()
  else ctx.resume().then(run).catch(() => discardCtx())
}

function tone(ctx, freq, start, duration, { type = 'sine', gain = 0.3, slide } = {}) {
  const osc  = ctx.createOscillator()
  const amp  = ctx.createGain()
  osc.connect(amp)
  amp.connect(ctx.destination)

  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, start + duration)

  amp.gain.setValueAtTime(gain, start)
  amp.gain.exponentialRampToValueAtTime(0.001, start + duration)

  osc.start(start)
  osc.stop(start + duration + 0.01)
}

export function useSounds() {
  // Short pleasant ding — practice correct rep
  const playCorrect = useCallback(() => {
    schedule((c, t) => {
      tone(c, 523, t,        0.08, { gain: 0.25 })           // C5
      tone(c, 659, t + 0.09, 0.12, { gain: 0.3 })            // E5
    })
  }, [])

  // Slightly more exciting ding — test correct rep
  const playTestCorrect = useCallback(() => {
    schedule((c, t) => {
      tone(c, 659, t,        0.08, { gain: 0.25 })            // E5
      tone(c, 784, t + 0.09, 0.08, { gain: 0.3 })             // G5
      tone(c, 1047, t + 0.18, 0.15, { gain: 0.25 })           // C6
    })
  }, [])

  // Cartoon descending buzz — wrong answer
  const playWrong = useCallback(() => {
    schedule((c, t) => {
      tone(c, 300, t,        0.12, { type: 'sawtooth', gain: 0.15, slide: 200 })
      tone(c, 200, t + 0.13, 0.15, { type: 'sawtooth', gain: 0.1,  slide: 150 })
    })
  }, [])

  // 3-note fanfare — practice phase → test phase
  const playLevelUp = useCallback(() => {
    schedule((c, t) => {
      tone(c, 523, t,        0.1,  { gain: 0.3 })             // C5
      tone(c, 659, t + 0.11, 0.1,  { gain: 0.3 })             // E5
      tone(c, 784, t + 0.22, 0.18, { gain: 0.35 })            // G5
    })
  }, [])

  // Triumphant 5-note win fanfare
  const playWin = useCallback(() => {
    schedule((c, t) => {
      tone(c, 523,  t,        0.09, { gain: 0.3 })             // C5
      tone(c, 659,  t + 0.1,  0.09, { gain: 0.3 })             // E5
      tone(c, 784,  t + 0.2,  0.09, { gain: 0.3 })             // G5
      tone(c, 1047, t + 0.3,  0.09, { gain: 0.35 })            // C6
      tone(c, 1319, t + 0.4,  0.35, { gain: 0.4 })             // E6
      // Harmony underneath
      tone(c, 523,  t + 0.3,  0.45, { gain: 0.15 })
      tone(c, 659,  t + 0.3,  0.45, { gain: 0.15 })
    })
  }, [])

  return { playCorrect, playTestCorrect, playWrong, playLevelUp, playWin }
}
