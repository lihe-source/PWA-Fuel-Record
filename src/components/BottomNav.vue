<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 border-t" style="background: var(--bg-primary); border-color: var(--border-color); padding-bottom: env(safe-area-inset-bottom);">
    <div class="flex justify-around items-center h-16">
      <router-link
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        class="flex flex-col items-center justify-center flex-1 h-full text-xs gap-1 transition-colors"
        :class="isActive(tab.path) ? 'text-blue-500' : ''"
        :style="isActive(tab.path) ? 'color: var(--accent)' : 'color: var(--text-secondary)'"
      >
        <span class="text-xl">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { path: '/', icon: '📊', label: '儀表板' },
  { path: '/fuel', icon: '⛽', label: '油耗記錄' },
  { path: '/maintenance', icon: '🔧', label: '保養記錄' },
  { path: '/vehicles', icon: '🚗', label: '車輛管理' },
  { path: '/settings', icon: '⚙️', label: '設定' }
]

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>
