<template>
  <div class="page-container">
    <h1 class="page-title">設定</h1>

    <!-- User Account Info -->
    <div class="user-card mb-4" v-if="authStore.user">
      <div class="user-avatar">
        <img v-if="authStore.user.photoURL" :src="authStore.user.photoURL" alt="avatar" class="avatar-img" />
        <div v-else class="avatar-placeholder">{{ userInitial }}</div>
      </div>
      <div class="user-info">
        <div class="user-name">{{ authStore.user.displayName || '使用者' }}</div>
        <div class="user-email">{{ authStore.user.email }}</div>
      </div>
    </div>

    <!-- Theme settings -->
    <div class="card mb-4">
      <div class="section-title">🎨 佈景主題</div>
      <div class="theme-options">
        <button
          v-for="opt in themeOptions"
          :key="opt.value"
          :class="['theme-btn', settingsStore.theme === opt.value ? 'active' : '']"
          @click="settingsStore.setTheme(opt.value)"
        >
          {{ opt.icon }} {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Backup & Restore -->
    <div class="card mb-4">
      <div class="section-title">💾 備份與還原</div>
      <div class="btn-group">
        <button class="btn-primary w-full mb-2" @click="doBackup">匯出備份</button>
        <button class="btn-secondary w-full mb-2" @click="showBackupModal = true">近期備份</button>
        <label class="btn-secondary w-full text-center cursor-pointer">
          匯入備份
          <input type="file" accept=".json" class="hidden" @change="handleImport" />
        </label>
      </div>
    </div>

    <!-- Maintenance Item Config -->
    <div class="card mb-4">
      <div class="section-title">🔧 保養管理</div>
      <button class="btn-secondary w-full" @click="$emit('navigate', 'maintenanceConfig')">
        保養項目設定 →
      </button>
    </div>

    <!-- Danger zone -->
    <div class="card mb-4 danger-card">
      <div class="section-title danger-title">⚠️ 危險操作</div>
      <button class="btn-danger w-full" @click="showClearConfirm = true">清除所有資料</button>
    </div>

    <!-- Logout -->
    <div class="card">
      <button class="btn-secondary w-full" @click="handleLogout">登出帳號</button>
    </div>

    <!-- Recent Backups Modal -->
    <Modal v-model="showBackupModal" title="近期備份">
      <div v-if="backups.length === 0" class="empty-state">
        <p>尚無備份記錄</p>
      </div>
      <div v-for="backup in backups" :key="backup.id" class="backup-item">
        <div class="backup-info">
          <div class="backup-date">{{ formatDate(backup.createdAt) }}</div>
          <div class="backup-desc">備份資料</div>
        </div>
        <button class="btn-primary btn-sm" @click="restoreBackup(backup)">還原</button>
      </div>
    </Modal>

    <!-- Clear confirm modal -->
    <Modal v-model="showClearConfirm" title="確認清除資料">
      <p style="color: var(--text-primary); margin-bottom: 0.5rem">確定要清除所有記錄嗎？</p>
      <p style="color: #b91c1c; font-size: 0.875rem">此操作將刪除所有油耗記錄、保養記錄、車輛資料及備份，但不會影響設定頁面的設置。此操作無法復原！</p>
      <template #footer>
        <button class="btn-secondary" @click="showClearConfirm = false">取消</button>
        <button class="btn-danger" @click="doClearData">確認清除</button>
      </template>
    </Modal>

    <!-- Success toast -->
    <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { db } from '../db'
import Modal from '../components/Modal.vue'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()

defineEmits(['navigate'])

const showBackupModal = ref(false)
const showClearConfirm = ref(false)
const backups = ref([])
const toastMessage = ref('')

const themeOptions = [
  { value: 'light', label: '淺色', icon: '☀️' },
  { value: 'dark', label: '深色', icon: '🌙' },
  { value: 'system', label: '系統', icon: '💻' },
]

const userInitial = computed(() => {
  if (!authStore.user) return '?'
  const name = authStore.user.displayName || authStore.user.email || '?'
  return name.charAt(0).toUpperCase()
})

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

async function loadBackups() {
  if (!authStore.user) return
  const all = await db.backups.where('userId').equals(authStore.user.uid).toArray()
  backups.value = all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10)
}

async function doBackup() {
  if (!authStore.user) return
  const [vehicles, fuelRecords, maintenanceRecords, maintenanceItems] = await Promise.all([
    db.vehicles.where('userId').equals(authStore.user.uid).toArray(),
    db.fuelRecords.where('userId').equals(authStore.user.uid).toArray(),
    db.maintenanceRecords.where('userId').equals(authStore.user.uid).toArray(),
    db.maintenanceItems.where('userId').equals(authStore.user.uid).toArray(),
  ])
  const backupData = JSON.stringify({ vehicles, fuelRecords, maintenanceRecords, maintenanceItems })
  await db.backups.add({
    userId: authStore.user.uid,
    createdAt: new Date(),
    data: backupData,
  })
  // Also trigger download
  const blob = new Blob([backupData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fuel-record-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  await loadBackups()
  showToast('備份成功！')
}

async function restoreBackup(backup) {
  try {
    const data = JSON.parse(backup.data)
    if (!authStore.user) return
    const uid = authStore.user.uid
    // Clear existing data
    await Promise.all([
      db.vehicles.where('userId').equals(uid).delete(),
      db.fuelRecords.where('userId').equals(uid).delete(),
      db.maintenanceRecords.where('userId').equals(uid).delete(),
      db.maintenanceItems.where('userId').equals(uid).delete(),
    ])
    // Restore
    const addItems = async (table, items) => {
      for (const item of items) {
        const { id, ...rest } = item
        await db[table].add({ ...rest, userId: uid })
      }
    }
    await addItems('vehicles', data.vehicles || [])
    await addItems('fuelRecords', data.fuelRecords || [])
    await addItems('maintenanceRecords', data.maintenanceRecords || [])
    await addItems('maintenanceItems', data.maintenanceItems || [])
    showBackupModal.value = false
    showToast('還原成功！')
  } catch (e) {
    showToast('還原失敗：' + e.message)
  }
}

async function handleImport(event) {
  const file = event.target.files[0]
  if (!file) return
  const text = await file.text()
  try {
    const data = JSON.parse(text)
    if (!authStore.user) return
    const uid = authStore.user.uid
    await db.backups.add({
      userId: uid,
      createdAt: new Date(),
      data: text,
    })
    await restoreBackup({ data: text })
  } catch (e) {
    showToast('匯入失敗：' + e.message)
  }
}

async function doClearData() {
  if (!authStore.user) return
  const uid = authStore.user.uid
  await Promise.all([
    db.vehicles.where('userId').equals(uid).delete(),
    db.fuelRecords.where('userId').equals(uid).delete(),
    db.maintenanceRecords.where('userId').equals(uid).delete(),
    db.maintenanceItems.where('userId').equals(uid).delete(),
    db.backups.where('userId').equals(uid).delete(),
  ])
  showClearConfirm.value = false
  showToast('所有資料已清除！')
}

async function handleLogout() {
  await authStore.logout()
}

function showToast(msg) {
  toastMessage.value = msg
  setTimeout(() => { toastMessage.value = '' }, 3000)
}

onMounted(loadBackups)
</script>

<style scoped>
.user-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: var(--shadow);
}

.user-avatar {
  flex-shrink: 0;
}

.avatar-img {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: #3b82f6;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
}

.user-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-primary);
}

.user-email {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.125rem;
}

.section-title {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.theme-options {
  display: flex;
  gap: 0.5rem;
}

.theme-btn {
  flex: 1;
  padding: 0.5rem 0.25rem;
  border: 2px solid var(--border-color);
  border-radius: 0.5rem;
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.15s;
  text-align: center;
}

.theme-btn.active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #3b82f6;
}

.btn-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.danger-card {
  border-color: #fca5a5;
}

.danger-title {
  color: #b91c1c;
}

.w-full {
  width: 100%;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.text-center {
  text-align: center;
}

.cursor-pointer {
  cursor: pointer;
}

.hidden {
  display: none;
}

.backup-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.backup-item:last-child {
  border-bottom: none;
}

.backup-date {
  font-size: 0.875rem;
  color: var(--text-primary);
  font-weight: 500;
}

.backup-desc {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-secondary);
}

.toast {
  position: fixed;
  bottom: 6rem;
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: 2rem;
  font-size: 0.9375rem;
  z-index: 300;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
