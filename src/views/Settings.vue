<template>
  <div class="min-h-screen pb-20" style="background: var(--bg-secondary)">
    <div class="p-4 max-w-lg mx-auto">
      <h1 class="text-xl font-bold mb-4 pt-2" style="color: var(--text-primary)">設定</h1>

      <!-- User Info -->
      <div class="rounded-xl p-4 mb-4 flex items-center gap-3" style="background: var(--bg-primary); border: var(--card-border)">
        <div v-if="authStore.user?.photoURL" class="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
          <img :src="authStore.user.photoURL" alt="avatar" class="w-full h-full object-cover" />
        </div>
        <div v-else class="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white text-lg font-bold" style="background: var(--accent)">
          {{ userInitials }}
        </div>
        <div>
          <p class="font-semibold" style="color: var(--text-primary)">{{ authStore.user?.displayName || '使用者' }}</p>
          <p class="text-sm" style="color: var(--text-secondary)">{{ authStore.user?.email }}</p>
        </div>
      </div>

      <!-- Theme -->
      <div class="rounded-xl p-4 mb-4" style="background: var(--bg-primary); border: var(--card-border)">
        <h2 class="font-semibold mb-3" style="color: var(--text-primary)">外觀主題</h2>
        <div class="flex gap-2">
          <button
            v-for="opt in themeOptions"
            :key="opt.value"
            @click="settingsStore.setTheme(opt.value)"
            class="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
            :style="settingsStore.theme === opt.value
              ? 'background: var(--accent); color: #fff; border-color: var(--accent)'
              : 'background: var(--bg-secondary); color: var(--text-secondary); border-color: var(--border-color)'"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="rounded-xl overflow-hidden mb-4" style="background: var(--bg-primary); border: var(--card-border)">
        <button @click="$router.push('/settings/maintenance-items')" class="w-full flex items-center justify-between px-4 py-3.5 border-b text-sm" style="border-color: var(--border-color); color: var(--text-primary)">
          <span>🔧 保養項目設定</span>
          <span style="color: var(--text-secondary)">›</span>
        </button>
        <button @click="showBackupsModal = true" class="w-full flex items-center justify-between px-4 py-3.5 border-b text-sm" style="border-color: var(--border-color); color: var(--text-primary)">
          <span>💾 近期備份</span>
          <span style="color: var(--text-secondary)">›</span>
        </button>
        <button @click="showClearModal = true" class="w-full flex items-center justify-between px-4 py-3.5 text-sm text-red-500">
          <span>🗑️ 清除資料</span>
          <span>›</span>
        </button>
      </div>

      <!-- Toast -->
      <div v-if="toast" class="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm text-white shadow-lg" style="background: #22c55e">
        {{ toast }}
      </div>

      <!-- Logout -->
      <button @click="handleLogout" class="w-full py-3 rounded-xl text-sm font-medium text-red-500 border border-red-200 dark:border-red-800 mt-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
        登出
      </button>
    </div>

    <!-- Backups Modal -->
    <Modal v-model="showBackupsModal" title="近期備份">
      <div v-if="backups.length === 0" class="text-center py-6" style="color: var(--text-secondary)">尚無備份紀錄</div>
      <div v-for="backup in backups" :key="backup.id" class="flex items-center justify-between py-2 border-b last:border-0" style="border-color: var(--border-color)">
        <span class="text-sm" style="color: var(--text-primary)">{{ formatDate(backup.createdAt) }}</span>
        <span class="text-xs" style="color: var(--text-secondary)">備份 #{{ backup.id }}</span>
      </div>
    </Modal>

    <!-- Clear Data Modal -->
    <Modal v-model="showClearModal" title="確認清除資料">
      <p class="mb-4 text-sm" style="color: var(--text-primary)">確定要清除所有資料？此操作無法復原。</p>
      <p class="text-xs mb-4" style="color: var(--text-secondary)">將刪除所有車輛、油耗紀錄、保養紀錄、保養項目及備份資料。設定不受影響。</p>
      <div class="flex gap-2">
        <button @click="showClearModal = false" class="flex-1 py-2.5 rounded-lg border text-sm" style="border-color: var(--border-color); color: var(--text-secondary)">取消</button>
        <button @click="clearAllData" class="flex-1 py-2.5 rounded-lg text-sm text-white bg-red-500">確認清除</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Modal from '../components/Modal.vue'
import { useAuthStore } from '../stores/auth.js'
import { useSettingsStore } from '../stores/settings.js'
import { db } from '../db.js'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const showBackupsModal = ref(false)
const showClearModal = ref(false)
const backups = ref([])
const toast = ref('')

const themeOptions = [
  { value: 'light', label: '淺色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟隨系統' }
]

const userInitials = computed(() => {
  const name = authStore.user?.displayName || authStore.user?.email || ''
  return name.charAt(0).toUpperCase()
})

function formatDate(iso) {
  return new Date(iso).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function showToast(msg) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 3000)
}

async function clearAllData() {
  try {
    await db.vehicles.clear()
    await db.fuelRecords.clear()
    await db.maintenanceRecords.clear()
    await db.maintenanceItems.clear()
    await db.backups.clear()
    showClearModal.value = false
    showToast('資料已清除')
  } catch (e) {
    showToast('清除失敗：' + e.message)
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

onMounted(async () => {
  if (authStore.user) {
    backups.value = await db.backups.where('userId').equals(authStore.user.uid).reverse().sortBy('createdAt')
  }
})

// Watch backups modal open
import { watch } from 'vue'
watch(showBackupsModal, async (v) => {
  if (v && authStore.user) {
    backups.value = await db.backups.where('userId').equals(authStore.user.uid).reverse().sortBy('createdAt')
  }
})
</script>
