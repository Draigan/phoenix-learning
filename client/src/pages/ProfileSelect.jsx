import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'

const AVATARS = ['🦊','🐻','🐼','🦁','🐯','🐸','🐧','🦄','🐉','🦋','🐬','🦖','🐨','🐺','🦅','🐙']

export default function ProfileSelect() {
  const { profiles, createProfile, selectProfile } = useProfile()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])

  function handleSelect(id) {
    selectProfile(id)
    navigate('/spelling')
  }

  function handleCreate() {
    if (!name.trim()) return
    createProfile(name.trim(), avatar)
    navigate('/spelling')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') setAdding(false)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8 bg-background">
      <h1 className="text-4xl font-bold">Who's Playing?</h1>

      <div className="flex flex-wrap justify-center gap-4">
        {profiles.map(p => (
          <button
            key={p.id}
            onClick={() => handleSelect(p.id)}
            className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-accent transition-all w-36"
          >
            <span className="text-5xl">{p.avatar}</span>
            <span className="text-lg font-semibold truncate w-full text-center">{p.name}</span>
          </button>
        ))}

        {!adding && (
          <button
            onClick={() => { setAdding(true); setName(''); setAvatar(AVATARS[0]) }}
            className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-accent transition-all w-36"
          >
            <span className="text-4xl text-muted-foreground">+</span>
            <span className="text-sm font-medium text-muted-foreground">Add Profile</span>
          </button>
        )}
      </div>

      {adding && (
        <div className="flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-primary bg-accent/30 w-full max-w-sm">
          <h2 className="text-xl font-bold">New Profile</h2>

          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-3 text-lg rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            maxLength={20}
            autoFocus
          />

          <div className="flex flex-wrap justify-center gap-2">
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                className={cn(
                  'text-3xl p-2 rounded-xl transition-all',
                  avatar === a
                    ? 'bg-primary/20 ring-2 ring-primary scale-110'
                    : 'hover:bg-accent'
                )}
              >
                {a}
              </button>
            ))}
          </div>

          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!name.trim()}>
              Let's Go!
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
