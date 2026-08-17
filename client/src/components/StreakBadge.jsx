import { cn } from '../lib/utils'

const STREAK_TIERS = [
  { min: 10, flames: '💥🔥💥', textClass: 'text-xl text-orange-400' },
  { min: 5,  flames: '🔥🔥🔥', textClass: 'text-lg text-orange-500' },
  { min: 3,  flames: '🔥🔥',   textClass: 'text-base' },
  { min: 1,  flames: '🔥',     textClass: 'text-sm' },
]

export default function StreakBadge({ streak }) {
  if (streak === 0) {
    return <span className="text-sm font-semibold opacity-25">🔥 0</span>
  }

  const tier = STREAK_TIERS.find(t => streak >= t.min)

  return (
    <span
      key={streak}
      className={cn('font-bold tabular-nums', tier.textClass, 'animate-[streakPop_0.35s_ease-out]')}
    >
      {tier.flames} {streak}
    </span>
  )
}
