import { createContext, useContext, useState } from 'react'

const defaults = {
  spelling: {
    practiceReps:  5,
    testReps:      3,
    defaultLevel:  1,
    voiceName:     null,
  },
  global: {
    pointsToWin: 50,
    videoOnWin:  false,
    videos: [   // [{ id, title, videoId }]
      { id: 'v1',  title: 'Learn Spanish Colors, Shapes & Numbers',   videoId: 'y6Fo4i_pLyc' },
      { id: 'v2',  title: "World's Largest Marble Run Race",         videoId: 'tbxZd-Ea43I' },
      { id: 'v3',  title: "Sand Marble Race - Jelle's Marble Runs",  videoId: '0sHu99vdz-A' },
      { id: 'v4',  title: "Marble Race - America's Cup 2025",        videoId: 'NSVOC2Kr_LE' },
      { id: 'v5',  title: 'Super Mario Marble Race',                 videoId: 'zFz5Zgrzw78' },
      { id: 'v6',  title: 'Multiplication for Kids - Level 1',       videoId: 'pevLVn_mfPE' },
      { id: 'v7',  title: 'Multiplication for Kids - Level 2',       videoId: 'ySWnCWlF5TA' },
      { id: 'v8',  title: 'Multiplication for Kids - Level 3',       videoId: 'NIeZJbZG3D4' },
      { id: 'v9',  title: 'Multiplication for Kids - Level 4',       videoId: '9YF9pBC4eAM' },
      { id: 'v10', title: 'Multiplication for Kids - Level 5',       videoId: 'p_si0m1WnfM' },
      { id: 'v11', title: 'Multiplication for Kids - Level 10',      videoId: 'z6o6oWa9M10' },
      { id: 'v12', title: 'How to Play Chess - ChessKid',            videoId: 'YdnvlntAQH8' },
      { id: 'v13', title: 'French Numbers Song - Count to 100',      videoId: 'NmCize5EwbU' },
      { id: 'v14', title: 'Alone - Pacific Rim (Animation)',         videoId: 'Nf4O0gwlSMw' },
    ],
  },
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem('gameSettings'))
    if (!saved) return defaults
    return {
      spelling: { ...defaults.spelling, ...saved.spelling },
      global:   { ...defaults.global,   ...saved.global,
                  videos: saved.global?.videos ?? defaults.global.videos },
    }
  } catch { return defaults }
}

const GameSettingsContext = createContext()

export function GameSettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)

  function update(section, patch) {
    setSettings(prev => {
      const next = { ...prev, [section]: { ...prev[section], ...patch } }
      localStorage.setItem('gameSettings', JSON.stringify(next))
      return next
    })
  }

  return (
    <GameSettingsContext.Provider value={{ settings, update }}>
      {children}
    </GameSettingsContext.Provider>
  )
}

export const useGameSettings = () => useContext(GameSettingsContext)
