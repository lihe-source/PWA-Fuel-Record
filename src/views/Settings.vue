<template>
  <div id="app">
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">設定</h1>
      </div>

      <!-- User Info -->
      <div class="user-card" v-if="currentUser">
        <div class="user-avatar">
          <img v-if="currentUser.photoURL" :src="currentUser.photoURL" alt="avatar" />
          <span v-else>{{ userInitial }}</span>
        </div>
        <div>
          <div class="user-name">{{ currentUser.displayName || '使用者' }}</div>
          <div class="user-email">{{ currentUser.email }}</div>
        </div>
      </div>

      <!-- Theme -->
      <div class="settings-section">
        <div class="settings-section-title">外觀</div>
        <div class="card" style="padding:14px">
          <div class="form-label" style="margin-bottom:8px">主題</div>
          <div class="toggle-group">
            <button class="toggle-btn" :class="{ active: settingsStore.theme === 'light' }" @click="settingsStore.setTheme('light')">☀️ 淺色</button>
            <button class="toggle-btn" :class="{ active: settingsStore.theme === 'dark' }" @click="settingsStore.setTheme('dark')">🌙 深色</button>
            <button class="toggle-btn" :class="{ active: settingsStore.theme === 'system' }" @click="settingsStore.setTheme('system')">🔄 跟隨系統</button>
          </div>
        </div>
      </div>

      <!-- Maintenance Config -->
      <div class="settings-section">
        <div class="settings-section-title">保養設定</div>
        <div class="settings-item" @click="router.push('/maintenance-config')">
          <div class="settings-item-left">
            <span class="settings-item-icon">🔧</span>
            <span class="settings-item-label">保養項目設定</span>
          </div>
          <span class="settings-item-arrow">›</span>
        </div>
      </div>

      <!-- Backup -->
      <div class="settings-section">
        <div class="settings-section-title">備份與還原</div>
        <div class="settings-item" @click="exportBackup">
          <div class="settings-item-left">
            <span class="settings-item-icon">📤</span>
            <span class="settings-item-label">匯出備份</span>
          </div>
          <span class="settings-item-arrow">›</span>
        </div>
        <div class="settings-item" @click="showBackupList = true">
          <div class="settings-item-left">
            <span class="settings-item-icon">📋</span>
            <span class="settings-item-label">近期備份</span>
          </div>
          <span class="settings-item-arrow">›</span>
        </div>
        <label class="settings-item" style="cursor:pointer">
          <div class="settings-item-left">
            <span class="settings-item-icon">📥</span>
            <span class="settings-item-label">匯入備份</span>
          </div>
          <input type="file" accept=".json" style="display:none" @change="importBackup" />
          <span class="settings-item-arrow">›</span>
        </label>
      </div>

      <!-- Data Management -->
      <div class="settings-section">
        <div class="settings-section-title">資料管理</div>
        <div class="settings-item" style="border-color:var(--danger)" @click="showClearConfirm = true">
          <div class="settings-item-left">
            <span class="settings-item-icon">🗑️</span>
            <span class="settings-item-label" style="color:var(--danger)">清除所有資料</span>
          </div>
          <span class="settings-item-arrow" style="color:var(--danger)">›</span>
        </div>
      </div>

      <!-- Logout -->
      <div class="settings-section">
        <button class="btn btn-secondary" style="width:100%" @click="handleLogout">登出</button>
      </div>

      <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>
    </div>

    <BottomNav />

    <!-- Backup List Modal -->
    <Modal v-if="showBackupList" title="近期備份" @close="showBackupList = false">
      <div v-if="backups.length === 0" class="empty-state" style="padding:20px">
        <p>尚無備份記錄</p>
      </div>
      <div v-else>
        <div v-for="b in backups" :key="b.id" class="record-item">
          <div class="record-main">
            <div class="record-title">備份 #{{ b.id }}</div>
            <div class="record-sub">{{ formatDateTime(b.createdAt) }}</div>
          </div>
          <button class="btn btn-primary btn-sm" @click="restoreBackup(b)">還原</button>
        </div>
      </div>
    </Modal>

    <!-- Clear Data Confirm -->
    <Modal v-if="showClearConfirm" title="確認清除" @close="showClearConfirm = false">
      <p style="color:var(--text-secondary);margin-bottom:20px">此操作將清除所有車輛、油耗、保養記錄與備份資料，且無法復原。是否繼續？</p>
      <div class="form-actions">
        <button class="btn btn-secondary" @click="showClearConfirm = false">取消</button>
        <button class="btn btn-danger" @click="clearAllData">確認清除</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BottomNav from '../components/BottomNav.vue'
import Modal from '../components/Modal.vue'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { db } from '../db'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const currentUser = computed(() => authStore.currentUser)
const userInitial = computed(() => {
  const name = currentUser.value?.displayName || currentUser.value?.email || '?'
  return name[0].toUpperCase()
})

const showBackupList = ref(false)
const showClearConfirm = ref(false)
const backups = ref([])
const successMsg = ref('')

onMounted(async () => {
  await loadBackups()
})

async function loadBackups() {
  const userId = authStore.currentUser?.uid || 'local'
  backups.value = await db.backups.where('userId').equals(userId).reverse().limit(10).toArray()
}

async function exportBackup() {
  const userId = authStore.currentUser?.uid || 'local'
  const [vehicles, fuelRecords, maintenanceRecords, maintenanceItems] = await Promise.all([
    db.vehicles.where('userId').equals(userId).toArray(),
    db.fuelRecords.where('userId').equals(userId).toArray(),
    db.maintenanceRecords.where('userId').equals(userId).toArray(),
    db.maintenanceItems.where('userId').equals(userId).toArray()
  ])
  const data = JSON.stringify({ vehicles, fuelRecords, maintenanceRecords, maintenanceItems, exportedAt: new Date() })
  await db.backups.add({ userId, createdAt: new Date(), data })
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fuel-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  await loadBackups()
  showSuccess('備份已匯出')
}

async function importBackup(e) {
  const file = e.target.files[0]
  if (!file) return
  const text = await file.text()
  try {
    const parsed = JSON.parse(text)
    await restoreFromData(parsed)
    showSuccess('備份已還原')
  } catch {
    alert('備份檔案格式錯誤')
  }
}

async function restoreBackup(b) {
  try {
    const parsed = JSON.parse(b.data)
    await restoreFromData(parsed)
    showBackupList.value = false
    showSuccess('備份已還原')
  } catch {
    alert('還原失敗')
  }
}

async function restoreFromData(parsed) {
  const userId = authStore.currentUser?.uid || 'local'
  if (parsed.vehicles) {
    for (const v of parsed.vehicles) {
      const { id, ...rest } = v
      await db.vehicles.put({ ...rest, userId })
    }
  }
  if (parsed.fuelRecords) {
    for (const r of parsed.fuelRecords) {
      const { id, ...rest } = r
      await db.fuelRecords.put({ ...rest, userId })
    }
  }
  if (parsed.maintenanceRecords) {
    for (const r of parsed.maintenanceRecords) {
      const { id, ...rest } = r
      await db.maintenanceRecords.put({ ...rest, userId })
    }
  }
  if (parsed.maintenanceItems) {
    for (const i of parsed.maintenanceItems) {
      const { id, ...rest } = i
      await db.maintenanceItems.put({ ...rest, userId })
    }
  }
}

async function clearAllData() {
  const userId = authStore.currentUser?.uid || 'local'
  await db.vehicles.where('userId').equals(userId).delete()
  await db.fuelRecords.where('userId').equals(userId).delete()
  await db.maintenanceRecords.where('userId').equals(userId).delete()
  await db.maintenanceItems.where('userId').equals(userId).delete()
  await db.backups.where('userId').equals(userId).delete()
  showClearConfirm.value = false
  showSuccess('所有資料已清除')
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

function showSuccess(msg) {
  successMsg.value = msg
  setTimeout(() => { successMsg.value = '' }, 3000)
}

function formatDateTime(d) {
  if (!d) return ''
  const date = new Date(d)
  return `${date.getFullYear()}/${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
}
</script>
