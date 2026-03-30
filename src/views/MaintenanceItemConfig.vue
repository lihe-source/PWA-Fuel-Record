<template>
  <div class="page-container" style="padding-top: 4rem;">
    <h1 class="page-title">保養項目設定</h1>

    <!-- Type tabs -->
    <div class="type-tabs mb-4">
      <button :class="['tab-btn', activeType === 'car' ? 'active' : '']" @click="activeType = 'car'">🚗 汽車</button>
      <button :class="['tab-btn', activeType === 'motorcycle' ? 'active' : '']" @click="activeType = 'motorcycle'">🏍️ 機車</button>
    </div>

    <div v-if="filteredItems.length === 0" class="empty-state">
      <div class="empty-icon">🔧</div>
      <p>尚無保養項目</p>
      <p class="empty-sub">點擊下方 + 按鈕新增保養項目規則</p>
    </div>

    <div v-for="item in filteredItems" :key="item.id" class="item-card">
      <div class="item-info">
        <div class="item-name">{{ item.itemName }}</div>
        <div class="item-interval">每 {{ item.intervalKm.toLocaleString() }} 公里更換</div>
        <div v-if="item.notes" class="item-notes">{{ item.notes }}</div>
      </div>
      <div class="item-actions">
        <button class="action-btn" @click="editItem(item)">✏️</button>
        <button class="action-btn" @click="confirmDelete(item)">🗑️</button>
      </div>
    </div>

    <!-- Add Button FAB -->
    <AddButton @click="openAddModal" />

    <!-- Add/Edit Modal -->
    <Modal v-model="showModal" :title="editingItem ? '編輯保養項目' : '新增保養項目'">
      <form @submit.prevent="saveItem" class="modal-form">
        <div class="form-group">
          <label class="form-label">適用車種 *</label>
          <div class="type-select">
            <button
              type="button"
              :class="['type-btn', form.vehicleType === 'car' ? 'active' : '']"
              @click="form.vehicleType = 'car'"
            >🚗 汽車</button>
            <button
              type="button"
              :class="['type-btn', form.vehicleType === 'motorcycle' ? 'active' : '']"
              @click="form.vehicleType = 'motorcycle'"
            >🏍️ 機車</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">保養項目名稱 *</label>
          <input v-model="form.itemName" type="text" class="form-input" placeholder="例如：機油、空氣濾清器" required />
        </div>
        <div class="form-group">
          <label class="form-label">更換間隔里程 (公里) *</label>
          <input v-model.number="form.intervalKm" type="number" class="form-input" min="1" required />
        </div>
        <div class="form-group">
          <label class="form-label">備註</label>
          <textarea v-model="form.notes" class="form-input" rows="2" placeholder="選填"></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="showModal = false">取消</button>
          <button type="submit" class="btn-primary">{{ editingItem ? '儲存' : '新增' }}</button>
        </div>
      </form>
    </Modal>

    <!-- Delete confirm modal -->
    <Modal v-model="showDeleteModal" title="確認刪除">
      <p style="color: var(--text-primary)">確定要刪除「{{ deletingItem?.itemName }}」保養項目嗎？</p>
      <template #footer>
        <button class="btn-secondary" @click="showDeleteModal = false">取消</button>
        <button class="btn-danger" @click="doDelete">刪除</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMaintenanceStore } from '../stores/maintenance'
import AddButton from '../components/AddButton.vue'
import Modal from '../components/Modal.vue'

const maintenanceStore = useMaintenanceStore()
const activeType = ref('car')
const showModal = ref(false)
const showDeleteModal = ref(false)
const editingItem = ref(null)
const deletingItem = ref(null)

const defaultForm = () => ({
  vehicleType: activeType.value,
  itemName: '',
  intervalKm: 5000,
  notes: '',
})
const form = ref(defaultForm())

const filteredItems = computed(() =>
  maintenanceStore.items.filter((i) => i.vehicleType === activeType.value)
)

function openAddModal() {
  editingItem.value = null
  form.value = defaultForm()
  showModal.value = true
}

function editItem(item) {
  editingItem.value = item
  form.value = {
    vehicleType: item.vehicleType,
    itemName: item.itemName,
    intervalKm: item.intervalKm,
    notes: item.notes || '',
  }
  showModal.value = true
}

async function saveItem() {
  if (editingItem.value) {
    await maintenanceStore.updateItem(editingItem.value.id, form.value)
  } else {
    await maintenanceStore.addItem(form.value)
  }
  showModal.value = false
}

function confirmDelete(item) {
  deletingItem.value = item
  showDeleteModal.value = true
}

async function doDelete() {
  await maintenanceStore.deleteItem(deletingItem.value.id)
  showDeleteModal.value = false
}

onMounted(() => maintenanceStore.fetchItems())
</script>

<style scoped>
.type-tabs {
  display: flex;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  padding: 0.25rem;
  gap: 0.25rem;
}

.tab-btn {
  flex: 1;
  padding: 0.5rem;
  border: none;
  background: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.tab-btn.active {
  background: var(--bg-card);
  color: #3b82f6;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.item-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 1rem;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  box-shadow: var(--shadow);
}

.item-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.item-interval {
  font-size: 0.875rem;
  color: #3b82f6;
}

.item-notes {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.item-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.375rem;
  border-radius: 0.5rem;
  transition: background-color 0.15s;
}

.action-btn:hover {
  background-color: var(--bg-secondary);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.type-select {
  display: flex;
  gap: 0.75rem;
}

.type-btn {
  flex: 1;
  padding: 0.625rem;
  border: 2px solid var(--border-color);
  border-radius: 0.5rem;
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 500;
  transition: all 0.15s;
}

.type-btn.active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #3b82f6;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 0.75rem;
}

.empty-sub {
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.mb-4 {
  margin-bottom: 1rem;
}
</style>
