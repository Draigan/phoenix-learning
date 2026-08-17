import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useGameSettings } from '../context/GameSettingsContext'

// The video reward is earned off the shared star pool, so every game checks
// the same total against the same threshold.
export function useStarReward() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { settings } = useGameSettings()

  // Call with the new shared total right after awarding stars. `delay` lets the
  // win celebration finish before the screen changes. Returns true if the
  // reward was earned.
  return useCallback((totalStars, { delay = 0 } = {}) => {
    const { videoOnWin, pointsToWin } = settings.global
    if (!videoOnWin || totalStars < pointsToWin) return false

    const go = () => navigate('/reward', { state: { from: pathname } })
    delay ? setTimeout(go, delay) : go()
    return true
  }, [navigate, pathname, settings.global])
}
