import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { ComposableMap, Geography, Sphere, Line, Marker, ZoomableGroup } from 'react-simple-maps'
import { geoInterpolate } from 'd3-geo'
import { useProfile } from '../context/ProfileContext'
import { useSounds } from '../hooks/useSounds'
import { useStarReward } from '../hooks/useStarReward'
import { getMapProjection, countryColor, OCEAN_COLOR, BORDER_COLOR,
         VISITED_COLOR, WRONG_COLOR, HINT_COLOR } from '../lib/mapConfig'
import { buildMapGeometry, LABEL_MIN, LABEL_MAX } from '../lib/mapGeometry'
import { buildRoute, bearing, legDistanceKm, easeInOutCubic, STOPS_PER_TOUR } from '../lib/tour'
import { cn } from '../lib/utils'
import Celebration from '../components/Celebration'
import StreakBadge from '../components/StreakBadge'
import { Button } from '../components/ui/button'

const TOUR_STARS     = 3
const HINT_THRESHOLD = 3
const HINT_HOLD_MS   = 4500   // long enough to look, find it, and reach for it
const FLIGHT_MS      = 1500

const MIN_ZOOM = 1
const MAX_ZOOM = 8

// Plane silhouette pointing due north, so it can be rotated by a compass bearing.
const PLANE_PATH = 'M0,-11 L2.4,-3.2 L10,2 L10,4.2 L2.4,1.7 L2.4,6.5 L5,8.6 L5,10.2 ' +
                   'L0,9 L-5,10.2 L-5,8.6 L-2.4,6.5 L-2.4,1.7 L-10,4.2 L-10,2 L-2.4,-3.2 Z'

const { projection, config: projConfig } = getMapProjection('world')

export default function WorldTour({ onBack }) {
  const { totalStars, addStars } = useProfile()
  const { playCorrect, playWrong, playWin, playLevelUp } = useSounds()
  const checkReward = useStarReward()

  const { shapes, centers, labelSizes } = useMemo(() => buildMapGeometry('world'), [])

  const [route,          setRoute]          = useState(buildRoute)
  const [stopIdx,        setStopIdx]        = useState(1)   // route[0] is the departure
  const [status,         setStatus]         = useState('finding') // finding|flying|wrong|hint|done
  const [wrongId,        setWrongId]        = useState(null)
  const [wrongCount,     setWrongCount]     = useState(0)
  const [streak,         setStreak]         = useState(0)
  const [kmFlown,        setKmFlown]        = useState(0)
  const [celebrationKey, setCelebrationKey] = useState(0)
  const [plane,          setPlane]          = useState(null) // { at, angle } mid-flight
  const [zoomK,          setZoomK]          = useState(1)
  const [viewKey,        setViewKey]        = useState(0)     // bumped to reset the pan/zoom

  const rafRef      = useRef(null)
  const timeoutsRef = useRef(new Set())
  const draggedRef  = useRef(false)   // tells a pan/pinch apart from a tap
  const clickRef    = useRef(null)

  const target   = route[stopIdx] ?? null
  const previous = route[stopIdx - 1] ?? null
  const visited  = route.slice(0, stopIdx)
  // Idle, the plane waits at the last stop reached — never at the one being
  // hunted for, which would give the answer away.
  const parked   = plane?.at ?? centers[previous?.id]

  const queueTimeout = useCallback((fn, delay) => {
    const id = window.setTimeout(() => {
      timeoutsRef.current.delete(id)
      fn()
    }, delay)
    timeoutsRef.current.add(id)
  }, [])

  useEffect(() => () => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current.clear()
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  function flyTo(fromId, toId, onArrive) {
    const from = centers[fromId]
    const to   = centers[toId]
    if (!from || !to) { onArrive(); return }

    const path  = geoInterpolate(from, to)
    const start = performance.now()

    function step(now) {
      const t  = Math.min(1, (now - start) / FLIGHT_MS)
      const at = path(easeInOutCubic(t))
      // Look slightly ahead so the nose points along the arc.
      const ahead = path(Math.min(1, easeInOutCubic(t) + 0.02))
      setPlane({ at, angle: bearing(at, ahead) })

      if (t < 1) rafRef.current = requestAnimationFrame(step)
      else {
        rafRef.current = null
        setPlane(null)
        onArrive()
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }

  function handleCountryClick(geoId) {
    // A drag that ends over a country still fires a click — don't score it.
    if (draggedRef.current) { draggedRef.current = false; return }
    if (status !== 'finding' || !target) return

    if (geoId !== target.id) {
      playWrong()
      const next = wrongCount + 1
      setWrongCount(next)
      setWrongId(geoId)
      setStatus('wrong')
      setStreak(0)

      if (next >= HINT_THRESHOLD) {
        queueTimeout(() => {
          setWrongId(null)
          setStatus('hint')
          queueTimeout(() => { setStatus('finding'); setWrongCount(0) }, HINT_HOLD_MS)
        }, 600)
      } else {
        queueTimeout(() => { setWrongId(null); setStatus('finding') }, 600)
      }
      return
    }

    playCorrect()
    const newStreak = streak + 1
    setStreak(newStreak)
    if ([3, 5, 10].includes(newStreak)) playLevelUp()
    setWrongCount(0)
    setWrongId(null)
    setStatus('flying')

    const from = centers[previous.id]
    const to   = centers[target.id]
    if (from && to) setKmFlown(km => km + legDistanceKm(from, to))

    flyTo(previous.id, target.id, () => {
      const landed = stopIdx + 1
      setStopIdx(landed)

      if (landed > STOPS_PER_TOUR) {
        playWin()
        setCelebrationKey(k => k + 1)
        setStatus('done')
        checkReward(addStars('geography', TOUR_STARS), { delay: 2200 })
      } else {
        setCelebrationKey(k => k + 1)
        setStatus('finding')
      }
    })
  }

  function startNewTour() {
    setRoute(buildRoute())
    setStopIdx(1)
    setStatus('finding')
    setWrongId(null)
    setWrongCount(0)
    setKmFlown(0)
    setPlane(null)
    setCelebrationKey(k => k + 1)
  }

  const getHighlight = useCallback((geoId) => {
    if (status === 'hint'  && geoId === target?.id) return HINT_COLOR
    if (status === 'wrong' && geoId === wrongId)    return WRONG_COLOR
    if (route.slice(0, stopIdx).some(c => c.id === geoId)) return VISITED_COLOR
    return null
  }, [status, target, wrongId, route, stopIdx])

  const isHinted = useCallback(
    (geoId) => status === 'hint' && geoId === target?.id,
    [status, target]
  )

  // Kept in a ref so the memoized country layer can call the current handler
  // without listing it as a dependency and rebuilding on every state change.
  useEffect(() => { clickRef.current = handleCountryClick })

  // Rebuilt only when a fill changes — never on zoom, so panning and pinching
  // don't re-render 241 country paths every frame.
  const countryLayer = useMemo(() => shapes.map((shape, i) => (
    <Geography
      key={`${shape.id}-${i}`}
      geography={shape}
      fill={getHighlight(shape.id) ?? countryColor(shape.id, shape.name)}
      className={isHinted(shape.id) ? 'hint-pulse' : undefined}
      stroke="#fff"
      strokeWidth={0.5}
      vectorEffect="non-scaling-stroke"
      style={{ outline: 'none', cursor: 'pointer' }}
      onClick={() => clickRef.current(shape.id)}
    />
  )), [shapes, getHighlight, isHinted])

  function resetView() {
    setZoomK(1)
    setViewKey(k => k + 1)
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">

      {/* Header */}
      <div className="flex-none bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Games
            </button>
            <span className="text-sm text-muted-foreground font-medium tabular-nums">
              ✈️ {kmFlown.toLocaleString()} km
            </span>
          </div>

          {/* Passport — a stamp per stop reached */}
          <div className="flex items-center gap-1.5">
            {route.slice(1).map((stop, i) => {
              const stamped = i < stopIdx - 1
              return (
                <span
                  key={stop.id}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border-2 text-base transition-all',
                    stamped
                      ? 'border-green-500 bg-green-500/15 scale-100'
                      : 'border-dashed border-muted-foreground/30 scale-90'
                  )}
                >
                  {/* Emoji ignore text colour, so an unreached stop renders nothing
                      rather than a hidden flag that would spoil the route. */}
                  {stamped ? stop.flag : ''}
                </span>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <StreakBadge streak={streak} />
            <span className="text-sm font-semibold">⭐ {totalStars}</span>
          </div>
        </div>

        {/* Prompt */}
        <div className="flex items-center justify-center gap-3 px-6 pb-3">
          {status === 'done' ? (
            <span className="text-2xl font-bold text-green-600">Tour complete! 🎉</span>
          ) : (
            <>
              <span className="text-xl font-bold text-muted-foreground">
                {status === 'flying' ? 'Flying to' : 'Next stop:'}
              </span>
              <span className={cn(
                'text-2xl font-bold uppercase transition-colors duration-300',
                status === 'flying' && 'text-sky-600',
                status === 'hint'   && 'text-violet-700',
                status === 'wrong'  && 'text-red-500',
              )}>
                {target?.name}
              </span>
              <span className="text-2xl">{target?.flag}</span>
              {status === 'wrong' && <span className="text-base font-semibold text-red-500">Not that one!</span>}
              {status === 'hint'  && <span className="text-base font-semibold text-violet-700">Here it is! 👆</span>}
              <span className="text-sm text-muted-foreground font-medium tabular-nums">
                {Math.min(stopIdx, STOPS_PER_TOUR)} / {STOPS_PER_TOUR}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-0 relative" style={{ background: OCEAN_COLOR }}>
        <ComposableMap
          projection={projection}
          projectionConfig={projConfig}
          // Without this the browser claims the pinch as a page zoom and d3
          // never sees the gesture — pinch-to-zoom would do nothing in the PWA.
          style={{ width: '100%', height: '100%', touchAction: 'none' }}
        >
          <ZoomableGroup
            key={viewKey}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            translateExtent={[[0, 0], [800, 600]]}
            onMoveStart={() => { draggedRef.current = false }}
            onMove={({ zoom }) => {
              draggedRef.current = true
              setZoomK(zoom)
            }}
          >
            <Sphere id="tour-sphere" fill={OCEAN_COLOR} stroke={BORDER_COLOR} strokeWidth={0.3} />

            {countryLayer}

            {/* Completed legs */}
            {visited.slice(1).map((stop, i) => (
              <Line
                key={`leg-${stop.id}`}
                from={centers[visited[i].id]}
                to={centers[stop.id]}
                stroke="#1f2937"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeDasharray="5 5"
                vectorEffect="non-scaling-stroke"
                fill="none"
              />
            ))}

            {/* Trail growing behind the plane mid-flight */}
            {plane && previous && (
              <Line
                from={centers[previous.id]}
                to={plane.at}
                stroke="#1f2937"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeDasharray="5 5"
                vectorEffect="non-scaling-stroke"
                fill="none"
              />
            )}

            {/* Stop labels sit on the country and are sized to it. At rest that
                means the fitted size; as the map is zoomed the country grows
                while the label creeps up to a comfortable reading size and then
                holds there, so small countries become legible by zooming in. */}
            {visited.map(stop => {
              const size = Math.min(labelSizes[stop.id] ?? LABEL_MIN, LABEL_MAX / zoomK)
              return (
                <Marker key={`pin-${stop.id}`} coordinates={centers[stop.id]}>
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={size}
                    fontWeight="700"
                    fill="#111"
                    stroke="#fff"
                    strokeWidth={size * 0.3}
                    paintOrder="stroke"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {stop.name}
                  </text>
                </Marker>
              )
            })}

            {/* Plane */}
            {parked && (
              <Marker coordinates={parked}>
                <path
                  d={PLANE_PATH}
                  transform={`rotate(${plane?.angle ?? 0}) scale(${0.85 / zoomK})`}
                  fill="#fff"
                  stroke="#1f2937"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  style={{ pointerEvents: 'none' }}
                />
              </Marker>
            )}
          </ZoomableGroup>
        </ComposableMap>

        {/* Reset the view — a kid who pinches into the middle of the Pacific
            needs one tap back to the whole world. */}
        {zoomK > 1.01 && (
          <button
            onClick={resetView}
            className="absolute bottom-3 right-3 z-10 rounded-full bg-background/90 border border-border px-3 py-2 text-sm font-semibold shadow-lg hover:bg-background transition-colors"
          >
            🔍 Reset view
          </button>
        )}

        {/* Tour complete overlay */}
        {status === 'done' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/85 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-4 text-center px-6">
              <span className="text-5xl">🛬</span>
              <span className="text-3xl font-bold">Tour Complete!</span>
              <span className="text-lg text-muted-foreground">
                You flew <span className="font-bold text-foreground tabular-nums">{kmFlown.toLocaleString()} km</span> around the world
              </span>
              <div className="flex gap-1.5 text-2xl">
                {route.slice(1).map(stop => <span key={stop.id}>{stop.flag}</span>)}
              </div>
              <span className="text-xl text-yellow-500 font-semibold">
                {'⭐'.repeat(TOUR_STARS)} +{TOUR_STARS} stars
              </span>
              <Button size="lg" onClick={startNewTour} className="px-10 text-lg mt-2">
                New Tour →
              </Button>
            </div>
          </div>
        )}
      </div>

      {celebrationKey > 0 && <Celebration key={celebrationKey} />}
    </div>
  )
}
