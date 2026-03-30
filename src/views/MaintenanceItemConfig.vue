<template>
  <div class="min-h-screen pb-20" style="background: var(--bg-secondary)">
    <div class="p-4 max-w-lg mx-auto">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-4 pt-2">
        <button @click="$router.push('/settings')" class="p-2 rounded-lg" style="color: var(--text-primary)">← 返回</button>
        <h1 class="text-xl font-bold" style="color: var(--text-primary)">保養項目設定</h1>
      </div>

      <!-- Tabs -->
      <div class="flex mb-4 rounded-lg overflow-hidden border" style="border-color: var(--border-color)">
        <button
          v-for="tab in ['汽車', '機車']"
          :key="tab"
          @click="activeTab = tab; loadItems()"
          class="flex-1 py-2.5 text-sm font-medium transition-colors"
          :style="activeTab === tab
            ? 'background: var(--accent); color: #fff'
            : 'background: var(--bg-primary); color: var(--text-secondary)'"
        >
          {{ tab === '汽車' ? '🚗 汽車' : '🏍️ 機車' }}
        </button>
      </div>

      <!-- Add Button -->
      <button @click="openAddModal" class="w-full py-2.5 rounded-xl text-sm font-medium text-white mb-4" style="background: var(--accent)">
        + 新增保養項目
      </button>

      <!-- Items List -->
      <div v-if="filteredItems.length === 0" class="text-center py-8" style="color: var(--text-secondary)">
        尚無{{ activeTab }}保養項目
      </div>

      <div v-for="item in filteredItems" :key="item.id" class="rounded-xl p-4 mb-3" style="background: var(--bg-primary); border: var(--card-border)">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-semibold" style="color: var(--text-primary)">{{ item.itemName }}</p>
            <p class="text-sm mt-1" style="color: var(--text-secondary)">每 {{ item.intervalKm?.toLocaleString() }} km 更換</p>
            <p v-if="item.notes" class="text-xs mt-1" style="color: var(--text-secondary)">{{ item.notes }}</p>
          </div>
          <div class="flex gap-2">
            <button @click="editItem(item)" class="p-1 text-sm" style="color: var(--accent)">✏️</button>
            <button @click="confirmDelete(item)" class="p-1 text-sm text-red-500">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Modal v-model="showModal" :title="editingItem ? '編輯保養項目' : '新增保養項目'">
      <form @submit.prevent="saveItem" class="space-y-3">
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">項目名稱</label>
          <input v-model="form.itemName" type="text" required class="w-full px-3 py-2 rounded-lg border text-sm outline-none" style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)" placeholder="例：機油更換" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">更換間隔 (km)</label>
          <input v-model.number="form.intervalKm" type="number" min="1" required class="w-full px-3 py-2 rounded-lg border text-sm outline-none" style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)" placeholder="5000" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">備註</label>
          <input v-model="form.notes" type="text" class="w-full px-3 py-2 rounded-lg border text-sm outline-none" style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)" placeholder="選填" />
        </div>
        <div class="flex gap-2 pt-2">
          <button type="button" @click="showModal = false" class="flex-1 py-2.5 rounded-lg border text-sm" style="border-color: var(--border-color); color: var(--text-secondary)">取消</button>
          <button type="submit" :disabled="saving" class="flex-1 py-2.5 rounded-lg text-sm text-white font-medium" style="background: var(--accent)">{{ saving ? '儲存中...' : '儲存' }}</button>
        </div>
      </form>
    </Modal>

    <!-- Delete Confirm Modal -->
    <Modal v-model="showDeleteModal" title="確認刪除">
      <p class="mb-4" style="color: var(--text-primary)">確定要刪除此保養項目嗎？</p>
      <div class="flex gap-2">
        <button @click="showDeleteModal = false" class="flex-1 py-2.5 rounded-lg border text-sm" style="border-color: var(--border-color); color: var(--text-secondary)">取消</button>
        <button @click="deleteItem" class="flex-1 py-2.5 rounded-lg text-sm text-white bg-red-500">刪除</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Modal from '../components/Modal.vue'
import { useMaintenanceStore } from '../stores/maintenance.js'
import { useAuthStore } from '../stores/auth.js'

const maintenanceStore = useMaintenanceStore()
const authStore = useAuthStore()

const activeTab = ref('汽車')
const showModal = ref(false)
const showDeleteModal = ref(false)
const editingItem = ref(null)
const deletingItem = ref(null)
const saving = ref(false)

const defaultForm = () => ({ itemName: '', intervalKm: '', notes: '' })
const form = ref(defaultForm())

const filteredItems = computed(() =>
  maintenanceStore.items.filter(i => i.vehicleType === activeTab.value)
)

async function loadItems() {
  await maintenanceStore.fetchItems()
}

function openAddModal() {
  editingItem.value = null
  form.value = defaultForm()
  showModal.value = true
}

function editItem(item) {
  editingItem.value = item
  form.value = { itemName: item.itemName, intervalKm: item.intervalKm, notes: item.notes || '' }
  showModal.value = true
}

function confirmDelete(item) {
  deletingItem.value = item
  showDeleteModal.value = true
}

async function deleteItem() {
  if (!deletingItem.value) return
  await maintenanceStore.deleteItem(deletingItem.value.id)
  showDeleteModal.value = false
  deletingItem.value = null
}

async function saveItem() {
  saving.value = true
  try {
    const data = { ...form.value, vehicleType: activeTab.value }
    if (editingItem.value) {
      await maintenanceStore.updateItem(editingItem.value.id, data)
    } else {
      await maintenanceStore.addItem(data)
    }
    showModal.value = false
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (authStore.user) {
    await maintenanceStore.ensureDefaultItems(authStore.user.uid)
  }
  await maintenanceStore.fetchItems()
})
</script>
