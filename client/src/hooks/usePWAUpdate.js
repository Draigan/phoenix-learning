import { useEffect } from 'react'

export function usePWAUpdate() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    function checkForUpdate() {
      if (document.visibilityState !== 'visible') return
      navigator.serviceWorker.getRegistration()
        .then(reg => reg?.update())
        .catch(() => {})
    }

    document.addEventListener('visibilitychange', checkForUpdate)
    return () => document.removeEventListener('visibilitychange', checkForUpdate)
  }, [])
}
