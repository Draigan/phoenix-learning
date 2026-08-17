import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext'
import { Button } from '../components/ui/button'

function thumbUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}

// Transparent panels that block clicks everywhere except the centre play/pause zone.
// Centre hole: left 35%–65%, top 15%–80%
function YouTubeOverlay() {
  const panel = 'absolute pointer-events-auto'
  const block = (e) => e.preventDefault()
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <div className={`${panel} top-0    left-0  right-0  h-[15%]`}  onPointerDown={block} />
      <div className={`${panel} bottom-0 left-0  right-0  h-[20%]`}  onPointerDown={block} />
      <div className={`${panel} top-[15%] bottom-[20%] left-0  w-[35%]`} onPointerDown={block} />
      <div className={`${panel} top-[15%] bottom-[20%] right-0 w-[35%]`} onPointerDown={block} />
    </div>
  )
}

// view: 'grid' | 'confirm-watch' | 'watching' | 'confirm-done'

export default function Reward() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { activeProfile, resetStars } = useProfile()
  const returnTo  = state?.from ?? '/spelling'   // back to the game that earned it
  const [view,    setView]    = useState('grid')
  const [pending, setPending] = useState(null)   // video chosen but not confirmed
  const [current, setCurrent] = useState(null)   // video being watched

  const videos = (() => {
    try { return JSON.parse(localStorage.getItem('gameSettings'))?.global?.videos ?? [] }
    catch { return [] }
  })()

  function handlePick(video) {
    setPending(video)
    setView('confirm-watch')
  }

  function handleConfirmWatch() {
    setCurrent(pending)
    setPending(null)
    setView('watching')
  }

  function handleCancelWatch() {
    setPending(null)
    setView('grid')
  }

  function handleDonePress() {
    setView('confirm-done')
  }

  function handleConfirmDone() {
    resetStars()
    navigate(returnTo)
  }

  function handleCancelDone() {
    setView('watching')
  }

  // ── Grid ────────────────────────────────────────────────────────────────────
  if (view === 'grid') return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-bold">
          🎉 Pick your video, {activeProfile?.name}!
        </h1>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <span className="text-5xl">🎬</span>
            <p className="text-lg">No videos added yet.</p>
            <p className="text-sm">Ask a grown-up to add videos in Settings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {videos.map(v => (
              <button
                key={v.id}
                onClick={() => handlePick(v)}
                className="flex flex-col gap-2 rounded-2xl overflow-hidden border-2 border-border hover:border-primary transition-all hover:scale-105 active:scale-100"
              >
                <img
                  src={thumbUrl(v.videoId)}
                  alt={v.title}
                  className="w-full aspect-video object-cover"
                />
                <span className="px-3 pb-3 text-sm font-semibold text-left line-clamp-2">
                  {v.title}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ── Confirm watch ────────────────────────────────────────────────────────────
  if (view === 'confirm-watch') return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 bg-background">
      <h2 className="text-2xl font-bold">Watch this one?</h2>
      <div className="flex flex-col items-center gap-3 max-w-sm w-full">
        <img
          src={thumbUrl(pending.videoId)}
          alt={pending.title}
          className="w-full rounded-2xl shadow-lg"
        />
        <p className="text-xl font-semibold text-center">{pending.title}</p>
      </div>
      <div className="flex gap-4">
        <Button size="lg" variant="outline" onClick={handleCancelWatch}>
          ← Pick another
        </Button>
        <Button size="lg" onClick={handleConfirmWatch}>
          Yes, watch this! ▶
        </Button>
      </div>
    </div>
  )

  // ── Watching + confirm-done (single iframe stays mounted) ───────────────────
  if (view === 'watching' || view === 'confirm-done') return (
    <div className="relative flex flex-col h-full bg-black">
      <iframe
        className="flex-1 w-full"
        src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1&rel=0&modestbranding=1`}
        title={current.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />

      <YouTubeOverlay />

      {view === 'watching' && (
        <div className="absolute top-3 right-3 z-20">
          <Button onClick={handleDonePress} variant="secondary" size="sm">
            Done watching
          </Button>
        </div>
      )}

      {view === 'confirm-done' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="bg-background rounded-2xl p-8 flex flex-col items-center gap-6 shadow-2xl max-w-sm w-full mx-4">
            <p className="text-2xl font-bold text-center">All done watching?</p>
            <p className="text-muted-foreground text-center text-sm">
              This will go back to the game and reset your points.
            </p>
            <div className="flex gap-4 w-full">
              <Button size="lg" variant="outline" className="flex-1" onClick={handleCancelDone}>
                Not yet
              </Button>
              <Button size="lg" className="flex-1" onClick={handleConfirmDone}>
                All done! ✓
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
