import { createContext, useContext, useState } from 'react'

const ProfileContext = createContext()

const SUBJECTS = ['spelling', 'math', 'geography']

function defaultProgress() {
  return Object.fromEntries(
    SUBJECTS.map(s => [s, { stars: 0, level: 1, lastPlayed: null }])
  )
}

function loadProfiles() {
  try { return JSON.parse(localStorage.getItem('profiles') || '[]') }
  catch { return [] }
}

function loadProgress(profileId) {
  try {
    const saved = JSON.parse(localStorage.getItem(`progress:${profileId}`))
    // Merge over defaults so a profile saved before a subject existed still
    // has an entry for it.
    return saved ? { ...defaultProgress(), ...saved } : defaultProgress()
  } catch { return defaultProgress() }
}

// Stars are one shared pool — every subject pays into the same total.
function sumStars(all) {
  return SUBJECTS.reduce((total, s) => total + (all[s]?.stars ?? 0), 0)
}

export function ProfileProvider({ children }) {
  const [profiles, setProfiles] = useState(loadProfiles)
  const [activeId, setActiveId] = useState(() => localStorage.getItem('activeProfile'))
  // Held in state so every screen showing the star count re-renders when it changes.
  const [totalStars, setTotalStars] = useState(() => {
    const id = localStorage.getItem('activeProfile')
    return id ? sumStars(loadProgress(id)) : 0
  })

  const activeProfile = profiles.find(p => p.id === activeId) ?? null

  function saveProfiles(updated) {
    setProfiles(updated)
    localStorage.setItem('profiles', JSON.stringify(updated))
  }

  function activateProfile(id) {
    setActiveId(id)
    setTotalStars(id ? sumStars(loadProgress(id)) : 0)
    localStorage.setItem('activeProfile', id)
  }

  function createProfile(name, avatar) {
    const id = String(Date.now())
    const profile = { id, name, avatar, createdAt: new Date().toISOString() }
    saveProfiles([...profiles, profile])
    localStorage.setItem(`progress:${id}`, JSON.stringify(defaultProgress()))
    activateProfile(id)
    return profile
  }

  function deleteProfile(id) {
    const updated = profiles.filter(p => p.id !== id)
    saveProfiles(updated)
    localStorage.removeItem(`progress:${id}`)
    if (activeId === id) {
      const next = updated[0]?.id ?? null
      setActiveId(next)
      setTotalStars(next ? sumStars(loadProgress(next)) : 0)
      next
        ? localStorage.setItem('activeProfile', next)
        : localStorage.removeItem('activeProfile')
    }
  }

  function getProgress(subject) {
    if (!activeId) return defaultProgress()[subject]
    return loadProgress(activeId)[subject]
  }

  function updateProgress(subject, data) {
    if (!activeId) return
    const all = loadProgress(activeId)
    const updated = {
      ...all,
      [subject]: { ...all[subject], ...data, lastPlayed: new Date().toISOString() },
    }
    localStorage.setItem(`progress:${activeId}`, JSON.stringify(updated))
  }

  // Adds stars earned in one subject and returns the new shared total across
  // all subjects. Reads straight from storage so the total can't go stale.
  function addStars(subject, amount, data = {}) {
    if (!activeId) return 0
    const all = loadProgress(activeId)
    const updated = {
      ...all,
      [subject]: {
        ...all[subject],
        ...data,
        stars: (all[subject]?.stars ?? 0) + amount,
        lastPlayed: new Date().toISOString(),
      },
    }
    localStorage.setItem(`progress:${activeId}`, JSON.stringify(updated))
    const newTotal = sumStars(updated)
    setTotalStars(newTotal)
    return newTotal
  }

  function resetStars() {
    if (!activeId) return
    const all = loadProgress(activeId)
    const updated = Object.fromEntries(
      Object.entries(all).map(([subject, progress]) => [subject, { ...progress, stars: 0 }])
    )
    localStorage.setItem(`progress:${activeId}`, JSON.stringify(updated))
    setTotalStars(0)
  }

  return (
    <ProfileContext.Provider value={{
      profiles,
      activeProfile,
      selectProfile: activateProfile,
      createProfile,
      deleteProfile,
      getProgress,
      updateProgress,
      totalStars,
      addStars,
      resetStars,
    }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => useContext(ProfileContext)
