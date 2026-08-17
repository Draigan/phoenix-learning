import { useState, useCallback, useMemo } from 'react'
import { ComposableMap, Geographies, Geography, Sphere, Marker } from 'react-simple-maps'
import { geoCentroid } from 'd3-geo'
import worldData from 'world-atlas/countries-50m.json'
import { REGIONS, COUNTRY_DATA, getRegionCountries, getRegion } from '../data/countries'
import { useProfile } from '../context/ProfileContext'
import { useSounds } from '../hooks/useSounds'
import { useStarReward } from '../hooks/useStarReward'
import { getMapProjection, countryColor, OCEAN_COLOR, BORDER_COLOR } from '../lib/mapConfig'
import { cn } from '../lib/utils'
import Celebration from '../components/Celebration'
import StreakBadge from '../components/StreakBadge'
import { Button } from '../components/ui/button'

const ROUND_SIZE = 8
const ROUND_STARS = 3
const HINT_THRESHOLD = 3

function pickCountries(regionId) {
  const pool = getRegionCountries(regionId)
  return [...pool].sort(() => Math.random() - 0.5).slice(0, ROUND_SIZE)
}

// ── Region Picker ─────────────────────────────────────────────────────────────
function RegionPicker({ onSelect, selectedId }) {
  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-4 gap-4">
      <h2 className="text-2xl font-bold text-center">Pick a region!</h2>
      <div className="grid grid-cols-5 gap-4 flex-1 content-center">
        {REGIONS.map(r => (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            style={{ background: r.gradient }}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-2xl py-8',
              'text-white font-bold shadow-lg',
              'hover:scale-105 active:scale-95 transition-transform',
              selectedId === r.id && 'ring-4 ring-white/80 ring-offset-2 ring-offset-background'
            )}
          >
            <span className="text-5xl">{r.emoji}</span>
            <span className="text-xl">{r.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Game select landing ───────────────────────────────────────────────────────
const GAMES = [
  { id: 'find', label: 'Find the Country', emoji: '🗺️', description: 'Tap the correct country on the map', available: true  },
  { id: 'flags',    label: 'Flags',     emoji: '🚩', description: 'Match the flag to its country',     available: false },
  { id: 'capitals', label: 'Capitals',  emoji: '🏛️', description: 'Name the capital city',             available: false },
]

function GameSelect({ onStart }) {
  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-4 gap-4">
      <h2 className="text-2xl font-bold text-center">Geography</h2>
      <div className="grid grid-cols-3 gap-4 flex-1 content-center">
        {GAMES.map(g => (
          <div
            key={g.id}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-2xl p-6',
              'border-2 transition-all',
              g.available
                ? 'border-border hover:border-primary hover:scale-105 active:scale-95 cursor-pointer bg-card'
                : 'border-border opacity-40 cursor-not-allowed bg-muted'
            )}
            onClick={() => g.available && onStart(g.id)}
          >
            <span className="text-5xl">{g.emoji}</span>
            <span className="text-xl font-bold">{g.label}</span>
            <span className="text-sm text-muted-foreground text-center">{g.description}</span>
            {!g.available && <span className="text-xs text-muted-foreground">Coming soon</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Find the Country game ──────────────────────────────────────────────────────
export function FindTheCountry({ onBack }) {
  const { getProgress, updateProgress, totalStars, addStars } = useProfile()
  const { playCorrect, playWrong, playWin, playLevelUp } = useSounds()
  const checkReward = useStarReward()

  const saved = getProgress('geography')

  const [regionId,       setRegionId]       = useState(saved.region ?? null)
  const [isPickerOpen,   setIsPickerOpen]   = useState(() => !saved.region)
  const [countries,      setCountries]      = useState(() => saved.region ? pickCountries(saved.region) : [])
  const [idx,            setIdx]            = useState(0)
  const [status,         setStatus]         = useState('finding') // finding | correct | wrong | hint | roundDone
  const [wrongId,        setWrongId]        = useState(null)
  const [wrongCount,     setWrongCount]     = useState(0)
  const [celebrationKey, setCelebrationKey] = useState(0)
  const [streak,         setStreak]         = useState(0)

  const target     = countries[idx] ?? null
  const region     = regionId ? getRegion(regionId) : null
  const { projection, config: projConfig } = useMemo(() => getMapProjection(regionId), [regionId])

  function advance() {
    const next = idx + 1
    if (next >= countries.length) {
      playWin()
      setStatus('roundDone')
      checkReward(addStars('geography', ROUND_STARS, { region: regionId }), { delay: 2200 })
    } else {
      setIdx(next)
      setStatus('finding')
      setWrongCount(0)
    }
  }

  function startNextRound() {
    setCountries(pickCountries(regionId))
    setIdx(0)
    setStatus('finding')
    setWrongCount(0)
    setWrongId(null)
    setCelebrationKey(k => k + 1)
  }

  function handleCountryClick(geoId) {
    if (status !== 'finding' || !target) return

    if (geoId === target.id) {
      playCorrect()
      const newStreak = streak + 1
      setStreak(newStreak)
      if ([5, 10, 15].includes(newStreak)) playLevelUp()
      setCelebrationKey(k => k + 1)
      setStatus('correct')
      setTimeout(advance, 1200)
    } else {
      playWrong()
      const newCount = wrongCount + 1
      setWrongCount(newCount)
      setWrongId(geoId)
      setStatus('wrong')

      if (newCount >= HINT_THRESHOLD) {
        setTimeout(() => {
          setWrongId(null)
          setStatus('hint')
          setTimeout(() => {
            setStatus('finding')
            setWrongCount(0)
          }, 2000)
        }, 600)
      } else {
        setTimeout(() => {
          setWrongId(null)
          setStatus('finding')
        }, 600)
      }
    }
  }

  function selectRegion(id) {
    setRegionId(id)
    setCountries(pickCountries(id))
    setIdx(0)
    setStatus('finding')
    setWrongCount(0)
    setWrongId(null)
    setStreak(0)
    setIsPickerOpen(false)
    updateProgress('geography', { region: id })
  }

  const getFill = useCallback((geoId) => {
    if (status === 'correct'  && geoId === target?.id) return '#22c55e'
    if (status === 'hint'     && geoId === target?.id) return '#f59e0b'
    if (status === 'wrong'    && geoId === wrongId)    return '#ef4444'
    return null
  }, [status, target, wrongId])

  // ── Region picker ────────────────────────────────────────────────────────────
  if (isPickerOpen || !regionId) {
    return <RegionPicker onSelect={selectRegion} selectedId={regionId} />
  }

  // ── Game ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">

      {/* Header — sits above the map, never overlaps */}
      <div className="flex-none bg-background border-b border-border">
        {/* Stats row */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Games
            </button>
            <button
              onClick={() => setIsPickerOpen(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{region?.emoji}</span>
              <span>{region?.label}</span>
            </button>
          </div>
          <span className="text-sm text-muted-foreground font-medium">
            {idx + 1} / {countries.length}
          </span>
          <div className="flex items-center gap-3">
            <StreakBadge streak={streak} />
            <span className="text-sm font-semibold">⭐ {totalStars}</span>
          </div>
        </div>

        {/* Prompt row */}
        <div className="flex items-center justify-center gap-3 px-6 pb-3">
          <span className="text-xl font-bold text-muted-foreground">Find:</span>
          <span className={cn(
            'text-2xl font-bold uppercase transition-colors duration-300',
            status === 'correct' && 'text-green-600',
            status === 'hint'    && 'text-amber-600',
            status === 'wrong'   && 'text-red-500',
            status === 'finding' && 'text-foreground',
          )}>
            {target?.name}
          </span>
          <span className="text-2xl">{target?.flag}</span>
          {status === 'correct' && <span className="text-xl font-bold text-green-500">🌟 Found it!</span>}
          {status === 'wrong'   && <span className="text-base font-semibold text-red-500">Try again!</span>}
          {status === 'hint'    && <span className="text-base font-semibold text-amber-500">Here it is! 👆</span>}
        </div>
      </div>

      {/* Map — fills all remaining space */}
      <div className="flex-1 min-h-0 relative" style={{ background: OCEAN_COLOR }}>
        <ComposableMap
          projection={projection}
          projectionConfig={projConfig}
          style={{ width: '100%', height: '100%' }}
        >
          <Sphere id="rsm-sphere" fill={OCEAN_COLOR} stroke={BORDER_COLOR} strokeWidth={0.3} />
          <Geographies geography={worldData}>
            {({ geographies }) => {
              const fontSize = Math.max(5, Math.min(13, projConfig.scale / 48))
              return (
                <>
                  {geographies.map(geo => {
                    const geoId = String(geo.id)
                    const highlight = getFill(geoId)
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={highlight ?? countryColor(geoId, geo.properties?.name)}
                        stroke="#fff"
                        strokeWidth={0.5}
                        style={{ outline: 'none', cursor: 'pointer' }}
                        onClick={() => handleCountryClick(geoId)}
                      />
                    )
                  })}
                  {geographies.map(geo => {
                    const geoId = String(geo.id)
                    const info = COUNTRY_DATA[geoId]
                    if (!info) return null
                    const centroid = geoCentroid(geo)
                    return (
                      <Marker key={geoId + '-lbl'} coordinates={centroid}>
                        <text
                          fontSize={fontSize}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontWeight="700"
                          fill="#111"
                          stroke="#fff"
                          strokeWidth={fontSize * 0.35}
                          paintOrder="stroke"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          {info.name}
                        </text>
                      </Marker>
                    )
                  })}
                </>
              )
            }}
          </Geographies>
        </ComposableMap>

        {/* Round complete overlay */}
        {status === 'roundDone' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/85 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="text-5xl">🌍</span>
              <span className="text-3xl font-bold">Round Complete!</span>
              <span className="text-xl text-yellow-500 font-semibold">{'⭐'.repeat(ROUND_STARS)} +{ROUND_STARS} stars</span>
              <Button size="lg" onClick={startNextRound} className="px-10 text-lg mt-2">
                Next Round →
              </Button>
            </div>
          </div>
        )}
      </div>

      {celebrationKey > 0 && <Celebration key={celebrationKey} />}
    </div>
  )
}

// ── Top-level entry point ─────────────────────────────────────────────────────
export default function GeographyGame() {
  const [activeGame, setActiveGame] = useState(null)

  if (!activeGame) return <GameSelect onStart={setActiveGame} />
  if (activeGame === 'find') return <FindTheCountry onBack={() => setActiveGame(null)} />
  return <GameSelect onStart={setActiveGame} />
}
