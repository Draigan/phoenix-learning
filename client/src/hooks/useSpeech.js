import { useCallback, useRef, useEffect, useState } from 'react'

// Voices load asynchronously — wait for them then pick the best English one.
function pickBestVoice(en) {
  if (!en.length) return null

  const priority = [
    v => v.name.includes('Premium'),
    v => v.name.includes('Enhanced'),
    v => v.name.includes('Google') && v.lang === 'en-US',
    v => v.name.includes('Google'),
    v => v.lang === 'en-US',
    v => v.lang === 'en-GB',
  ]

  for (const test of priority) {
    const match = en.find(test)
    if (match) return match
  }
  return en[0]
}

export function getEnglishVoices() {
  return (window.speechSynthesis?.getVoices() ?? []).filter(v => v.lang.startsWith('en'))
}

export function useSpeech({ voiceName } = {}) {
  const voiceRef       = useRef(null)
  const voiceNameRef   = useRef(voiceName)
  voiceNameRef.current = voiceName
  const unlockedRef    = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!window.speechSynthesis) return

    function loadVoices() {
      const en = getEnglishVoices()
      if (!en.length) return
      if (voiceNameRef.current) {
        voiceRef.current = en.find(v => v.name === voiceNameRef.current) ?? pickBestVoice(en)
      } else {
        voiceRef.current = pickBestVoice(en)
      }
      setReady(true)
    }

    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [voiceName])

  // Backgrounding the app can leave the speech queue jammed on a half-spoken
  // utterance, or parked in a paused state where speak() is a no-op. Clear it
  // on the way out and re-prime on the way back in.
  useEffect(() => {
    if (!window.speechSynthesis) return

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        window.speechSynthesis.resume()
        unlockedRef.current = false   // next interaction re-primes the engine
      } else {
        window.speechSynthesis.cancel()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  const speak = useCallback((text, { rate = 0.85, pitch = 1 } = {}) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    window.speechSynthesis.resume()   // no-op unless the queue was left paused

    const utterance     = new SpeechSynthesisUtterance(text)
    utterance.lang      = 'en-US'
    utterance.rate      = rate
    utterance.pitch     = pitch
    utterance.volume    = 1
    if (voiceRef.current) utterance.voice = voiceRef.current

    window.speechSynthesis.speak(utterance)
    unlockedRef.current = true
  }, [])

  const unlock = useCallback(() => {
    if (unlockedRef.current || !window.speechSynthesis) return
    const silent = new SpeechSynthesisUtterance('')
    if (voiceRef.current) silent.voice = voiceRef.current
    window.speechSynthesis.speak(silent)
    unlockedRef.current = true
  }, [])

  const cancel = useCallback(() => window.speechSynthesis?.cancel(), [])

  return { speak, unlock, cancel, ready }
}
