import { useEffect, useState } from 'react'

export function useDarkMode(): [boolean, () => void] {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  const toggleDarkMode = () => setDarkMode((enabled) => !enabled)

  return [darkMode, toggleDarkMode]
}
