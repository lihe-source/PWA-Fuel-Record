<template>
  <nav class="bottom-nav">
    <RouterLink to="/dashboard" class="nav-item" :class="{ active: route.path === '/dashboard' }">
      <span class="nav-icon">🏠</span>
      <span>總覽</span>
    </RouterLink>
    <RouterLink to="/fuel" class="nav-item" :class="{ active: route.path === '/fuel' }">
      <span class="nav-icon">⛽</span>
      <span>加油</span>
    </RouterLink>
    <RouterLink to="/maintenance" class="nav-item" :class="{ active: route.path === '/maintenance' }">
      <span class="nav-icon">🔧</span>
      <span>保養</span>
    </RouterLink>
    <RouterLink to="/vehicles" class="nav-item" :class="{ active: route.path === '/vehicles' }">
      <span class="nav-icon">🚗</span>
      <span>車輛</span>
    </RouterLink>
    <RouterLink to="/settings" class="nav-item" :class="{ active: route.path === '/settings' }">
      <span class="nav-icon">⚙️</span>
      <span>設定</span>
    </RouterLink>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
</script>
