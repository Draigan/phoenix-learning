import { useState, useEffect, useCallback } from 'react'
import Keyboard from '../components/Keyboard'
import { useProfile } from '../context/ProfileContext'
import { themes, getTheme } from '../data/spellingWords'
import { useSpeech } from '../hooks/useSpeech'
import { useSounds } from '../hooks/useSounds'
import { useStarReward } from '../hooks/useStarReward'
import { useGameSettings } from '../context/GameSettingsContext'
import Celebration from '../components/Celebration'
import StreakBadge from '../components/StreakBadge'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'

function ThemePicker({ onSelect, selectedThemeId }) {
  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-4 gap-4 overflow-hidden">
      <h2 className="text-2xl font-bold text-center shrink-0">Pick a theme!</h2>
      <div className="grid grid-cols-4 gap-4 flex-1 content-start overflow-y-auto pb-2">
        {themes.map(t => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            style={{ background: t.gradient }}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-2xl py-8',
              'text-white font-bold shadow-lg',
              'hover:scale-105 active:scale-95 transition-transform',
              selectedThemeId === t.id && 'ring-4 ring-white/80 ring-offset-2 ring-offset-background'
            )}
          >
            <span className="text-5xl">{t.emoji}</span>
            <span className="text-xl">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function pickWords(themeId) {
  const theme = getTheme(themeId)
  const pool = theme?.words ?? themes[0].words
  return [...pool].sort(() => Math.random() - 0.5).slice(0, 10)
}

export default function Spelling() {
  const { getProgress, updateProgress, totalStars, addStars } = useProfile()
  const checkReward = useStarReward()
  const { settings } = useGameSettings()
  const { speak, unlock } = useSpeech({ voiceName: settings.spelling.voiceName })
  const { playCorrect, playTestCorrect, playWrong, playLevelUp, playWin } = useSounds()
  const { practiceReps, testReps } = settings.spelling

  const saved = getProgress('spelling')

  const [themeId,  setThemeId]  = useState(saved.theme ?? null)
  const [pendingThemeId, setPendingThemeId] = useState(saved.nextTheme ?? null)
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(() => !saved.theme)
  const [words,    setWords]    = useState(() => {
    if (saved.theme && Array.isArray(saved.words) && saved.words.length) return saved.words
    return saved.theme ? pickWords(saved.theme) : []
  })
  const [wordIdx,  setWordIdx]  = useState(() => {
    const idx = saved.wordIdx ?? 0
    return idx >= 0 && idx < (saved.words?.length ?? 0) ? idx : 0
  })
  const [phase,    setPhase]    = useState(saved.phase ?? 'practice')
  const [repsLeft, setRepsLeft] = useState(() => {
    if (typeof saved.repsLeft === 'number') return saved.repsLeft
    return (saved.phase ?? 'practice') === 'test' ? testReps : practiceReps
  })
  const [input,          setInput]          = useState([])
  const [status,         setStatus]         = useState(() => saved.status === 'done' ? 'done' : 'typing')
  const [shake,          setShake]          = useState(false)
  const [celebrationKey, setCelebrationKey] = useState(0)
  const [streak, setStreak] = useState(() => {
    try { return parseInt(sessionStorage.getItem('streak') || '0', 10) }
    catch { return 0 }
  })

  useEffect(() => {
    try { sessionStorage.setItem('streak', String(streak)) }
    catch {}
  }, [streak])

  useEffect(() => {
    if (!themeId) return
    updateProgress('spelling', {
      words,
      wordIdx,
      phase,
      repsLeft,
      status: status === 'done' ? 'done' : undefined,
    })
  }, [themeId, words, wordIdx, phase, repsLeft, status])

  function resetAttemptState() {
    setInput([])
    setStatus('typing')
  }

  function resetWordState() {
    resetAttemptState()
    setPhase('practice')
    setRepsLeft(practiceReps)
  }

  function applyTheme(id) {
    setThemeId(id)
    setPendingThemeId(null)
    setWords(pickWords(id))
    setWordIdx(0)
    resetWordState()
    setIsThemePickerOpen(false)
    updateProgress('spelling', { theme: id, nextTheme: null })
  }

  const word       = words[wordIdx]
  const showWord   = phase === 'practice'
  const wordStars  = word ? Math.max(3, word.length) : 0

  const practiceCompleted = phase === 'practice' ? practiceReps - repsLeft : practiceReps
  const testCompleted     = phase === 'test'
    ? (status === 'done' ? testReps : testReps - repsLeft)
    : 0

  const sayWord = useCallback(() => { if (word) speak(word) }, [speak, word])

  useEffect(() => { if (word) speak(word) }, [word])
  useEffect(() => { if (phase === 'test' && word) speak(word) }, [phase])

  const handleKey = useCallback((key) => {
    if (!word) return
    unlock()
    if (status !== 'typing') return
    if (key === '⌫') {
      setInput(prev => prev.slice(0, -1))
    } else if (input.length < word.length) {
      speak(key.toLowerCase(), { rate: 1.0 })
      setInput(prev => [...prev, key.toLowerCase()])
    }
  }, [status, input, word, unlock])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.metaKey || e.ctrlKey) return
      if (e.key === 'Backspace') { handleKey('⌫'); return }
      if (e.key === 'Enter')     { handleSubmit();  return }
      if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase())
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleKey])

  function handleSubmit() {
    if (!word || status !== 'typing' || input.length !== word.length) return

    if (input.join('') !== word) {
      playWrong()
      setStatus('wrong')
      setShake(true)
      speak(word)
      setTimeout(() => {
        setShake(false)
        setInput([])
        setStatus('typing')
      }, 700)
      return
    }

    const next = repsLeft - 1

    if (next > 0) {
      phase === 'test' ? playTestCorrect() : playCorrect()
      setRepsLeft(next)
      setStatus('correct')
      return
    }

    if (phase === 'practice') {
      playLevelUp()
      setPhase('test')
      setRepsLeft(testReps)
      setStatus('correct')
    } else {
      playWin()
      setCelebrationKey(k => k + 1)
      const newStreak = streak + 1
      setStreak(newStreak)
      if ([3, 5, 10].includes(newStreak)) playLevelUp()
      setStatus('done')
      checkReward(addStars('spelling', wordStars), { delay: 2200 })
    }
  }

  useEffect(() => {
    if (status !== 'correct') return
    const t = setTimeout(() => {
      setInput([])
      setStatus('typing')
    }, 800)
    return () => clearTimeout(t)
  }, [status])

  useEffect(() => { setCelebrationKey(0) }, [wordIdx])

  function selectTheme(id) {
    if (!themeId || !getTheme(themeId) || words.length === 0) {
      applyTheme(id)
      return
    }

    if (id === themeId) {
      setPendingThemeId(null)
      setIsThemePickerOpen(false)
      updateProgress('spelling', { theme: themeId, nextTheme: null })
      return
    }

    setPendingThemeId(id)
    setIsThemePickerOpen(false)
    updateProgress('spelling', { theme: themeId, nextTheme: id })
  }

  function goToThemePicker() {
    setIsThemePickerOpen(true)
  }

  function nextWord() {
    if (pendingThemeId) {
      applyTheme(pendingThemeId)
      return
    }

    const nextIdx = wordIdx + 1
    if (nextIdx >= words.length) {
      setWords(pickWords(themeId))
      setWordIdx(0)
    } else {
      setWordIdx(nextIdx)
    }
    resetWordState()
  }

  const theme = themeId ? getTheme(themeId) : null
  const pendingTheme = pendingThemeId ? getTheme(pendingThemeId) : null

  // ── Theme picker ─────────────────────────────────────────────────────────────
  if (isThemePickerOpen || !themeId || !theme) {
    return <ThemePicker onSelect={selectTheme} selectedThemeId={pendingThemeId ?? themeId ?? saved.theme} />
  }

  // ── Game ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-between h-full px-4 pt-4 pb-2 gap-3">

      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-2xl">
        <button
          onClick={goToThemePicker}
          className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>{theme.emoji}</span>
          <span>{theme.label}</span>
        </button>
        <span className="text-sm text-muted-foreground font-medium">
          Word {wordIdx + 1} / {words.length}
        </span>
        <div className="flex items-center gap-3">
          <StreakBadge streak={streak} />
          <div className="flex items-center gap-1 text-sm font-semibold">
            ⭐ {totalStars}
          </div>
          <button
            onClick={() => { resetWordState(); setStreak(0) }}
            className={cn('text-xl text-muted-foreground hover:text-foreground transition-all', phase !== 'test' && 'invisible')}
          >
            🔄
          </button>
        </div>
      </div>

      {pendingTheme && (
        <div className="text-sm font-medium text-muted-foreground">
          Next word will switch to {pendingTheme.emoji} {pendingTheme.label}
        </div>
      )}

      {/* Progress dots */}
      <div className="flex items-center gap-5">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs text-muted-foreground uppercase tracking-widest">Practice</span>
          <div className="flex gap-2">
            {Array.from({ length: practiceReps }).map((_, i) => (
              <div key={i} className={cn(
                'w-3 h-3 rounded-full transition-all duration-300',
                i < practiceCompleted ? 'bg-primary scale-110' : 'bg-border'
              )} />
            ))}
          </div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs text-muted-foreground uppercase tracking-widest">Test</span>
          <div className="flex gap-2">
            {Array.from({ length: testReps }).map((_, i) => (
              <div key={i} className={cn(
                'w-3 h-3 rounded-full transition-all duration-300',
                i < testCompleted ? 'bg-green-500 scale-110' : 'bg-border'
              )} />
            ))}
          </div>
        </div>
      </div>

      {/* Word display + controls */}
      <div className="flex items-center gap-4 h-16">
        {showWord ? (
          <span className="text-5xl font-bold tracking-widest uppercase text-primary">
            {word}
          </span>
        ) : (
          <span className="text-4xl tracking-[0.4em] text-muted-foreground/40">
            {'—'.repeat(word.length)}
          </span>
        )}
        <button
          onClick={sayWord}
          className="text-3xl hover:scale-110 active:scale-95 transition-transform"
          title="Hear the word"
        >
          🔊
        </button>
      </div>

      {/* Letter boxes */}
      <div className={cn('flex gap-3', shake && 'animate-[shake_0.4s_ease-in-out]')}>
        {word.split('').map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-14 h-14 rounded-xl border-2 flex items-center justify-center',
              'text-2xl font-bold uppercase transition-all duration-200',
              !input[i]                          && 'border-border bg-background',
              input[i] && status === 'typing'    && 'border-primary bg-primary/10',
              input[i] && status === 'correct'   && 'border-green-500 bg-green-500/20 text-green-600',
              input[i] && status === 'wrong'     && 'border-destructive bg-destructive/10 text-destructive',
              status === 'done'                  && 'border-yellow-400 bg-yellow-400/20 text-yellow-600',
            )}
          >
            {input[i] ?? ''}
          </div>
        ))}
      </div>

      {/* Feedback / action row */}
      <div className="h-16 flex items-center justify-center">
        {status === 'typing' && (
          <Button size="lg" onClick={handleSubmit} disabled={input.length !== word.length} className="px-12 text-lg">
            Check ✓
          </Button>
        )}
        {status === 'correct' && (
          <span className={cn('text-xl font-bold', phase === 'test' ? 'text-green-500' : 'text-primary')}>
            {phase === 'test' ? '🌟 Correct!' : '✓ Good!'}
          </span>
        )}
        {status === 'wrong' && (
          <span className="text-xl font-semibold text-destructive">Try again!</span>
        )}
        {status === 'done' && (
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold">
              {'⭐'.repeat(Math.min(wordStars, 10))} Word complete! +{wordStars}
            </span>
            <Button size="lg" onClick={nextWord}>
              {wordIdx + 1 >= words.length ? 'Again →' : 'Next Word →'}
            </Button>
          </div>
        )}
      </div>

      {/* Keyboard */}
      <Keyboard onKey={handleKey} disabled={status !== 'typing'} />

      {/* Star burst on word complete */}
      {celebrationKey > 0 && <Celebration key={celebrationKey} />}
    </div>
  )
}
