import { createContext, useContext, useEffect, useState } from 'react'

export const themes = [
  {
    id: 'light',
    label: 'Light',
    swatchBg: '#ffffff',
    swatchPrimary: '#18181b',
  },
  {
    id: 'dark',
    label: 'Dark',
    swatchBg: '#09090b',
    swatchPrimary: '#fafafa',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    swatchBg: '#071526',
    swatchPrimary: '#38bdf8',
  },
  {
    id: 'candy',
    label: 'Candy',
    swatchBg: '#fdf2f8',
    swatchPrimary: '#d946ef',
  },
  {
    id: 'forest',
    label: 'Forest',
    swatchBg: '#071a07',
    swatchPrimary: '#4ade80',
  },
]

export const fonts = [
  { id: 'system', label: 'Default',  family: 'system-ui, sans-serif' },
  { id: 'nunito', label: 'Nunito',   family: "'Nunito', sans-serif" },
  { id: 'baloo',  label: 'Baloo',    family: "'Baloo 2', sans-serif" },
]

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [font,  setFont]  = useState(() => localStorage.getItem('font')  || 'system')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-font', font)
    localStorage.setItem('font', font)
  }, [font])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, font, setFont }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
