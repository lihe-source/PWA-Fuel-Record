import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref('light')

  function initTheme() {
    const saved = localStorage.getItem('theme_preference')
    theme.value = saved || 'light'
    applyTheme(theme.value)
  }

  function setTheme(val) {
    theme.value = val
    localStorage.setItem('theme_preference', val)
    applyTheme(val)
  }

  function applyTheme(val) {
    const html = document.documentElement
    html.classList.remove('light', 'dark')
    if (val === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      html.classList.add(prefersDark ? 'dark' : 'light')
    } else {
      html.classList.add(val)
    }
  }

  return { theme, initTheme, setTheme }
})
