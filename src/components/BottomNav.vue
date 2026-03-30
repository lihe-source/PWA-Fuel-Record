<template>
  <nav class="bottom-nav">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="nav-item"
      :class="{ active: activeTab === tab.id }"
      @click="$emit('change', tab.id)"
    >
      <span class="nav-icon" v-html="tab.icon"></span>
      <span class="nav-label">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<script setup>
defineProps({ activeTab: String })
defineEmits(['change'])

const tabs = [
  { id: 'dashboard', label: '儀表板', icon: '📊' },
  { id: 'fuel', label: '油耗記錄', icon: '⛽' },
  { id: 'maintenance', label: '保養記錄', icon: '🔧' },
  { id: 'vehicles', label: '車輛管理', icon: '🚗' },
  { id: 'settings', label: '設定', icon: '⚙️' },
]
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  display: flex;
  background-color: var(--nav-bg);
  border-top: 1px solid var(--nav-border);
  z-index: 100;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.08);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.25rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color 0.15s;
  gap: 0.125rem;
}

.nav-item.active {
  color: #3b82f6;
}

.nav-icon {
  font-size: 1.35rem;
  line-height: 1;
}

.nav-label {
  font-size: 0.65rem;
  white-space: nowrap;
}
</style>
