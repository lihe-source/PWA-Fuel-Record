<template>
  <div id="app-container">
    <RouterView />
    <BottomNav v-if="showNav" />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from './components/BottomNav.vue'
import { useAuthStore } from './stores/auth.js'
import { applyTheme } from './stores/settings.js'

const route = useRoute()
const authStore = useAuthStore()

const showNav = computed(() => authStore.user && route.path !== '/login')

onMounted(() => {
  const saved = localStorage.getItem('theme_preference') || 'light'
  applyTheme(saved)
})
</script>

<style>
#app-container {
  min-height: 100vh;
  background: var(--bg-secondary);
}
</style>
