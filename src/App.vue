<template>
  <div id="app-wrapper">
    <!-- Loading screen -->
    <div v-if="authStore.loading" class="loading-screen">
      <div class="loading-icon">⛽</div>
      <div class="loading-text">載入中...</div>
    </div>

    <!-- Login page -->
    <LoginView v-else-if="!authStore.user" />

    <!-- Main app -->
    <template v-else>
      <!-- Pages -->
      <DashboardView v-if="activeTab === 'dashboard'" />
      <FuelRecordsView v-else-if="activeTab === 'fuel'" />
      <MaintenanceRecordsView v-else-if="activeTab === 'maintenance'" />
      <VehicleManagementView v-else-if="activeTab === 'vehicles'" />
      <SettingsView
        v-else-if="activeTab === 'settings'"
        @navigate="handleNavigate"
      />
      <MaintenanceItemConfigView
        v-else-if="activeTab === 'maintenanceConfig'"
      />

      <!-- Bottom navigation (hide on maintenanceConfig) -->
      <BottomNav
        v-if="activeTab !== 'maintenanceConfig'"
        :activeTab="activeTab"
        @change="activeTab = $event"
      />

      <!-- Back button for sub-pages -->
      <button
        v-if="activeTab === 'maintenanceConfig'"
        class="back-btn"
        @click="activeTab = 'settings'"
      >
        ← 返回設定
      </button>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { useSettingsStore } from './stores/settings'
import BottomNav from './components/BottomNav.vue'
import LoginView from './views/Login.vue'
import DashboardView from './views/Dashboard.vue'
import FuelRecordsView from './views/FuelRecords.vue'
import MaintenanceRecordsView from './views/MaintenanceRecords.vue'
import VehicleManagementView from './views/VehicleManagement.vue'
import SettingsView from './views/Settings.vue'
import MaintenanceItemConfigView from './views/MaintenanceItemConfig.vue'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const activeTab = ref('dashboard')

function handleNavigate(page) {
  activeTab.value = page
}

onMounted(async () => {
  settingsStore.initTheme()
  await authStore.init()
})
</script>

<style>
#app-wrapper {
  min-height: 100vh;
  background-color: var(--bg-primary);
}

.loading-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.loading-icon {
  font-size: 3.5rem;
  animation: pulse 1.5s ease-in-out infinite;
}

.loading-text {
  color: white;
  font-size: 1.125rem;
  font-weight: 500;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.back-btn {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  background: var(--nav-bg);
  border: none;
  border-bottom: 1px solid var(--nav-border);
  padding: 0.875rem 1rem;
  text-align: left;
  font-size: 0.9375rem;
  color: #3b82f6;
  cursor: pointer;
  font-weight: 500;
  z-index: 100;
}
</style>
