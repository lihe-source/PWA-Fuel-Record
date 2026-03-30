import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref('light')

  function load() {
    const saved = localStorage.getItem('theme_preference')
    theme.value = saved || 'light'
    applyTheme()
  }

  function setTheme(value) {
    theme.value = value
    localStorage.setItem('theme_preference', value)
    applyTheme()
  }

  function applyTheme() {
    const html = document.documentElement
    html.classList.remove('light', 'dark')
    if (theme.value === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      html.classList.add(prefersDark ? 'dark' : 'light')
    } else {
      html.classList.add(theme.value)
    }
  }

  return { theme, load, setTheme, applyTheme }
})
