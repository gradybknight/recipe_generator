import { useEffect, useState } from 'react'

const getSystemPreference = () => window.matchMedia('(prefers-color-scheme: dark)').matches

export function useDarkMode(): [boolean, () => void] {
  const [darkMode, setDarkMode] = useState(getSystemPreference)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => setDarkMode(event.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  const toggleDarkMode = () => setDarkMode((enabled) => !enabled)

  return [darkMode, toggleDarkMode]
}
