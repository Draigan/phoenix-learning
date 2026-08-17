import { useMemo } from 'react'

const EMOJIS = ['⭐','🌟','✨','💫','🎉','🎊','⭐','🌟','✨','💫']

function generateStars() {
  return Array.from({ length: 30 }, (_, i) => {
    const angle    = (i / 30) * 360 + (Math.random() - 0.5) * 24
    const dist     = 100 + Math.random() * 220
    const rad      = (angle * Math.PI) / 180
    return {
      id:       i,
      emoji:    EMOJIS[i % EMOJIS.length],
      tx:       Math.cos(rad) * dist,
      ty:       Math.sin(rad) * dist,
      rot:      (Math.random() - 0.5) * 540,
      delay:    Math.random() * 0.25,
      duration: 0.8 + Math.random() * 0.5,
      size:     1.4 + Math.random() * 1.4,
    }
  })
}

// Use `celebrationKey` as the React key on this component to retrigger
export default function Celebration() {
  const stars = useMemo(generateStars, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      {stars.map(s => (
        <div
          key={s.id}
          className="absolute"
          style={{
            fontSize:        `${s.size}rem`,
            animationName:   'starFly',
            animationDuration: `${s.duration}s`,
            animationDelay:  `${s.delay}s`,
            animationFillMode: 'both',
            animationTimingFunction: 'ease-out',
            '--tx': `${s.tx}px`,
            '--ty': `${s.ty}px`,
            '--rot': `${s.rot}deg`,
          }}
        >
          {s.emoji}
        </div>
      ))}
    </div>
  )
}
