<template>
  <RouterView />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { useSettingsStore } from './stores/settings'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()

onMounted(() => {
  settingsStore.load()
  authStore.init()
})
</script>
