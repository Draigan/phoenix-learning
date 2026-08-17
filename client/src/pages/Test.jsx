import { useEffect, useRef, useState, useCallback } from 'react'
import { feature as topojsonFeature } from 'topojson-client'
import { geoCentroid } from 'd3-geo'
import { cn } from '../lib/utils'
import { useSpeech } from '../hooks/useSpeech'
import { useSounds } from '../hooks/useSounds'
import { useGameSettings } from '../context/GameSettingsContext'
import { COUNTRY_DATA } from '../data/countries'
import { FindTheCountry } from './Geography'
import WorldTour from './WorldTour'

// ── Globe constants ───────────────────────────────────────────────────────────
const BORDER_COLOR    = 'rgba(255, 255, 255, 0.72)'
const ACTIVE_FILL     = 'rgba(34, 197, 94, 0.82)'
const ACTIVE_SIDE     = 'rgba(34, 197, 94, 0.28)'
const ACTIVE_BORDER   = '#fef08a'
const DEFAULT_ALTITUDE = 0.0035
const ACTIVE_ALTITUDE  = 0.012
const GLOBE_IMAGE_URL  = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg'

const COUNTRY_PALETTE = [
  { fill: 'rgba(244, 114, 182, 0.38)', side: 'rgba(244, 114, 182, 0.16)' },
  { fill: 'rgba(251, 146, 60, 0.38)',  side: 'rgba(251, 146, 60, 0.16)'  },
  { fill: 'rgba(250, 204, 21, 0.34)',  side: 'rgba(250, 204, 21, 0.14)'  },
  { fill: 'rgba(74, 222, 128, 0.34)',  side: 'rgba(74, 222, 128, 0.14)'  },
  { fill: 'rgba(45, 212, 191, 0.34)',  side: 'rgba(45, 212, 191, 0.14)'  },
  { fill: 'rgba(96, 165, 250, 0.36)',  side: 'rgba(96, 165, 250, 0.16)'  },
  { fill: 'rgba(167, 139, 250, 0.36)', side: 'rgba(167, 139, 250, 0.16)' },
  { fill: 'rgba(248, 113, 113, 0.36)', side: 'rgba(248, 113, 113, 0.16)' },
]
const FALLBACK_PALETTE_ENTRY = {
  fill: 'rgba(191, 219, 254, 0.3)',
  side: 'rgba(191, 219, 254, 0.14)',
}

function getPaletteEntry(countryId) {
  const value = String(countryId ?? '')
  if (!value) return FALLBACK_PALETTE_ENTRY
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  return COUNTRY_PALETTE[hash % COUNTRY_PALETTE.length] ?? FALLBACK_PALETTE_ENTRY
}

function applyExplorerStyle(globe, selectedCountryId) {
  globe
    .polygonCapColor(f => f.properties.countryId === selectedCountryId ? ACTIVE_FILL : getPaletteEntry(f.properties.countryId).fill)
    .polygonSideColor(f => f.properties.countryId === selectedCountryId ? ACTIVE_SIDE : getPaletteEntry(f.properties.countryId).side)
    .polygonStrokeColor(f => f.properties.countryId === selectedCountryId ? ACTIVE_BORDER : BORDER_COLOR)
    .polygonAltitude(f => f.properties.countryId === selectedCountryId ? ACTIVE_ALTITUDE : DEFAULT_ALTITUDE)
}

// ── Game data ─────────────────────────────────────────────────────────────────
const ROUND_DURATION = 120

const ROUND_POOLS = [
  // Easy — huge, globally famous
  ['643','124','840','076','036','156','356','032','682','398','180','012','364','729','484','566'],
  // Medium — well-known, need some geography
  ['250','276','826','392','818','792','586','360','604','170','231','804','710','862','068','504'],
  // Hard — need to know your geography
  ['724','380','616','752','578','246','404','834','764','104','368','120','466','152','288','686'],
]

const ROUND_LABELS = ['Easy', 'Medium', 'Hard']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// topojson stores IDs as numbers (76, 36…); COUNTRY_DATA keys are padded ('076','036'…)
const padId = id => String(id).padStart(3, '0')

// ── Globe Explorer ────────────────────────────────────────────────────────────
function GlobeGame({ onBack }) {
  const containerRef = useRef(null)
  const globeRef     = useRef(null)
  const roRef        = useRef(null)
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container || globeRef.current) return

    let cancelled = false
    let cleanup   = () => {}

    async function initGlobe() {
      const [{ default: Globe }, { default: worldData }] = await Promise.all([
        import('globe.gl'),
        import('world-atlas/countries-50m.json'),
      ])
      if (cancelled || !container) return

      const geo = topojsonFeature(worldData, worldData.objects.countries)
      geo.features = geo.features.map(f => ({
        ...f,
        properties: { ...f.properties, countryId: String(f.id), englishName: f.properties?.name ?? String(f.id) },
      }))

      const labels = geo.features.map(f => {
        const [lng, lat] = geoCentroid(f)
        return { lat, lng, name: f.properties.englishName }
      })

      const globe = new Globe(container, {
        animateIn: false, waitForGlobeReady: false,
        rendererConfig: { antialias: false, alpha: true, powerPreference: 'low-power' },
      })
        .width(container.clientWidth).height(container.clientHeight)
        .backgroundColor('#020617')
        .globeImageUrl(GLOBE_IMAGE_URL)
        .showAtmosphere(true).atmosphereColor('#93c5fd').atmosphereAltitude(0.16)
        .lineHoverPrecision(0)
        .polygonsData(geo.features)
        .polygonGeoJsonGeometry('geometry')
        .polygonLabel(f => f.properties.englishName)
        .polygonCapCurvatureResolution(8)
        .polygonsTransitionDuration(0)
        .onPolygonHover(f => { container.style.cursor = f ? 'pointer' : 'default' })
        .onPolygonClick(f => {
          if (!f) return
          setSelectedCountry({ id: f.properties.countryId, name: f.properties.englishName })
        })
        .labelsData(labels)
        .labelLat(d => d.lat).labelLng(d => d.lng).labelText(d => d.name)
        .labelSize(0.6).labelColor(() => 'rgba(255,255,255,0.92)')
        .labelResolution(3).labelDotRadius(0).labelAltitude(0.02)

      applyExplorerStyle(globe, null)
      globe.pointOfView({ lat: 18, lng: -12, altitude: 2.05 }, 0)
      globe.controls().enablePan = false
      globeRef.current = globe
      if (!cancelled) setLoading(false)

      roRef.current = new ResizeObserver(() => globe.width(container.clientWidth).height(container.clientHeight))
      roRef.current.observe(container)

      cleanup = () => {
        roRef.current?.disconnect()
        container.style.cursor = 'default'
        globe._destructor()
        globeRef.current = null
      }
    }

    initGlobe()
    return () => { cancelled = true; cleanup() }
  }, [])

  useEffect(() => {
    const g = globeRef.current
    if (!g) return
    applyExplorerStyle(g, selectedCountry?.id ?? null)
  }, [selectedCountry])

  return (
    <div className="relative h-full overflow-hidden bg-slate-950 text-white">
      <div ref={containerRef} className="absolute inset-0" />

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 z-20">
          <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <p className="text-sm text-white/60 font-medium">Loading globe…</p>
        </div>
      )}

      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-xl bg-black/65 px-4 py-3 shadow-lg backdrop-blur-sm">
        <button className="pointer-events-auto mb-2 text-sm font-semibold text-white/60 hover:text-white transition-colors" onClick={onBack}>
          ← Games
        </button>
        <h2 className="text-xl font-bold">Globe Explorer</h2>
        <p className="mt-1 text-sm text-white/80">Drag to spin · scroll to zoom · tap a country</p>
        <p className="mt-3 text-sm text-white/90">{selectedCountry ? `Selected: ${selectedCountry.name}` : 'Selected: none'}</p>
      </div>
    </div>
  )
}

// ── Find & Touch game ─────────────────────────────────────────────────────────
function FindTouchGame({ onBack }) {
  const { settings }  = useGameSettings()
  const { speak, unlock } = useSpeech({ voiceName: settings.spelling.voiceName })
  const { playCorrect, playWrong, playWin } = useSounds()

  const containerRef  = useRef(null)
  const globeRef      = useRef(null)
  const roRef         = useRef(null)
  const onClickRef    = useRef(null)
  const targetRef     = useRef(null)
  const poolRef       = useRef([])

  const [loading,    setLoading]    = useState(true)
  const [phase,      setPhase]      = useState('ready')  // ready | playing | between | done
  const [round,      setRound]      = useState(0)
  const [timeLeft,   setTimeLeft]   = useState(ROUND_DURATION)
  const [target,     setTarget]     = useState(null)        // { id, name }
  const [feedback,   setFeedback]   = useState(null)        // { id, correct }
  const [roundScore, setRoundScore] = useState(0)
  const [scores,     setScores]     = useState([])

  // ── Globe init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container || globeRef.current) return

    let cancelled = false
    let cleanup   = () => {}

    async function initGlobe() {
      const [{ default: Globe }, { default: worldData }] = await Promise.all([
        import('globe.gl'),
        import('world-atlas/countries-50m.json'),
      ])
      if (cancelled || !container) return

      const geo = topojsonFeature(worldData, worldData.objects.countries)
      geo.features = geo.features.map(f => ({
        ...f,
        properties: {
          ...f.properties,
          countryId: padId(f.id),
          englishName: f.properties?.name ?? String(f.id),
        },
      }))

      const labels = geo.features.map(f => {
        const [lng, lat] = geoCentroid(f)
        return { lat, lng, name: f.properties.englishName }
      })

      const globe = new Globe(container, {
        animateIn: false, waitForGlobeReady: false,
        rendererConfig: { antialias: false, alpha: true, powerPreference: 'low-power' },
      })
        .width(container.clientWidth).height(container.clientHeight)
        .backgroundColor('#020617')
        .globeImageUrl(GLOBE_IMAGE_URL)
        .showAtmosphere(true).atmosphereColor('#93c5fd').atmosphereAltitude(0.16)
        .lineHoverPrecision(0)
        .polygonsData(geo.features)
        .polygonGeoJsonGeometry('geometry')
        .polygonCapCurvatureResolution(8)
        .polygonsTransitionDuration(0)
        .onPolygonHover(f => { container.style.cursor = f ? 'pointer' : 'default' })
        .onPolygonClick(f => { if (f) onClickRef.current?.(f.properties.countryId) })
        .labelsData(labels)
        .labelLat(d => d.lat).labelLng(d => d.lng).labelText(d => d.name)
        .labelSize(0.6).labelColor(() => 'rgba(255,255,255,0.85)')
        .labelResolution(3).labelDotRadius(0).labelAltitude(0.02)

      globe
        .polygonCapColor(f => getPaletteEntry(f.properties.countryId).fill)
        .polygonSideColor(f => getPaletteEntry(f.properties.countryId).side)
        .polygonStrokeColor(() => BORDER_COLOR)
        .polygonAltitude(DEFAULT_ALTITUDE)

      globe.pointOfView({ lat: 18, lng: -12, altitude: 2.05 }, 0)
      globe.controls().enablePan = false
      globeRef.current = globe
      if (!cancelled) setLoading(false)

      roRef.current = new ResizeObserver(() => globe.width(container.clientWidth).height(container.clientHeight))
      roRef.current.observe(container)

      cleanup = () => {
        roRef.current?.disconnect()
        container.style.cursor = 'default'
        globe._destructor()
        globeRef.current = null
      }
    }

    initGlobe()
    return () => { cancelled = true; cleanup() }
  }, [])

  // ── Feedback → globe colours ────────────────────────────────────────────────
  useEffect(() => {
    const g = globeRef.current
    if (!g) return
    g
      .polygonCapColor(f => {
        if (feedback && f.properties.countryId === feedback.id)
          return feedback.correct ? 'rgba(34,197,94,0.92)' : 'rgba(239,68,68,0.88)'
        return getPaletteEntry(f.properties.countryId).fill
      })
      .polygonSideColor(f => {
        if (feedback && f.properties.countryId === feedback.id)
          return feedback.correct ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.35)'
        return getPaletteEntry(f.properties.countryId).side
      })
      .polygonAltitude(f =>
        feedback && f.properties.countryId === feedback.id ? 0.018 : DEFAULT_ALTITUDE
      )
  }, [feedback])

  // ── Pick next target ─────────────────────────────────────────────────────────
  const nextTarget = useCallback(() => {
    if (!poolRef.current.length) {
      poolRef.current = shuffle(ROUND_POOLS[round] ?? ROUND_POOLS[0])
    }
    const id   = poolRef.current.shift()
    const name = COUNTRY_DATA[id]?.name ?? id
    targetRef.current = id
    setTarget({ id, name })
    speak(`Find and touch ${name}`)
  }, [round, speak])

  // ── Start / restart a round (must be called from a tap handler) ────────────
  const startRound = useCallback((r) => {
    unlock()
    poolRef.current = shuffle(ROUND_POOLS[r] ?? ROUND_POOLS[0])
    setRound(r)
    setRoundScore(0)
    setTimeLeft(ROUND_DURATION)
    setFeedback(null)
    setPhase('playing')
  }, [unlock])

  // Kick off first target whenever phase flips to 'playing'
  useEffect(() => {
    if (phase === 'playing') nextTarget()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── Timer ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft <= 0) {
      window.speechSynthesis?.cancel()
      const finalScore = roundScore
      setScores(prev => {
        const next = [...prev]
        next[round] = finalScore
        return next
      })
      if (round < 2) {
        setPhase('between')
        speak(`Congratulations! You found ${finalScore} ${finalScore === 1 ? 'country' : 'countries'}! Get ready for round ${round + 2}!`)
      } else {
        setPhase('done')
        playWin()
        speak(`Congratulations! You found ${finalScore} ${finalScore === 1 ? 'country' : 'countries'}!`)
      }
      return
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft, round, roundScore, playWin, speak])

  // ── Click handler (stable via ref) ──────────────────────────────────────────
  useEffect(() => {
    onClickRef.current = (clickedId) => {
      if (phase !== 'playing' || !targetRef.current) return
      if (clickedId === targetRef.current) {
        targetRef.current = null  // block re-clicks until next target is set
        playCorrect()
        setRoundScore(s => s + 1)
        setFeedback({ id: clickedId, correct: true })
        setTimeout(() => { setFeedback(null); nextTarget() }, 700)
      } else {
        playWrong()
        setFeedback({ id: clickedId, correct: false })
        setTimeout(() => setFeedback(null), 500)
      }
    }
  }, [phase, nextTarget, playCorrect, playWrong])

  const totalScore = scores.reduce((a, b) => a + b, 0)

  return (
    <div className="relative h-full overflow-hidden bg-slate-950 text-white">
      <div ref={containerRef} className="absolute inset-0" />

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 z-20">
          <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <p className="text-sm text-white/60 font-medium">Loading globe…</p>
        </div>
      )}

      {/* Tap to start — globe is ready but speech needs a user gesture */}
      {!loading && phase === 'ready' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 text-center">
            <span className="text-6xl">👆</span>
            <p className="text-white text-2xl font-bold">Find &amp; Touch</p>
            <p className="text-white/60 text-sm">3 rounds · 60 seconds each · easy → hard</p>
            <button
              onClick={() => startRound(0)}
              className="mt-2 px-10 py-4 rounded-2xl bg-white text-slate-900 text-xl font-bold hover:bg-white/90 active:scale-95 transition-all"
            >
              Start!
            </button>
          </div>
        </div>
      )}

      {/* HUD */}
      {!loading && phase === 'playing' && (
        <>
          {/* Top bar */}
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-4 pb-8 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
            <button
              className="pointer-events-auto text-sm font-semibold text-white/50 hover:text-white transition-colors"
              onClick={onBack}
            >
              ← Games
            </button>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs text-white/50 uppercase tracking-widest">
                Round {round + 1}/3 · {ROUND_LABELS[round]}
              </span>
              <span className={cn(
                'text-4xl font-bold tabular-nums',
                timeLeft <= 10 ? 'text-red-400' : 'text-white'
              )}>
                {timeLeft}s
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-white/50 uppercase tracking-widest">Found</span>
              <p className="text-2xl font-bold">{roundScore}</p>
            </div>
          </div>

          {/* Target prompt */}
          <div className="absolute inset-x-0 bottom-6 z-10 flex justify-center pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-8 py-4 text-center shadow-xl">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">Find and touch</p>
              <p className="text-white text-3xl font-bold mt-1">{target?.name}</p>
            </div>
          </div>
        </>
      )}

      {/* Between rounds overlay */}
      {phase === 'between' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 text-center">
            <span className="text-6xl">🌍</span>
            <p className="text-white/60 text-lg font-medium">Round {round + 1} · {ROUND_LABELS[round]}</p>
            <p className="text-white text-4xl font-bold">
              {scores[round] ?? roundScore} <span className="text-white/60 text-2xl">found!</span>
            </p>
            <button
              onClick={() => startRound(round + 1)}
              className="mt-2 px-10 py-4 rounded-2xl bg-white text-slate-900 text-lg font-bold hover:bg-white/90 active:scale-95 transition-all"
            >
              Next Round: {ROUND_LABELS[round + 1]} →
            </button>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {phase === 'done' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="text-6xl">🏆</span>
            <p className="text-white text-3xl font-bold">Game Complete!</p>
            <div className="flex flex-col gap-2 mt-2 text-lg">
              {ROUND_LABELS.map((label, i) => (
                <p key={i} className="text-white/70">
                  Round {i + 1} ({label}): <span className="text-white font-bold">{scores[i] ?? 0}</span>
                </p>
              ))}
            </div>
            <p className="text-3xl font-bold text-yellow-400 mt-1">
              Total: {totalScore} countries!
            </p>
            <button
              onClick={() => { setScores([]); startRound(0) }}
              className="mt-4 px-10 py-4 rounded-2xl bg-white text-slate-900 text-lg font-bold hover:bg-white/90 active:scale-95 transition-all"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Hot & Cold game ───────────────────────────────────────────────────────────
const HC_COUNTRIES   = Object.keys(COUNTRY_DATA)
const HC_PER_GAME    = 5

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, r = Math.PI / 180
  const dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)))
}

function tempInfo(km) {
  if (km <  500) return { label: '🔥 Scorching!', spoken: 'Scorching!', fill: 'rgba(239,68,68,0.88)',   side: 'rgba(239,68,68,0.35)'  }
  if (km < 1500) return { label: '🌶️ Hot!',        spoken: 'Hot!',        fill: 'rgba(249,115,22,0.82)',  side: 'rgba(249,115,22,0.30)' }
  if (km < 3000) return { label: '☀️ Warm',         spoken: 'Warm',        fill: 'rgba(234,179,8,0.78)',   side: 'rgba(234,179,8,0.28)'  }
  if (km < 5500) return { label: '🌤️ Cool',         spoken: 'Cool',        fill: 'rgba(147,197,253,0.72)', side: 'rgba(147,197,253,0.25)'}
  if (km < 9000) return { label: '❄️ Cold',         spoken: 'Cold',        fill: 'rgba(59,130,246,0.72)',  side: 'rgba(59,130,246,0.25)' }
  return              { label: '🧊 Freezing!',     spoken: 'Freezing!',   fill: 'rgba(29,78,216,0.68)',   side: 'rgba(29,78,216,0.24)'  }
}

function HotColdGame({ onBack }) {
  const { settings }           = useGameSettings()
  const { speak, unlock }      = useSpeech({ voiceName: settings.spelling.voiceName })
  const { playCorrect, playLevelUp } = useSounds()

  const containerRef   = useRef(null)
  const globeRef       = useRef(null)
  const roRef          = useRef(null)
  const onClickRef     = useRef(null)
  const targetRef      = useRef(null)
  const centroidMapRef = useRef({})
  const guessMapRef    = useRef({})

  const [loading,      setLoading]      = useState(true)
  const [phase,        setPhase]        = useState('ready') // ready|playing|found|done
  const [gameTargets,  setGameTargets]  = useState([])
  const [round,        setRound]        = useState(0)
  const [tries,        setTries]        = useState(0)
  const [allTries,     setAllTries]     = useState([])
  const [feedback,     setFeedback]     = useState(null) // { label, km, name } | null

  const target = gameTargets[round]
    ? { id: gameTargets[round], name: COUNTRY_DATA[gameTargets[round]]?.name ?? gameTargets[round] }
    : null

  // ── Globe init ────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container || globeRef.current) return
    let cancelled = false, cleanup = () => {}

    async function initGlobe() {
      const [{ default: Globe }, { default: worldData }] = await Promise.all([
        import('globe.gl'),
        import('world-atlas/countries-50m.json'),
      ])
      if (cancelled || !container) return

      const geo = topojsonFeature(worldData, worldData.objects.countries)
      geo.features = geo.features.map(f => ({
        ...f,
        properties: { ...f.properties, countryId: padId(f.id), englishName: f.properties?.name ?? String(f.id) },
      }))

      const centroids = {}, labels = []
      geo.features.forEach(f => {
        const [lng, lat] = geoCentroid(f)
        centroids[f.properties.countryId] = { lat, lng }
        labels.push({ lat, lng, name: f.properties.englishName })
      })
      centroidMapRef.current = centroids

      const globe = new Globe(container, {
        animateIn: false, waitForGlobeReady: false,
        rendererConfig: { antialias: false, alpha: true, powerPreference: 'low-power' },
      })
        .width(container.clientWidth).height(container.clientHeight)
        .backgroundColor('#020617')
        .globeImageUrl(GLOBE_IMAGE_URL)
        .showAtmosphere(true).atmosphereColor('#93c5fd').atmosphereAltitude(0.16)
        .lineHoverPrecision(0)
        .polygonsData(geo.features)
        .polygonGeoJsonGeometry('geometry')
        .polygonCapCurvatureResolution(8)
        .polygonsTransitionDuration(300)
        .polygonCapColor(f  => guessMapRef.current[f.properties.countryId]?.fill ?? getPaletteEntry(f.properties.countryId).fill)
        .polygonSideColor(f => guessMapRef.current[f.properties.countryId]?.side ?? getPaletteEntry(f.properties.countryId).side)
        .polygonStrokeColor(() => BORDER_COLOR)
        .polygonAltitude(f  => guessMapRef.current[f.properties.countryId] ? 0.015 : DEFAULT_ALTITUDE)
        .onPolygonHover(f => { container.style.cursor = f ? 'pointer' : 'default' })
        .onPolygonClick(f => { if (f) onClickRef.current?.(f.properties.countryId) })
        .labelsData(labels)
        .labelLat(d => d.lat).labelLng(d => d.lng).labelText(d => d.name)
        .labelSize(0.6).labelColor(() => 'rgba(255,255,255,0.85)')
        .labelResolution(3).labelDotRadius(0).labelAltitude(0.02)

      globe.pointOfView({ lat: 18, lng: -12, altitude: 2.05 }, 0)
      globe.controls().enablePan = false
      globeRef.current = globe
      if (!cancelled) setLoading(false)

      roRef.current = new ResizeObserver(() => globe.width(container.clientWidth).height(container.clientHeight))
      roRef.current.observe(container)
      cleanup = () => { roRef.current?.disconnect(); container.style.cursor = 'default'; globe._destructor(); globeRef.current = null }
    }

    initGlobe()
    return () => { cancelled = true; cleanup() }
  }, [])

  // Re-evaluate polygon colours after every guess update
  function refreshColors() {
    const g = globeRef.current
    if (!g) return
    g
      .polygonCapColor(f  => guessMapRef.current[f.properties.countryId]?.fill ?? getPaletteEntry(f.properties.countryId).fill)
      .polygonSideColor(f => guessMapRef.current[f.properties.countryId]?.side ?? getPaletteEntry(f.properties.countryId).side)
      .polygonAltitude(f  => guessMapRef.current[f.properties.countryId] ? 0.015 : DEFAULT_ALTITUDE)
  }

  // ── Start game ────────────────────────────────────────────────────────────
  function startGame() {
    unlock()
    const targets = shuffle(HC_COUNTRIES).slice(0, HC_PER_GAME)
    guessMapRef.current = {}
    refreshColors()
    setGameTargets(targets)
    setRound(0)
    setTries(0)
    setAllTries([])
    setFeedback(null)
    setPhase('playing')
    targetRef.current = targets[0]
    const name = COUNTRY_DATA[targets[0]]?.name ?? targets[0]
    speak(`Find ${name}`)
  }

  // ── Click handler ─────────────────────────────────────────────────────────
  useEffect(() => {
    onClickRef.current = (clickedId) => {
      if (phase !== 'playing' || !targetRef.current) return
      const targetCentroid  = centroidMapRef.current[targetRef.current]
      const clickedCentroid = centroidMapRef.current[clickedId]
      if (!targetCentroid || !clickedCentroid) return

      const newTries = tries + 1
      setTries(newTries)

      if (clickedId === targetRef.current) {
        guessMapRef.current[clickedId] = { fill: 'rgba(34,197,94,0.92)', side: 'rgba(34,197,94,0.4)' }
        refreshColors()
        setFeedback(null)
        playLevelUp()
        speak('Found it!')
        setPhase('found')
      } else {
        const km   = haversineKm(clickedCentroid.lat, clickedCentroid.lng, targetCentroid.lat, targetCentroid.lng)
        const info = tempInfo(km)
        guessMapRef.current[clickedId] = { fill: info.fill, side: info.side }
        refreshColors()
        setFeedback({ label: info.label, km, name: COUNTRY_DATA[clickedId]?.name ?? clickedId })
        speak(info.spoken)
        if (km < 1500) playCorrect()
      }
    }
  }, [phase, tries, speak, playCorrect, playLevelUp])

  // ── Next country / end game ───────────────────────────────────────────────
  function nextCountry() {
    unlock()
    const updatedAllTries = [...allTries, tries]
    setAllTries(updatedAllTries)
    const nextRound = round + 1
    if (nextRound >= HC_PER_GAME) {
      setPhase('done')
      return
    }
    guessMapRef.current = {}
    refreshColors()
    setRound(nextRound)
    setTries(0)
    setFeedback(null)
    setPhase('playing')
    targetRef.current = gameTargets[nextRound]
    const name = COUNTRY_DATA[gameTargets[nextRound]]?.name ?? gameTargets[nextRound]
    speak(`Find ${name}`)
  }

  const totalTries = [...allTries, ...(phase === 'done' ? [] : [])].reduce((a, b) => a + b, 0)

  return (
    <div className="relative h-full overflow-hidden bg-slate-950 text-white">
      <div ref={containerRef} className="absolute inset-0" />

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 z-20">
          <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <p className="text-sm text-white/60 font-medium">Loading globe…</p>
        </div>
      )}

      {/* Start screen */}
      {!loading && phase === 'ready' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 text-center">
            <span className="text-6xl">🌡️</span>
            <p className="text-white text-2xl font-bold">Hot &amp; Cold</p>
            <p className="text-white/60 text-sm max-w-xs">
              A country name is shown. Tap anywhere on the globe — get hot &amp; cold clues until you find it.
            </p>
            <button onClick={startGame} className="mt-2 px-10 py-4 rounded-2xl bg-white text-slate-900 text-xl font-bold hover:bg-white/90 active:scale-95 transition-all">
              Start!
            </button>
          </div>
        </div>
      )}

      {/* Playing HUD */}
      {!loading && (phase === 'playing' || phase === 'found') && (
        <>
          {/* Top bar */}
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-4 pb-8 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
            <button className="pointer-events-auto text-sm font-semibold text-white/50 hover:text-white transition-colors" onClick={onBack}>
              ← Games
            </button>
            <span className="text-xs text-white/50 uppercase tracking-widest">
              Country {round + 1} / {HC_PER_GAME}
            </span>
            <div className="text-right">
              <span className="text-xs text-white/50 uppercase tracking-widest">Tries</span>
              <p className="text-2xl font-bold">{tries}</p>
            </div>
          </div>

          {/* Bottom panel */}
          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 pb-5 pointer-events-none">
            {feedback && phase === 'playing' && (
              <div className="bg-black/70 backdrop-blur-sm rounded-xl px-6 py-2 text-center">
                <p className="text-white font-semibold">
                  {feedback.label} &mdash; <span className="text-white/70">{feedback.name} is {feedback.km.toLocaleString()} km away</span>
                </p>
              </div>
            )}
            <div className="bg-black/75 backdrop-blur-sm rounded-2xl px-8 py-3 flex items-center gap-4 shadow-xl">
              <div className="text-center">
                <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">Find</p>
                <p className="text-white text-3xl font-bold mt-0.5">{target?.name}</p>
              </div>
              <button
                className="pointer-events-auto text-2xl opacity-60 hover:opacity-100 transition-opacity"
                onClick={() => { unlock(); speak(`Find ${target?.name}`) }}
              >
                🔊
              </button>
            </div>
            {phase === 'found' && (
              <button
                className="pointer-events-auto mt-1 px-10 py-3 rounded-2xl bg-white text-slate-900 text-lg font-bold hover:bg-white/90 active:scale-95 transition-all"
                onClick={nextCountry}
              >
                {round + 1 >= HC_PER_GAME ? 'See Results →' : 'Next Country →'}
              </button>
            )}
          </div>
        </>
      )}

      {/* Game over */}
      {phase === 'done' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="text-6xl">🏆</span>
            <p className="text-white text-3xl font-bold">All 5 Found!</p>
            <div className="flex flex-col gap-1.5 mt-1">
              {allTries.map((t, i) => (
                <p key={i} className="text-white/70 text-base">
                  {COUNTRY_DATA[gameTargets[i]]?.name ?? gameTargets[i]}:
                  <span className="text-white font-bold ml-2">{t} {t === 1 ? 'try' : 'tries'}</span>
                </p>
              ))}
            </div>
            <p className="text-2xl font-bold text-yellow-400 mt-1">
              Total: {allTries.reduce((a, b) => a + b, 0)} tries
            </p>
            <button
              onClick={startGame}
              className="mt-3 px-10 py-4 rounded-2xl bg-white text-slate-900 text-lg font-bold hover:bg-white/90 active:scale-95 transition-all"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Spotlight game ────────────────────────────────────────────────────────────
const SPOTLIGHT_COUNTRIES = Object.keys(COUNTRY_DATA)

function SpotlightGame({ onBack }) {
  const { settings }           = useGameSettings()
  const { speak, unlock }      = useSpeech({ voiceName: settings.spelling.voiceName })
  const { playCorrect }        = useSounds()

  const containerRef   = useRef(null)
  const globeRef       = useRef(null)
  const roRef          = useRef(null)
  const onClickRef     = useRef(null)
  const targetRef      = useRef(null)
  const centroidMapRef = useRef({})
  const poolRef        = useRef([])

  const [loading, setLoading] = useState(true)
  const [phase,   setPhase]   = useState('ready')   // ready | playing
  const [target,  setTarget]  = useState(null)       // { id, name }
  const [count,   setCount]   = useState(0)
  const [flash,   setFlash]   = useState(false)      // brief green on correct

  // ── Globe init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container || globeRef.current) return
    let cancelled = false, cleanup = () => {}

    async function initGlobe() {
      const [{ default: Globe }, { default: worldData }] = await Promise.all([
        import('globe.gl'),
        import('world-atlas/countries-50m.json'),
      ])
      if (cancelled || !container) return

      const geo = topojsonFeature(worldData, worldData.objects.countries)
      geo.features = geo.features.map(f => ({
        ...f,
        properties: { ...f.properties, countryId: padId(f.id), englishName: f.properties?.name ?? String(f.id) },
      }))

      const centroids = {}, labels = []
      geo.features.forEach(f => {
        const [lng, lat] = geoCentroid(f)
        centroids[f.properties.countryId] = { lat, lng }
        labels.push({ lat, lng, name: f.properties.englishName })
      })
      centroidMapRef.current = centroids

      const globe = new Globe(container, {
        animateIn: false, waitForGlobeReady: false,
        rendererConfig: { antialias: false, alpha: true, powerPreference: 'low-power' },
      })
        .width(container.clientWidth).height(container.clientHeight)
        .backgroundColor('#020617')
        .globeImageUrl(GLOBE_IMAGE_URL)
        .showAtmosphere(true).atmosphereColor('#93c5fd').atmosphereAltitude(0.16)
        .lineHoverPrecision(0)
        .polygonsData(geo.features)
        .polygonGeoJsonGeometry('geometry')
        .polygonCapCurvatureResolution(8)
        .polygonsTransitionDuration(250)
        .polygonStrokeColor(() => false)
        .polygonCapColor(f  => f.properties.countryId === targetRef.current ? 'rgba(251,191,36,0.95)' : 'rgba(0,0,0,0)')
        .polygonSideColor(f => f.properties.countryId === targetRef.current ? 'rgba(251,191,36,0.4)'  : 'rgba(0,0,0,0)')
        .polygonAltitude(f  => f.properties.countryId === targetRef.current ? 0.03 : DEFAULT_ALTITUDE)
        .onPolygonHover(f => { container.style.cursor = f ? 'pointer' : 'default' })
        .onPolygonClick(f => { if (f) onClickRef.current?.(f.properties.countryId) })
        .labelsData([])
        .labelLat(d => d.lat).labelLng(d => d.lng).labelText(d => d.name)
        .labelSize(1.0).labelColor(() => 'rgba(255,255,255,0.95)')
        .labelResolution(3).labelDotRadius(0).labelAltitude(0.12)

      globe.pointOfView({ lat: 18, lng: -12, altitude: 2.05 }, 0)
      globe.controls().enablePan = false
      globeRef.current = globe
      if (!cancelled) setLoading(false)

      roRef.current = new ResizeObserver(() => globe.width(container.clientWidth).height(container.clientHeight))
      roRef.current.observe(container)
      cleanup = () => { roRef.current?.disconnect(); container.style.cursor = 'default'; globe._destructor(); globeRef.current = null }
    }

    initGlobe()
    return () => { cancelled = true; cleanup() }
  }, [])

  function refreshColors() {
    const g = globeRef.current
    if (!g) return
    const id = targetRef.current
    const c  = centroidMapRef.current[id]
    const name = COUNTRY_DATA[id]?.name ?? id
    g
      .polygonCapColor(f  => f.properties.countryId === id ? 'rgba(251,191,36,0.95)' : 'rgba(0,0,0,0)')
      .polygonSideColor(f => f.properties.countryId === id ? 'rgba(251,191,36,0.4)'  : 'rgba(0,0,0,0)')
      .polygonAltitude(f  => f.properties.countryId === id ? 0.03 : DEFAULT_ALTITUDE)
      .labelsData(c ? [{ lat: c.lat, lng: c.lng, name }] : [])
  }

  function nextTarget(pool) {
    if (!pool.length) pool = shuffle(SPOTLIGHT_COUNTRIES)
    poolRef.current = pool
    const id   = poolRef.current.shift()
    const name = COUNTRY_DATA[id]?.name ?? id
    targetRef.current = id
    setTarget({ id, name })
    setCount(c => c + 1)
    refreshColors()
    speak(name)
    const c = centroidMapRef.current[id]
    if (c) globeRef.current?.pointOfView({ lat: c.lat, lng: c.lng, altitude: 2.0 }, 800)
  }

  function startGame() {
    unlock()
    poolRef.current = shuffle(SPOTLIGHT_COUNTRIES)
    setCount(0)
    nextTarget(poolRef.current)
    setPhase('playing')
  }

  useEffect(() => {
    onClickRef.current = (clickedId) => {
      if (phase !== 'playing' || !targetRef.current) return
      if (clickedId !== targetRef.current) return
      targetRef.current = null  // block any further clicks until next target is set
      playCorrect()
      // flash green then advance
      const g = globeRef.current
      if (g) {
        g.polygonCapColor(f  => f.properties.countryId === clickedId ? 'rgba(34,197,94,0.95)' : 'rgba(0,0,0,0)')
         .polygonSideColor(f => f.properties.countryId === clickedId ? 'rgba(34,197,94,0.4)'  : 'rgba(0,0,0,0)')
         .labelsData([])
      }
      setTimeout(() => nextTarget([...poolRef.current]), 600)
    }
  }, [phase, playCorrect])

  return (
    <div className="relative h-full overflow-hidden bg-slate-950 text-white">
      <div ref={containerRef} className="absolute inset-0" />

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 z-20">
          <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <p className="text-sm text-white/60 font-medium">Loading globe…</p>
        </div>
      )}

      {!loading && phase === 'ready' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 text-center">
            <span className="text-6xl">✨</span>
            <p className="text-white text-2xl font-bold">Spotlight</p>
            <p className="text-white/60 text-sm max-w-xs">One country lights up — find it and tap it!</p>
            <button onClick={startGame} className="mt-2 px-10 py-4 rounded-2xl bg-white text-slate-900 text-xl font-bold hover:bg-white/90 active:scale-95 transition-all">
              Start!
            </button>
          </div>
        </div>
      )}

      {!loading && phase === 'playing' && (
        <>
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-4 pb-8 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
            <button className="pointer-events-auto text-sm font-semibold text-white/50 hover:text-white transition-colors" onClick={onBack}>
              ← Games
            </button>
            <span className="text-xs text-white/50 uppercase tracking-widest">{count} countries</span>
            <div className="w-16" />
          </div>

          <div className="absolute inset-x-0 bottom-6 z-10 flex justify-center pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-8 py-3 flex items-center gap-4 shadow-xl">
              <p className="text-white text-3xl font-bold">{target?.name}</p>
              <button
                className="pointer-events-auto text-2xl opacity-60 hover:opacity-100 transition-opacity"
                onClick={() => { unlock(); speak(target?.name) }}
              >
                🔊
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Copycat game ──────────────────────────────────────────────────────────────
const COPYCAT_POOL = [
  '643','124','840','076','036','156','356','032','398','496',
  '012','180','364','682','484','566','710','818','604','024',
  '250','276','826','392','804','170','764','360','231','068',
]

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function pickNext(seq) {
  const used = new Set(seq)
  const available = COPYCAT_POOL.filter(id => !used.has(id))
  const pool = available.length ? available : COPYCAT_POOL
  return pool[Math.floor(Math.random() * pool.length)]
}

function CopycatGame({ onBack }) {
  const { settings }                           = useGameSettings()
  const { speak, unlock }                      = useSpeech({ voiceName: settings.spelling.voiceName })
  const { playCorrect, playWrong, playLevelUp } = useSounds()

  const containerRef   = useRef(null)
  const globeRef       = useRef(null)
  const roRef          = useRef(null)
  const onClickRef     = useRef(null)
  const centroidMapRef = useRef({})
  const showingIdRef   = useRef(null)
  const correctIdsRef  = useRef(new Set())
  const cancelRef      = useRef(false)

  const [loading,      setLoading]      = useState(true)
  const [phase,        setPhase]        = useState('ready')  // ready|showing|playing|success|gameover
  const [sequence,     setSequence]     = useState([])
  const [playerIndex,  setPlayerIndex]  = useState(0)
  const [wrongId,      setWrongId]      = useState(null)
  const sequenceRef    = useRef([])
  const playerIndexRef = useRef(0)
  const phaseRef       = useRef('ready')
  const lockedRef      = useRef(false)
  const wrongIdRef     = useRef(null)

  // ── Globe init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    cancelRef.current = false
    const container = containerRef.current
    if (!container || globeRef.current) return
    let cancelled = false, cleanup = () => {}

    async function initGlobe() {
      const [{ default: Globe }, { default: worldData }] = await Promise.all([
        import('globe.gl'),
        import('world-atlas/countries-50m.json'),
      ])
      if (cancelled || !container) return

      const geo = topojsonFeature(worldData, worldData.objects.countries)
      geo.features = geo.features.map(f => ({
        ...f,
        properties: { ...f.properties, countryId: padId(f.id), englishName: f.properties?.name ?? String(f.id) },
      }))

      geo.features.forEach(f => {
        const [lng, lat] = geoCentroid(f)
        centroidMapRef.current[f.properties.countryId] = { lat, lng }
      })

      const globe = new Globe(container, {
        animateIn: false, waitForGlobeReady: false,
        rendererConfig: { antialias: false, alpha: true, powerPreference: 'low-power' },
      })
        .width(container.clientWidth).height(container.clientHeight)
        .backgroundColor('#020617')
        .globeImageUrl(GLOBE_IMAGE_URL)
        .showAtmosphere(true).atmosphereColor('#93c5fd').atmosphereAltitude(0.16)
        .lineHoverPrecision(0)
        .polygonsData(geo.features)
        .polygonGeoJsonGeometry('geometry')
        .polygonCapCurvatureResolution(8)
        .polygonsTransitionDuration(250)
        .polygonStrokeColor(() => BORDER_COLOR)
        .polygonCapColor(() => 'rgba(0,0,0,0)')
        .polygonSideColor(() => 'rgba(0,0,0,0)')
        .polygonAltitude(DEFAULT_ALTITUDE)
        .onPolygonHover(f => { container.style.cursor = f ? 'pointer' : 'default' })
        .onPolygonClick(f => { if (f) onClickRef.current?.(f.properties.countryId) })
        .labelsData([])
        .labelLat(d => d.lat).labelLng(d => d.lng).labelText(d => d.name)
        .labelSize(1.0).labelColor(() => 'rgba(255,255,255,0.95)')
        .labelResolution(3).labelDotRadius(0).labelAltitude(0.12)

      globe.pointOfView({ lat: 18, lng: -12, altitude: 2.05 }, 0)
      globe.controls().enablePan = false
      globeRef.current = globe
      if (!cancelled) setLoading(false)

      roRef.current = new ResizeObserver(() => globe.width(container.clientWidth).height(container.clientHeight))
      roRef.current.observe(container)
      cleanup = () => { roRef.current?.disconnect(); container.style.cursor = 'default'; globe._destructor(); globeRef.current = null }
    }

    initGlobe()
    return () => { cancelled = true; cancelRef.current = true; cleanup() }
  }, [])

  function refreshColors() {
    const g = globeRef.current
    if (!g) return
    const showing = showingIdRef.current
    const correct = correctIdsRef.current
    const wrong   = wrongIdRef.current
    g
      .polygonCapColor(f => {
        const id = f.properties.countryId
        if (id === showing)  return 'rgba(251,191,36,0.95)'
        if (correct.has(id)) return 'rgba(34,197,94,0.92)'
        if (id === wrong)    return 'rgba(239,68,68,0.88)'
        return 'rgba(0,0,0,0)'
      })
      .polygonSideColor(f => {
        const id = f.properties.countryId
        if (id === showing)  return 'rgba(251,191,36,0.4)'
        if (correct.has(id)) return 'rgba(34,197,94,0.4)'
        if (id === wrong)    return 'rgba(239,68,68,0.35)'
        return 'rgba(0,0,0,0)'
      })
      .polygonAltitude(f => {
        const id = f.properties.countryId
        return (id === showing || correct.has(id) || id === wrong) ? 0.03 : DEFAULT_ALTITUDE
      })

    const labelId = showing
    const c = labelId ? centroidMapRef.current[labelId] : null
    g.labelsData(c ? [{ lat: c.lat, lng: c.lng, name: COUNTRY_DATA[labelId]?.name ?? '' }] : [])
  }

  async function runShowPhase(seq) {
    phaseRef.current = 'showing'
    setPhase('showing')
    correctIdsRef.current = new Set()
    showingIdRef.current  = null
    refreshColors()

    for (let i = 0; i < seq.length; i++) {
      if (cancelRef.current) return
      const id   = seq[i]
      const name = COUNTRY_DATA[id]?.name ?? id
      const c    = centroidMapRef.current[id]

      showingIdRef.current = id
      refreshColors()
      if (c) globeRef.current?.pointOfView({ lat: c.lat, lng: c.lng, altitude: 1.8 }, 700)
      speak(name)

      await sleep(1400)
      if (cancelRef.current) return

      showingIdRef.current = null
      refreshColors()
      await sleep(350)
      if (cancelRef.current) return
    }

    playerIndexRef.current = 0
    lockedRef.current = false
    phaseRef.current = 'playing'
    setPlayerIndex(0)
    setPhase('playing')
    speak('Your turn!')
  }

  function startGame() {
    unlock()
    const seq = [pickNext([]), pickNext([pickNext([])])]
    seq[1] = seq[0] === seq[1] ? pickNext([seq[0]]) : seq[1]
    sequenceRef.current = seq
    setSequence(seq)
    wrongIdRef.current = null
    setWrongId(null)
    runShowPhase(seq)
  }

  // ── Click handler ───────────────────────────────────────────────────────────
  useEffect(() => {
    onClickRef.current = (clickedId) => {
      if (phaseRef.current !== 'playing' || lockedRef.current) return
      lockedRef.current = true  // block double-taps immediately

      const seq      = sequenceRef.current
      const expected = seq[playerIndexRef.current]

      if (clickedId === expected) {
        correctIdsRef.current = new Set([...correctIdsRef.current, clickedId])
        refreshColors()
        playCorrect()

        const nextIdx = playerIndexRef.current + 1
        if (nextIdx >= seq.length) {
          phaseRef.current = 'success'
          setPhase('success')
          playLevelUp()
          const extended = [...seq, pickNext(seq)]
          sequenceRef.current = extended
          setSequence(extended)
          setTimeout(() => {
            if (!cancelRef.current) runShowPhase(extended)
          }, 1200)
        } else {
          playerIndexRef.current = nextIdx
          setPlayerIndex(nextIdx)
          lockedRef.current = false  // unlock for next tap in sequence
        }
      } else {
        phaseRef.current = 'gameover'
        wrongIdRef.current = clickedId
        setWrongId(clickedId)
        refreshColors()
        playWrong()
        setPhase('gameover')
      }
    }
  }, [playCorrect, playWrong, playLevelUp])

  const bestLength = sequence.length

  return (
    <div className="relative h-full overflow-hidden bg-slate-950 text-white">
      <div ref={containerRef} className="absolute inset-0" />

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 z-20">
          <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <p className="text-sm text-white/60 font-medium">Loading globe…</p>
        </div>
      )}

      {/* Start */}
      {!loading && phase === 'ready' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 text-center">
            <span className="text-6xl">🔁</span>
            <p className="text-white text-2xl font-bold">Copycat</p>
            <p className="text-white/60 text-sm max-w-xs">Watch which countries light up, then tap them back in the same order!</p>
            <button onClick={startGame} className="mt-2 px-10 py-4 rounded-2xl bg-white text-slate-900 text-xl font-bold hover:bg-white/90 active:scale-95 transition-all">
              Start!
            </button>
          </div>
        </div>
      )}

      {/* HUD — showing + playing + success */}
      {!loading && (phase === 'showing' || phase === 'playing' || phase === 'success') && (
        <>
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-4 pb-8 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
            <button className="pointer-events-auto text-sm font-semibold text-white/50 hover:text-white transition-colors" onClick={onBack}>← Games</button>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-white/50 uppercase tracking-widest">
                {phase === 'showing' ? 'Watch carefully 👀' : phase === 'success' ? '🎉 Correct!' : `Tap ${playerIndex + 1} of ${sequence.length}`}
              </span>
              <div className="flex gap-2 mt-1">
                {sequence.map((_, i) => (
                  <div key={i} className={cn(
                    'w-3 h-3 rounded-full transition-all',
                    i < playerIndex         ? 'bg-green-400'  :
                    i === playerIndex && phase === 'playing' ? 'bg-yellow-400 scale-125' :
                    'bg-white/20'
                  )} />
                ))}
              </div>
            </div>
            <div className="w-16" />
          </div>
        </>
      )}

      {/* Game over */}
      {phase === 'gameover' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 text-center">
            <span className="text-6xl">😬</span>
            <p className="text-white text-3xl font-bold">Oops!</p>
            <p className="text-white/70 text-xl">You got to <span className="text-white font-bold">{bestLength}</span> countries!</p>
            <button
              onClick={startGame}
              className="mt-2 px-10 py-4 rounded-2xl bg-white text-slate-900 text-xl font-bold hover:bg-white/90 active:scale-95 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Game select landing ───────────────────────────────────────────────────────
// Only these two are offered. The other games (Find on Map, Copycat, Spotlight,
// Hot & Cold, Globe Explorer) are still built and still wired up in the entry
// point below — they're just not listed here.
const GAMES = [
  { id: 'tour',      label: 'World Tour',    emoji: '✈️', description: 'Fly the world — tap each next stop',        available: true  },
  { id: 'find',      label: 'Find & Touch',  emoji: '👆', description: '3 rounds · 60 seconds each · easy → hard',  available: true  },
]

function GameSelect({ onStart }) {
  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-4 gap-4 bg-slate-950 text-white">
      <h2 className="text-2xl font-bold text-center">Geography</h2>
      <div className="grid grid-cols-2 gap-6 flex-1 content-center w-full max-w-3xl mx-auto">
        {GAMES.map(g => (
          <div
            key={g.id}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-2xl p-6 border-2 transition-all',
              g.available
                ? 'border-white/20 hover:border-white/60 hover:scale-105 active:scale-95 cursor-pointer bg-white/5'
                : 'border-white/10 opacity-40 cursor-not-allowed bg-white/5'
            )}
            onClick={() => g.available && onStart(g.id)}
          >
            <span className="text-5xl">{g.emoji}</span>
            <span className="text-xl font-bold">{g.label}</span>
            <span className="text-sm text-white/60 text-center">{g.description}</span>
            {!g.available && <span className="text-xs text-white/40">Coming soon</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Entry point ───────────────────────────────────────────────────────────────
export default function Test() {
  const [activeGame, setActiveGame] = useState(null)

  if (!activeGame)                return <GameSelect       onStart={setActiveGame} />
  if (activeGame === 'map')       return <FindTheCountry   onBack={() => setActiveGame(null)} />
  if (activeGame === 'tour')      return <WorldTour        onBack={() => setActiveGame(null)} />
  if (activeGame === 'globe')     return <GlobeGame        onBack={() => setActiveGame(null)} />
  if (activeGame === 'find')      return <FindTouchGame    onBack={() => setActiveGame(null)} />
  if (activeGame === 'hotcold')   return <HotColdGame      onBack={() => setActiveGame(null)} />
  if (activeGame === 'spotlight') return <SpotlightGame    onBack={() => setActiveGame(null)} />
  if (activeGame === 'copycat')   return <CopycatGame      onBack={() => setActiveGame(null)} />
  return <GameSelect onStart={setActiveGame} />
}
