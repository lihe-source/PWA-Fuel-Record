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
import { useSettingsStore } from './stores/settings.js'

const route = useRoute()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const showNav = computed(() => authStore.user && route.path !== '/login')

onMounted(() => {
  settingsStore.initTheme()
})
</script>

<style>
#app-container {
  min-height: 100vh;
  background: var(--bg-secondary);
}
</style>
