import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme, themes, fonts } from '../context/ThemeContext'
import { useProfile } from '../context/ProfileContext'
import { useGameSettings } from '../context/GameSettingsContext'
import { getEnglishVoices } from '../hooks/useSpeech'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseVideoId(input) {
  const s = input.trim()
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const re of patterns) {
    const m = s.match(re)
    if (m) return m[1]
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s
  return null
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Stepper({ value, onChange, min, max }) {
  const intervalRef = useRef(null)
  const timeoutRef  = useRef(null)
  const valueRef    = useRef(value)
  valueRef.current  = value

  function startHold(delta) {
    const next = Math.min(max, Math.max(min, valueRef.current + delta))
    onChange(next)
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        const n = Math.min(max, Math.max(min, valueRef.current + delta))
        onChange(n)
      }, 80)
    }, 400)
  }

  function stopHold() {
    clearTimeout(timeoutRef.current)
    clearInterval(intervalRef.current)
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onPointerDown={() => startHold(-1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        disabled={value <= min}
        className="w-10 h-10 rounded-xl border border-border bg-background text-xl font-bold hover:bg-accent disabled:opacity-30 transition-all select-none"
      >−</button>
      <span className="w-10 text-center text-xl font-bold tabular-nums">{value}</span>
      <button
        onPointerDown={() => startHold(1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        disabled={value >= max}
        className="w-10 h-10 rounded-xl border border-border bg-background text-xl font-bold hover:bg-accent disabled:opacity-30 transition-all select-none"
      >+</button>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-14 h-7 rounded-full transition-colors duration-200',
        value ? 'bg-primary' : 'bg-border'
      )}
    >
      <span className={cn(
        'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
        value ? 'translate-x-8' : 'translate-x-1'
      )} />
    </button>
  )
}

function Row({ label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{label}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-border" />
}

function VoicePicker({ voiceName, onChange }) {
  const [voices, setVoices] = useState([])

  useEffect(() => {
    function load() {
      const v = getEnglishVoices()
      if (v.length) setVoices(v)
    }
    load()
    window.speechSynthesis?.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load)
  }, [])

  function preview(v) {
    window.speechSynthesis?.cancel()
    const u = new SpeechSynthesisUtterance('spelling')
    u.voice = v
    u.rate  = 0.85
    u.lang  = 'en-US'
    window.speechSynthesis?.speak(u)
    onChange(v.name)
  }

  if (!voices.length) return <p className="text-sm text-muted-foreground">No voices found</p>

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onChange(null)}
          className={cn(
            'px-3 py-1.5 rounded-xl border text-sm font-medium transition-all',
            !voiceName ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary hover:bg-accent'
          )}
        >
          Auto
        </button>
        {voices.map(v => {
          const isPremium  = v.name.includes('Premium')
          const isEnhanced = v.name.includes('Enhanced')
          const label = v.name
            .replace(' (Premium)', '')
            .replace(' (Enhanced)', '')
          const badge = isPremium ? ' ★★' : isEnhanced ? ' ★' : ''
          return (
            <button
              key={v.name}
              onClick={() => preview(v)}
              className={cn(
                'px-3 py-1.5 rounded-xl border text-sm font-medium transition-all',
                voiceName === v.name
                  ? 'bg-primary text-primary-foreground border-primary'
                  : (isPremium || isEnhanced)
                    ? 'border-amber-400/60 hover:border-primary hover:bg-accent'
                    : 'border-border hover:border-primary hover:bg-accent'
              )}
            >
              {label}{badge}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">Tap a voice to preview it saying "spelling". ★ = Enhanced, ★★ = Premium.</p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Settings() {
  const { theme, setTheme, font, setFont }  = useTheme()
  const { activeProfile, deleteProfile, resetStars } = useProfile()
  const { settings, update }                = useGameSettings()
  const navigate                            = useNavigate()

  const [confirmDelete,     setConfirmDelete]     = useState(false)
  const [confirmReset,      setConfirmReset]       = useState(false)
  const [videoUrl,          setVideoUrl]           = useState('')
  const [videoTitle,        setVideoTitle]         = useState('')
  const [videoUrlError,     setVideoUrlError]      = useState('')

  const sp = settings.spelling
  const gl = settings.global

  function handleDeleteProfile() {
    deleteProfile(activeProfile.id)
    navigate('/profiles')
  }

  function handleResetPoints() {
    resetStars()
    setConfirmReset(false)
  }

  function handleAddVideo() {
    const videoId = parseVideoId(videoUrl)
    if (!videoId) { setVideoUrlError('Paste a YouTube URL or video ID'); return }
    if (!videoTitle.trim()) { setVideoUrlError('Add a title for the video'); return }
    const newVideo = { id: String(Date.now()), title: videoTitle.trim(), videoId }
    update('global', { videos: [...gl.videos, newVideo] })
    setVideoUrl('')
    setVideoTitle('')
    setVideoUrlError('')
  }

  function handleRemoveVideo(id) {
    update('global', { videos: gl.videos.filter(v => v.id !== id) })
  }

  return (
    <div className="flex flex-col gap-8 p-8 h-full overflow-y-auto">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* ── Profile ─────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">Profile</h2>
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border">
          <span className="text-4xl">{activeProfile?.avatar}</span>
          <span className="text-xl font-semibold flex-1">{activeProfile?.name}</span>
          <Button variant="outline" onClick={() => navigate('/profiles')}>Switch</Button>
          {!confirmDelete ? (
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>Delete</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteProfile}>Confirm</Button>
            </div>
          )}
        </div>
      </section>

      {/* ── Spelling ────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">Spelling</h2>
        <div className="flex flex-col gap-4 p-4 rounded-xl border border-border">
          <Row label="Practice rounds" description="Times to spell with the word showing">
            <Stepper value={sp.practiceReps} min={1} max={10}
              onChange={v => update('spelling', { practiceReps: v })} />
          </Row>
          <Divider />
          <Row label="Test rounds" description="Times to spell from memory">
            <Stepper value={sp.testReps} min={1} max={5}
              onChange={v => update('spelling', { testReps: v })} />
          </Row>
          <Divider />
          <Row label="Starting level" description="Word difficulty when a round begins">
            <div className="flex gap-2">
              {[1,2,3,4].map(l => (
                <button key={l} onClick={() => update('spelling', { defaultLevel: l })}
                  className={cn(
                    'w-11 h-11 rounded-xl font-bold border-2 transition-all text-sm',
                    sp.defaultLevel === l
                      ? 'bg-primary text-primary-foreground border-primary scale-105'
                      : 'border-border hover:border-primary'
                  )}
                >L{l}</button>
              ))}
            </div>
          </Row>
          <Divider />
          <div className="flex flex-col gap-2">
            <p className="font-semibold">Voice</p>
            <p className="text-sm text-muted-foreground">Choose the voice used to say words and letters</p>
            <VoicePicker
              voiceName={sp.voiceName}
              onChange={v => update('spelling', { voiceName: v })}
            />
          </div>
        </div>
      </section>

      {/* ── Rewards ─────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">Rewards</h2>
        <div className="flex flex-col gap-4 p-4 rounded-xl border border-border">

          <Row label="Points to win" description="Stars needed to unlock a video reward">
            <Stepper value={gl.pointsToWin} min={5} max={200}
              onChange={v => update('global', { pointsToWin: v })} />
          </Row>

          <Divider />

          <Row label="Video reward on win" description="Show video selection when points are reached">
            <Toggle value={gl.videoOnWin} onChange={v => update('global', { videoOnWin: v })} />
          </Row>

          <Divider />

          <Row label="Reset points" description="Clear all earned stars for this profile">
            {!confirmReset ? (
              <Button variant="outline" onClick={() => setConfirmReset(true)}>Reset</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setConfirmReset(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleResetPoints}>Confirm</Button>
              </div>
            )}
          </Row>

          <Divider />

          {/* Video list */}
          <div className="flex flex-col gap-3">
            <p className="font-semibold">YouTube videos</p>

            {gl.videos.length > 0 && (
              <div className="flex flex-col gap-2">
                {gl.videos.map(v => (
                  <div key={v.id} className="flex items-center gap-3 p-2 rounded-xl bg-muted/50">
                    <img
                      src={`https://img.youtube.com/vi/${v.videoId}/default.jpg`}
                      alt={v.title}
                      className="w-16 h-12 rounded-lg object-cover shrink-0"
                    />
                    <span className="flex-1 text-sm font-medium truncate">{v.title}</span>
                    <button
                      onClick={() => handleRemoveVideo(v.id)}
                      className="text-destructive hover:opacity-70 text-lg px-2"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Add video form */}
            <div className="flex flex-col gap-2 pt-1">
              <input
                type="text"
                placeholder="Video title"
                value={videoTitle}
                onChange={e => { setVideoTitle(e.target.value); setVideoUrlError('') }}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="YouTube URL or video ID"
                  value={videoUrl}
                  onChange={e => { setVideoUrl(e.target.value); setVideoUrlError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleAddVideo()}
                  className="flex-1 px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button onClick={handleAddVideo} disabled={!videoUrl.trim() || !videoTitle.trim()}>
                  Add
                </Button>
              </div>
              {videoUrlError && (
                <p className="text-sm text-destructive">{videoUrlError}</p>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* ── Theme ───────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">Theme</h2>
        <div className="flex flex-wrap gap-3">
          {themes.map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl p-3 border-2 transition-all',
                theme === t.id ? 'border-primary scale-105' : 'border-border hover:border-muted-foreground'
              )}
            >
              <div className="w-14 h-10 rounded-lg flex items-center justify-center" style={{ background: t.swatchBg }}>
                <div className="w-5 h-5 rounded-full" style={{ background: t.swatchPrimary }} />
              </div>
              <span className="text-sm font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Font ────────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">Font</h2>
        <div className="flex flex-wrap gap-3">
          {fonts.map(f => (
            <button key={f.id} onClick={() => setFont(f.id)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl px-6 py-4 border-2 transition-all',
                font === f.id ? 'border-primary scale-105' : 'border-border hover:border-muted-foreground'
              )}
              style={{ fontFamily: f.family }}
            >
              <span className="text-2xl font-bold">Aa</span>
              <span className="text-sm font-medium">{f.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
