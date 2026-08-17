import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Celebration from '../components/Celebration'
import StreakBadge from '../components/StreakBadge'
import { Button } from '../components/ui/button'
import { useProfile } from '../context/ProfileContext'
import { useSounds } from '../hooks/useSounds'
import { useSpeech } from '../hooks/useSpeech'
import { useStarReward } from '../hooks/useStarReward'
import { cn } from '../lib/utils'

const LANES = [14, 36, 58, 80]
const ROUND_TARGET = 10
const MAX_MISSES = 3
const FALL_LIMIT = 76
const TICK_MS = 50
const BASE_FALL_SPEED = 0.36
const FALL_SPEED_VARIANCE = 0.08
const FALL_SPEED_PER_HIT = 0.015
const MAX_FALL_SPEED_BONUS = 0.24
const MATH_STREAK_STORAGE_KEY = 'math-streak'
const MODE_OPTIONS = [
  { id: 'add', label: 'Add', symbol: '+', description: 'Addition facts' },
  { id: 'subtract', label: 'Subtract', symbol: '-', description: 'Take away facts' },
  { id: 'times', label: 'Times', symbol: 'x', description: 'Multiplication facts' },
]
const DIFFICULTY_OPTIONS = [
  {
    id: 'easy',
    label: 'Easy',
    description: 'Smaller numbers',
    stars: 3,
    speedMultiplier: 0.92,
    addMin: 1,
    addMax: 6,
    subtractMinLeft: 4,
    subtractMaxLeft: 12,
    subtractMaxRight: 6,
    timesMin: 1,
    timesMax: 5,
  },
  {
    id: 'medium',
    label: 'Medium',
    description: 'Bigger numbers',
    stars: 4,
    speedMultiplier: 1.06,
    addMin: 3,
    addMax: 12,
    subtractMinLeft: 8,
    subtractMaxLeft: 20,
    subtractMaxRight: 10,
    timesMin: 2,
    timesMax: 8,
  },
  {
    id: 'hard',
    label: 'Hard',
    description: 'Challenge mode',
    stars: 5,
    speedMultiplier: 1.22,
    addMin: 5,
    addMax: 20,
    subtractMinLeft: 12,
    subtractMaxLeft: 35,
    subtractMaxRight: 15,
    timesMin: 3,
    timesMax: 12,
  },
]
const DIFFICULTY_BY_ID = Object.fromEntries(DIFFICULTY_OPTIONS.map(option => [option.id, option]))
const SKY_STARS = [
  { top: 10, left: 8, size: 1.2, delay: 0 },
  { top: 18, left: 22, size: 0.9, delay: 0.5 },
  { top: 8, left: 39, size: 1.1, delay: 1.2 },
  { top: 15, left: 55, size: 0.8, delay: 1.8 },
  { top: 11, left: 71, size: 1.25, delay: 0.9 },
  { top: 21, left: 88, size: 0.95, delay: 1.5 },
]
const CLOUDS = [
  { top: 12, left: 7, scale: 1.1, duration: 24, delay: 0 },
  { top: 25, left: 64, scale: 0.85, duration: 20, delay: 2 },
  { top: 6, left: 78, scale: 0.95, duration: 26, delay: 4 },
]

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function starsText(count) {
  return '⭐'.repeat(count)
}

function getModeOption(modeId) {
  return MODE_OPTIONS.find(option => option.id === modeId) ?? MODE_OPTIONS[0]
}

function getDifficultyOption(difficultyId) {
  return DIFFICULTY_BY_ID[difficultyId] ?? DIFFICULTY_OPTIONS[0]
}

function buildEquation(score, modeId, difficultyId) {
  const difficulty = getDifficultyOption(difficultyId)
  const growth = Math.floor(score / 3)
  let left
  let right
  let answer
  let symbol
  let promptWord

  if (modeId === 'subtract') {
    left = randomInt(difficulty.subtractMinLeft, difficulty.subtractMaxLeft + growth * 2)
    right = randomInt(1, Math.min(left - 1, difficulty.subtractMaxRight + growth))
    answer = left - right
    symbol = '-'
    promptWord = 'minus'
  } else if (modeId === 'times') {
    left = randomInt(difficulty.timesMin, difficulty.timesMax + Math.min(growth, 2))
    right = randomInt(difficulty.timesMin, difficulty.timesMax + Math.min(growth, 2))
    answer = left * right
    symbol = 'x'
    promptWord = 'times'
  } else {
    left = randomInt(difficulty.addMin, difficulty.addMax + growth)
    right = randomInt(difficulty.addMin, difficulty.addMax + growth)
    answer = left + right
    symbol = '+'
    promptWord = 'plus'
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    left,
    right,
    answer,
    symbol,
    promptWord,
    lane: LANES[randomInt(0, LANES.length - 1)],
    progress: -8,
    speed: (
      BASE_FALL_SPEED
      + Math.random() * FALL_SPEED_VARIANCE
      + Math.min(score * FALL_SPEED_PER_HIT, MAX_FALL_SPEED_BONUS)
    ) * difficulty.speedMultiplier,
    state: 'falling',
  }
}

function sayEquation(speak, equation) {
  if (!equation) return
  speak(`What is ${equation.left} ${equation.promptWord} ${equation.right}?`, { rate: 0.95 })
}

function NumberButton({ children, className, ...props }) {
  return (
    <button
      className={cn(
        'rounded-2xl border border-white/25 bg-white/14 px-4 py-3 text-3xl font-black text-white',
        'shadow-[0_10px_30px_rgba(15,23,42,0.25)] transition-all active:scale-95',
        'hover:bg-white/20 disabled:opacity-40 disabled:pointer-events-none',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function StatusChip({ label, value, className }) {
  return (
    <div className={cn(
      'rounded-full border border-white/20 bg-slate-950/35 px-4 py-2 text-white shadow-lg backdrop-blur-sm',
      className
    )}>
      <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/65">{label}</div>
      <div className="text-xl font-black">{value}</div>
    </div>
  )
}

function SetupOption({ active, title, subtitle, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-2xl border px-4 py-3 text-left transition-all',
        active
          ? 'border-cyan-300 bg-cyan-300/18 text-white shadow-[0_0_0_1px_rgba(103,232,249,0.4)]'
          : 'border-white/15 bg-white/8 text-white/88 hover:bg-white/12'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-base font-black">{title}</span>
        {badge && <span className="text-lg font-black">{badge}</span>}
      </div>
      <div className="mt-1 text-xs font-medium text-white/65">{subtitle}</div>
    </button>
  )
}

function RoundSetupPicker({ modeId, difficultyId, onModeChange, onDifficultyChange }) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">Mode</div>
        <div className="grid grid-cols-3 gap-2">
          {MODE_OPTIONS.map(option => (
            <SetupOption
              key={option.id}
              active={modeId === option.id}
              title={option.label}
              subtitle={option.description}
              badge={option.symbol}
              onClick={() => onModeChange(option.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">Difficulty</div>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTY_OPTIONS.map(option => (
            <SetupOption
              key={option.id}
              active={difficultyId === option.id}
              title={option.label}
              subtitle={`${option.description} • ${starsText(option.stars)}`}
              badge={starsText(option.stars)}
              onClick={() => onDifficultyChange(option.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MathGame() {
  const { pathname } = useLocation()
  const { getProgress, updateProgress, totalStars, addStars } = useProfile()
  const { playTestCorrect, playWrong, playLevelUp, playWin } = useSounds()
  const { speak, unlock, cancel } = useSpeech()
  const checkReward = useStarReward()
  const saved = getProgress('math')
  const timeoutsRef = useRef(new Set())
  const handledMissIdRef = useRef(null)
  const wasActiveRef = useRef(pathname === '/math')

  const [score, setScore] = useState(0)
  const [misses, setMisses] = useState(0)
  const [selectedMode, setSelectedMode] = useState(saved.mode ?? 'add')
  const [selectedDifficulty, setSelectedDifficulty] = useState(saved.difficulty ?? 'easy')
  const [streak, setStreak] = useState(() => {
    try { return parseInt(sessionStorage.getItem(MATH_STREAK_STORAGE_KEY) || '0', 10) }
    catch { return 0 }
  })
  const [status, setStatus] = useState('ready')
  const [input, setInput] = useState('')
  const [equation, setEquation] = useState(null)
  const [rocketFlight, setRocketFlight] = useState(null)
  const [blast, setBlast] = useState(null)
  const [shakeInput, setShakeInput] = useState(false)
  const [celebrationKey, setCelebrationKey] = useState(0)
  const [roundReward, setRoundReward] = useState(0)
  const difficulty = getDifficultyOption(selectedDifficulty)
  const mode = getModeOption(selectedMode)

  useEffect(() => {
    try { sessionStorage.setItem(MATH_STREAK_STORAGE_KEY, String(streak)) }
    catch {}
  }, [streak])

  function clearPendingTimeouts() {
    timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId))
    timeoutsRef.current.clear()
  }

  function queueTimeout(callback, delay) {
    const timeoutId = window.setTimeout(() => {
      timeoutsRef.current.delete(timeoutId)
      callback()
    }, delay)

    timeoutsRef.current.add(timeoutId)
    return timeoutId
  }

  function clearRoundEffects() {
    clearPendingTimeouts()
    handledMissIdRef.current = null
    cancel()
    setInput('')
    setRocketFlight(null)
    setBlast(null)
    setShakeInput(false)
    setCelebrationKey(0)
  }

  function enterReadyState({ resetStreak = false } = {}) {
    clearRoundEffects()
    setScore(0)
    setMisses(0)
    if (resetStreak) setStreak(0)
    setStatus('ready')
    setRoundReward(0)
    setEquation(null)
  }

  function startRound({ resetStreak = false } = {}) {
    clearRoundEffects()
    setScore(0)
    setMisses(0)
    if (resetStreak) setStreak(0)
    setStatus('playing')
    setRoundReward(0)
    setEquation(buildEquation(0, selectedMode, selectedDifficulty))
  }

  function startNextRound() {
    startRound()
  }

  function resetGame() {
    startRound({ resetStreak: true })
  }

  function appendDigit(digit) {
    unlock()
    if (status !== 'playing' || rocketFlight) return
    setInput(prev => {
      const nextMaxLength = String(equation?.answer ?? 999).length
      if (prev.length >= nextMaxLength) return prev
      if (prev === '0') return digit
      return `${prev}${digit}`
    })
  }

  function removeDigit() {
    unlock()
    if (status !== 'playing' || rocketFlight) return
    setInput(prev => prev.slice(0, -1))
  }

  function clearInput() {
    unlock()
    if (status !== 'playing' || rocketFlight) return
    setInput('')
  }

  function readEquation() {
    unlock()
    if (!equation) return
    sayEquation(speak, equation)
  }

  function selectMode(modeId) {
    setSelectedMode(modeId)
    updateProgress('math', { mode: modeId })
  }

  function selectDifficulty(difficultyId) {
    setSelectedDifficulty(difficultyId)
    updateProgress('math', { difficulty: difficultyId })
  }

  function handleLaunch() {
    unlock()
    if (status !== 'playing' || !equation || equation.state !== 'falling' || rocketFlight || !input) return

    if (Number(input) !== equation.answer) {
      playWrong()
      setInput('')
      setShakeInput(true)
      queueTimeout(() => setShakeInput(false), 420)
      return
    }

    const nextScore = score + 1
    const completedRound = nextScore >= ROUND_TARGET
    const nextStreak = streak + 1
    const hitTop = clamp(equation.progress + 4, 10, FALL_LIMIT)

    setInput('')
    setScore(nextScore)
    setEquation(prev => prev ? { ...prev, state: 'hit' } : prev)
    setRocketFlight({
      id: equation.id,
      answer: input,
      lane: equation.lane,
      top: hitTop,
      launched: false,
    })

    if (completedRound) {
      setRoundReward(difficulty.stars)
      setStreak(nextStreak)
      playWin()
      if ([3, 5, 10].includes(nextStreak)) playLevelUp()
      setCelebrationKey(prev => prev + 1)
      const newTotal = addStars('math', difficulty.stars, {
        lastScore: ROUND_TARGET,
        level: nextStreak,
        mode: selectedMode,
        difficulty: selectedDifficulty,
      })
      checkReward(newTotal, { delay: 2200 })
    } else {
      playTestCorrect()
    }

    queueTimeout(() => {
      setRocketFlight(prev => prev?.id === equation.id ? { ...prev, launched: true } : prev)
    }, 20)

    queueTimeout(() => {
      setBlast({ id: equation.id, lane: equation.lane, top: hitTop })
      setRocketFlight(null)
      if (completedRound) {
        setEquation(null)
        setStatus('roundComplete')
      } else {
        setEquation(buildEquation(nextScore, selectedMode, selectedDifficulty))
      }
    }, 520)

    queueTimeout(() => {
      setBlast(prev => prev?.id === equation.id ? null : prev)
    }, 900)
  }

  useEffect(() => {
    return () => clearPendingTimeouts()
  }, [])

  useEffect(() => {
    if (pathname === '/math') {
      wasActiveRef.current = true
      return
    }

    if (!wasActiveRef.current) return

    wasActiveRef.current = false
    enterReadyState()
  }, [pathname])

  useEffect(() => {
    if (pathname !== '/math' || status !== 'playing' || !equation || equation.state !== 'falling' || rocketFlight) return

    const intervalId = window.setInterval(() => {
      setEquation(prev => {
        if (!prev || prev.state !== 'falling') return prev
        const nextProgress = prev.progress + prev.speed

        if (nextProgress >= FALL_LIMIT) {
          return { ...prev, progress: FALL_LIMIT, state: 'missed' }
        }

        return { ...prev, progress: nextProgress }
      })
    }, TICK_MS)

    return () => clearInterval(intervalId)
  }, [pathname, status, equation?.id, equation?.state, rocketFlight])

  useEffect(() => {
    if (!equation || equation.state !== 'missed' || handledMissIdRef.current === equation.id) return

    handledMissIdRef.current = equation.id
    playWrong()
    setInput('')

    const nextMisses = misses + 1
    setMisses(nextMisses)

    if (nextMisses >= MAX_MISSES) {
      setStreak(0)
      setStatus('gameover')
      updateProgress('math', {
        lastScore: score,
      })
      return
    }

    queueTimeout(() => {
      setEquation(buildEquation(score, selectedMode, selectedDifficulty))
    }, 850)
  }, [difficulty.stars, equation, misses, score, playWrong, selectedDifficulty, selectedMode, updateProgress])

  useEffect(() => {
    if (pathname !== '/math') return

    function onKeyDown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (/^\d$/.test(event.key)) {
        event.preventDefault()
        appendDigit(event.key)
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        removeDigit()
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        clearInput()
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        handleLaunch()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pathname, status, rocketFlight, input, score, equation, misses])

  const heartsLeft = MAX_MISSES - misses
  const controlsDisabled = status !== 'playing' || !!rocketFlight
  const launchDisabled = status !== 'playing' || !input || !equation || equation.state !== 'falling' || !!rocketFlight
  return (
    <div className="relative h-full overflow-hidden bg-[linear-gradient(180deg,#8fe0ff_0%,#4ea3ff_42%,#1d3d7a_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#fff7cc_0%,transparent_34%)] opacity-70" />

      {SKY_STARS.map((star, index) => (
        <div
          key={index}
          className="absolute rounded-full bg-white/95 shadow-[0_0_14px_rgba(255,255,255,0.9)]"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: `${star.size * 0.5}rem`,
            height: `${star.size * 0.5}rem`,
            animation: `twinkle 2.8s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}

      {CLOUDS.map((cloud, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            top: `${cloud.top}%`,
            left: `${cloud.left}%`,
            transform: `scale(${cloud.scale})`,
            animation: `cloudDrift ${cloud.duration}s ease-in-out ${cloud.delay}s infinite alternate`,
          }}
        >
          <div className="relative h-16 w-36 rounded-full bg-white/70 blur-[1px]">
            <div className="absolute -top-4 left-4 h-14 w-14 rounded-full bg-white/80" />
            <div className="absolute -top-6 left-16 h-16 w-16 rounded-full bg-white/85" />
            <div className="absolute -top-3 left-24 h-12 w-12 rounded-full bg-white/75" />
          </div>
        </div>
      ))}

      <div className="absolute inset-x-0 top-0 z-20 p-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <StatusChip label="Round" value={`${score} / ${ROUND_TARGET}`} />
            <StatusChip label="Hearts" value={'❤️'.repeat(heartsLeft) || '💥'} />
          </div>
          <div className="rounded-full border border-white/20 bg-slate-950/35 px-5 py-3 text-center text-white shadow-lg backdrop-blur-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/65">Math Mission</div>
            <div className="text-lg font-black">{mode.label} {difficulty.label}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-white/20 bg-slate-950/35 px-4 py-2 text-white shadow-lg backdrop-blur-sm">
              <StreakBadge streak={streak} />
            </div>
            <div className="rounded-full border border-white/20 bg-slate-950/35 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm">
              ⭐ {totalStars}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-5 top-24 bottom-44 overflow-hidden rounded-[2rem] border border-white/20 bg-slate-950/16 shadow-[0_30px_80px_rgba(15,23,42,0.3)] backdrop-blur-[2px]">
        {equation && (
          <div
            className={cn(
              'absolute z-20 -translate-x-1/2 rounded-[1.75rem] border-4 border-white/70 bg-[#fff9de] px-6 py-4',
              'shadow-[0_20px_35px_rgba(15,23,42,0.28)] transition-all duration-300',
              equation.state === 'hit' && 'scale-125 opacity-0',
              equation.state === 'missed' && 'translate-y-8 opacity-45'
            )}
            style={{
              left: `${equation.lane}%`,
              top: `${equation.progress}%`,
            }}
          >
            <div className="text-center text-xs font-black uppercase tracking-[0.28em] text-amber-600">Solve It</div>
            <div className="mt-1 text-5xl font-black tracking-wide text-slate-800">
              {equation.left}{equation.symbol}{equation.right}=
            </div>
          </div>
        )}

        {rocketFlight && (
          <div
            className="absolute z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-all duration-500 ease-out"
            style={{
              left: rocketFlight.launched ? `${rocketFlight.lane}%` : '50%',
              top: rocketFlight.launched ? `${rocketFlight.top}%` : '86%',
              transform: rocketFlight.launched
                ? 'translate(-50%, -50%) scale(1.08)'
                : 'translate(-50%, -50%) scale(0.9)',
            }}
          >
            <div className="rounded-full bg-amber-200 px-3 py-1 text-lg font-black text-amber-950 shadow-lg">
              {rocketFlight.answer}
            </div>
            <div className="text-6xl drop-shadow-[0_10px_16px_rgba(15,23,42,0.45)]">🚀</div>
          </div>
        )}

        {blast && (
          <div
            className="absolute z-40 -translate-x-1/2 -translate-y-1/2 text-7xl"
            style={{
              left: `${blast.lane}%`,
              top: `${blast.top}%`,
              animation: 'blastPop 0.55s ease-out forwards',
            }}
          >
            💥
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent_0%,rgba(15,23,42,0.2)_20%,rgba(15,23,42,0.65)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,#244b91_0%,#0f172a_100%)]" />
        <div
          className="absolute inset-x-0 bottom-16 h-14 bg-slate-950/70"
          style={{ clipPath: 'polygon(0 100%,0 54%,8% 62%,13% 28%,19% 70%,25% 48%,31% 76%,40% 34%,47% 82%,56% 42%,64% 72%,73% 30%,81% 68%,88% 44%,94% 64%,100% 50%,100% 100%)' }}
        />

        <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className={cn(
            'rounded-full border border-white/35 bg-white/90 px-6 py-2 text-4xl font-black text-slate-900 shadow-xl',
            shakeInput && 'animate-[shake_0.4s_ease-in-out]'
          )}>
            {input || '?'}
          </div>
          <div className="relative text-8xl drop-shadow-[0_14px_20px_rgba(15,23,42,0.4)]">
            🚀
            <div className="absolute left-1/2 top-[82%] h-8 w-6 -translate-x-1/2 rounded-b-full bg-gradient-to-b from-yellow-200 via-orange-400 to-orange-600 blur-[1px]" />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 border-t border-white/15 bg-slate-950/55 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-end gap-4">
          <div className={cn(
            'grid flex-1 grid-cols-5 gap-3',
            shakeInput && 'animate-[shake_0.4s_ease-in-out]'
          )}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(digit => (
              <NumberButton
                key={digit}
                onClick={() => appendDigit(digit)}
                disabled={controlsDisabled}
              >
                {digit}
              </NumberButton>
            ))}
            <NumberButton onClick={removeDigit} disabled={controlsDisabled} className="text-2xl">
              ⌫
            </NumberButton>
            <NumberButton onClick={clearInput} disabled={controlsDisabled} className="text-2xl">
              Clear
            </NumberButton>
            <div className="col-span-3 flex items-center justify-end gap-3 pl-2">
              <Button size="lg" variant="secondary" onClick={readEquation} disabled={controlsDisabled || !equation} className="h-16 rounded-2xl px-6 text-lg">
                🔊 Say it
              </Button>
              <Button size="lg" onClick={handleLaunch} disabled={launchDisabled} className="h-16 rounded-2xl px-8 text-lg font-black">
                Launch Rocket
              </Button>
            </div>
          </div>
        </div>
      </div>

      {status === 'ready' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm">
          <div className="mx-4 flex w-full max-w-2xl flex-col items-center gap-5 rounded-[2rem] border border-white/20 bg-slate-950/75 p-8 text-center text-white shadow-2xl">
            <div className="text-6xl">🚀</div>
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-200/75">Math Mission</div>
              <h2 className="mt-1 text-3xl font-black">Ready for rocket answers?</h2>
            </div>
            <RoundSetupPicker
              modeId={selectedMode}
              difficultyId={selectedDifficulty}
              onModeChange={selectMode}
              onDifficultyChange={selectDifficulty}
            />
            <div className="grid w-full grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/60">Mode</div>
                <div className="text-3xl font-black">{mode.label}</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/60">Reward</div>
                <div className="text-3xl font-black">{starsText(difficulty.stars)}</div>
              </div>
            </div>
            <Button size="lg" onClick={() => startRound()} className="h-14 w-full rounded-2xl text-lg font-black">
              Start Game
            </Button>
          </div>
        </div>
      )}

      {status === 'roundComplete' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
          <div className="mx-4 flex w-full max-w-2xl flex-col items-center gap-5 rounded-[2rem] border border-white/20 bg-slate-950/75 p-8 text-center text-white shadow-2xl">
            <div className="text-6xl">🌟</div>
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-200/75">Round Complete</div>
              <h2 className="mt-1 text-3xl font-black">{starsText(roundReward)} +{roundReward} stars!</h2>
            </div>
            <RoundSetupPicker
              modeId={selectedMode}
              difficultyId={selectedDifficulty}
              onModeChange={selectMode}
              onDifficultyChange={selectDifficulty}
            />
            <div className="grid w-full grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/60">Solved</div>
                <div className="text-3xl font-black">{ROUND_TARGET}</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/60">Next Reward</div>
                <div className="text-3xl font-black">{starsText(difficulty.stars)}</div>
              </div>
            </div>
            <Button size="lg" onClick={startNextRound} className="h-14 w-full rounded-2xl text-lg font-black">
              Next Round
            </Button>
          </div>
        </div>
      )}

      {status === 'gameover' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
          <div className="mx-4 flex w-full max-w-2xl flex-col items-center gap-5 rounded-[2rem] border border-white/20 bg-slate-950/75 p-8 text-center text-white shadow-2xl">
            <div className="text-6xl">🛸</div>
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-200/75">Game Over</div>
              <h2 className="mt-1 text-3xl font-black">The sky got too crowded.</h2>
            </div>
            <RoundSetupPicker
              modeId={selectedMode}
              difficultyId={selectedDifficulty}
              onModeChange={selectMode}
              onDifficultyChange={selectDifficulty}
            />
            <div className="grid w-full grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/60">Round</div>
                <div className="text-3xl font-black">{score} / {ROUND_TARGET}</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/60">Next Reward</div>
                <div className="text-3xl font-black">{starsText(difficulty.stars)}</div>
              </div>
            </div>
            <Button size="lg" onClick={resetGame} className="h-14 w-full rounded-2xl text-lg font-black">
              Start Again
            </Button>
          </div>
        </div>
      )}

      {celebrationKey > 0 && <Celebration key={celebrationKey} />}
    </div>
  )
}
