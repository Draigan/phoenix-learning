import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ProfileProvider, useProfile } from './context/ProfileContext'
import { GameSettingsProvider } from './context/GameSettingsContext'
import { usePWAUpdate } from './hooks/usePWAUpdate'
import GameLayout from './layouts/GameLayout'
import ProfileSelect from './pages/ProfileSelect'
import Reward from './pages/Reward'

function RequireProfile({ children }) {
  const { activeProfile } = useProfile()
  if (!activeProfile) return <Navigate to="/profiles" replace />
  return children
}

export default function App() {
  usePWAUpdate()

  return (
    <ThemeProvider>
      <GameSettingsProvider>
      <ProfileProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/profiles"  element={<ProfileSelect />} />
            <Route path="/reward"    element={<RequireProfile><Reward /></RequireProfile>} />
            <Route path="/"          element={<Navigate to="/spelling" replace />} />
            <Route path="/geography" element={<Navigate to="/test" replace />} />
            <Route path="*"         element={<RequireProfile><GameLayout /></RequireProfile>} />
          </Routes>
        </BrowserRouter>
      </ProfileProvider>
      </GameSettingsProvider>
    </ThemeProvider>
  )
}
