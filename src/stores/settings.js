import { defineStore } from 'pinia'
import { ref } from 'vue'

function applyTheme(theme) {
  const html = document.documentElement
  html.classList.remove('light', 'dark')
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.classList.add(isDark ? 'dark' : 'light')
  } else {
    html.classList.add(theme)
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref('light')

  function initTheme() {
    const saved = localStorage.getItem('theme_preference') || 'light'
    theme.value = saved
    applyTheme(saved)
  }

  function setTheme(newTheme) {
    theme.value = newTheme
    localStorage.setItem('theme_preference', newTheme)
    applyTheme(newTheme)
  }

  return { theme, initTheme, setTheme }
})
