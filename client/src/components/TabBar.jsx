import { useRef, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { cn } from '../lib/utils'

const TABS = [
  { to: '/spelling',  label: 'Spelling',   icon: '🔤' },
  { to: '/math',      label: 'Math',        icon: '➕' },
  { to: '/test',      label: 'Geography',   icon: '🌍' },
]

const LONG_PRESS_MS = 1000
// SVG circle r=18 in 40×40 viewBox → circumference ≈ 113
const CIRCUMFERENCE = 2 * Math.PI * 18

export default function TabBar() {
  const navigate   = useNavigate()
  const { pathname } = useLocation()
  const [pressing, setPressing] = useState(false)
  const timerRef   = useRef(null)

  function startPress() {
    setPressing(true)
    timerRef.current = setTimeout(() => {
      setPressing(false)
      navigate('/settings')
    }, LONG_PRESS_MS)
  }

  function cancelPress() {
    clearTimeout(timerRef.current)
    setPressing(false)
  }

  const settingsActive = pathname === '/settings'

  return (
    <nav className="flex shrink-0 border-t border-border bg-background">
      {TABS.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => cn(
            'flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors',
            isActive
              ? 'text-primary bg-accent'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
          )}
        >
          <span className="text-2xl leading-none">{icon}</span>
          {label}
        </NavLink>
      ))}

      {/* Settings — long press only */}
      <button
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors select-none',
          settingsActive
            ? 'text-primary bg-accent'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
        )}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={e => e.preventDefault()}
      >
        <div className="relative w-8 h-8 flex items-center justify-center">
          <span className="text-2xl leading-none">⚙️</span>
          {pressing && (
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 40 40"
              style={{ transform: 'rotate(-90deg)' }}
            >
              <circle
                cx="20" cy="20" r="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE}
                style={{
                  animation: `fillRing ${LONG_PRESS_MS}ms linear forwards`,
                }}
              />
            </svg>
          )}
        </div>
        Settings
      </button>
    </nav>
  )
}
