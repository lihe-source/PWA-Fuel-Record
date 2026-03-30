<template>
  <div id="app">
    <div class="page">
      <div class="page-header">
        <button class="back-btn" @click="router.back()">← 返回</button>
        <h1 class="page-title">保養項目設定</h1>
        <button class="btn btn-primary btn-sm" @click="openAdd">＋ 新增</button>
      </div>

      <div class="chip-filter">
        <button class="chip" :class="{ active: activeType === 'car' }" @click="activeType = 'car'">🚗 汽車</button>
        <button class="chip" :class="{ active: activeType === 'motorcycle' }" @click="activeType = 'motorcycle'">🏍️ 機車</button>
      </div>

      <div v-if="filteredItems.length === 0" class="empty-state">
        <div class="emoji">🔧</div>
        <p>尚未設定保養項目</p>
      </div>

      <div v-else class="card">
        <div class="maint-item-row" v-for="item in filteredItems" :key="item.id">
          <div class="maint-item-info">
            <div class="maint-item-name">{{ item.itemName }}</div>
            <div class="maint-item-interval">每 {{ item.intervalKm?.toLocaleString() }} km 更換</div>
            <div v-if="item.notes" class="record-sub" style="font-style:italic">{{ item.notes }}</div>
          </div>
          <div class="maint-item-actions">
            <button class="btn-icon" @click="editItem(item)">✏️</button>
            <button class="btn-icon" @click="confirmDelete(item)">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <Modal v-if="showModal" :title="editingId ? '編輯保養項目' : '新增保養項目'" @close="closeModal">
      <div class="form-group">
        <label class="form-label">適用車型</label>
        <div class="toggle-group">
          <button class="toggle-btn" :class="{ active: form.vehicleType === 'car' }" @click="form.vehicleType = 'car'">🚗 汽車</button>
          <button class="toggle-btn" :class="{ active: form.vehicleType === 'motorcycle' }" @click="form.vehicleType = 'motorcycle'">🏍️ 機車</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">項目名稱</label>
        <input type="text" v-model="form.itemName" class="form-input" placeholder="例如：機油更換" />
      </div>
      <div class="form-group">
        <label class="form-label">更換間隔 (km)</label>
        <input type="number" v-model.number="form.intervalKm" class="form-input" placeholder="例如：5000" />
      </div>
      <div class="form-group">
        <label class="form-label">備註</label>
        <textarea v-model="form.notes" class="form-textarea" placeholder="選填"></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" @click="closeModal">取消</button>
        <button class="btn btn-primary" @click="saveItem">{{ editingId ? '更新' : '儲存' }}</button>
      </div>
    </Modal>

    <Modal v-if="showDeleteConfirm" title="確認刪除" @close="showDeleteConfirm = false">
      <p style="color:var(--text-secondary);margin-bottom:20px">確定要刪除「{{ deletingItem?.itemName }}」嗎？</p>
      <div class="form-actions">
        <button class="btn btn-secondary" @click="showDeleteConfirm = false">取消</button>
        <button class="btn btn-danger" @click="deleteItem">刪除</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Modal from '../components/Modal.vue'
import { useMaintenanceStore } from '../stores/maintenance'

const router = useRouter()
const maintStore = useMaintenanceStore()

const activeType = ref('car')
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const editingId = ref(null)
const deletingItem = ref(null)

const form = ref({ vehicleType: 'car', itemName: '', intervalKm: null, notes: '' })

const filteredItems = computed(() => maintStore.items.filter(i => i.vehicleType === activeType.value))

onMounted(() => maintStore.loadItems())

function openAdd() {
  editingId.value = null
  form.value = { vehicleType: activeType.value, itemName: '', intervalKm: null, notes: '' }
  showModal.value = true
}

function editItem(item) {
  editingId.value = item.id
  form.value = { vehicleType: item.vehicleType, itemName: item.itemName, intervalKm: item.intervalKm, notes: item.notes || '' }
  showModal.value = true
}

function closeModal() { showModal.value = false }

async function saveItem() {
  if (!form.value.itemName || !form.value.intervalKm) { alert('請填寫項目名稱與更換間隔'); return }
  if (editingId.value) {
    await maintStore.updateItem(editingId.value, form.value)
  } else {
    await maintStore.addItem(form.value)
  }
  closeModal()
}

function confirmDelete(item) { deletingItem.value = item; showDeleteConfirm.value = true }

async function deleteItem() {
  await maintStore.deleteItem(deletingItem.value.id)
  showDeleteConfirm.value = false
}
</script>
