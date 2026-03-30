<template>
  <div class="page-container">
    <h1 class="page-title">保養記錄</h1>

    <!-- Vehicle filter -->
    <div class="form-group mb-4" v-if="vehiclesStore.vehicles.length > 0">
      <select v-model="selectedVehicleId" class="form-input">
        <option :value="null">全部車輛</option>
        <option v-for="v in vehiclesStore.vehicles" :key="v.id" :value="v.id">
          {{ v.type === 'car' ? '🚗' : '🏍️' }} {{ v.name }}
        </option>
      </select>
    </div>

    <!-- Records list -->
    <div v-if="filteredRecords.length === 0" class="empty-state">
      <div class="empty-icon">🔧</div>
      <p>尚無保養記錄</p>
      <p class="empty-sub">點擊下方 + 按鈕新增記錄</p>
    </div>

    <div v-for="record in filteredRecords" :key="record.id" class="record-card">
      <div class="record-header">
        <span class="record-vehicle">{{ getVehicleName(record.vehicleId) }}</span>
        <span class="record-date">{{ formatDate(record.date) }}</span>
      </div>
      <div class="record-body">
        <div class="record-item-name">🔧 {{ record.itemName }}</div>
        <div class="record-stats">
          <div class="record-stat">
            <span class="stat-label">里程</span>
            <span class="stat-val">{{ record.mileage?.toLocaleString() }} 公里</span>
          </div>
          <div class="record-stat">
            <span class="stat-label">費用</span>
            <span class="stat-val cost">${{ record.cost?.toLocaleString() }}</span>
          </div>
        </div>
        <div v-if="record.nextMileage" class="next-mileage">
          下次預計更換: {{ record.nextMileage.toLocaleString() }} 公里
        </div>
      </div>
      <div v-if="record.notes" class="record-notes">{{ record.notes }}</div>
      <div class="record-actions">
        <button class="action-link" @click="editRecord(record)">✏️ 編輯</button>
        <button class="action-link danger" @click="confirmDelete(record)">🗑️ 刪除</button>
      </div>
    </div>

    <!-- Add Button FAB -->
    <AddButton @click="openAddModal" />

    <!-- Add/Edit Modal -->
    <Modal v-model="showModal" :title="editingRecord ? '編輯保養記錄' : '新增保養記錄'">
      <form @submit.prevent="saveRecord" class="modal-form">
        <div class="form-group">
          <label class="form-label">車輛 *</label>
          <select v-model="form.vehicleId" class="form-input" required @change="onVehicleSelect">
            <option :value="null" disabled>請選擇車輛</option>
            <option v-for="v in vehiclesStore.vehicles" :key="v.id" :value="v.id">
              {{ v.type === 'car' ? '🚗' : '🏍️' }} {{ v.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">保養項目 *</label>
          <div class="item-select-row">
            <select v-if="availableItems.length > 0" v-model="form.itemName" class="form-input">
              <option value="">自訂輸入</option>
              <option v-for="item in availableItems" :key="item.id" :value="item.itemName">
                {{ item.itemName }}
              </option>
            </select>
            <input
              v-if="form.itemName === '' || availableItems.length === 0"
              v-model="form.customItemName"
              type="text"
              class="form-input"
              placeholder="輸入保養項目名稱"
              required
            />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">日期 *</label>
          <input v-model="form.date" type="date" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label">目前里程 (公里) *</label>
          <input v-model.number="form.mileage" type="number" class="form-input" min="0" required />
        </div>
        <div class="form-group">
          <label class="form-label">費用 (元)</label>
          <input v-model.number="form.cost" type="number" class="form-input" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">備註</label>
          <textarea v-model="form.notes" class="form-input" rows="2" placeholder="選填"></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="showModal = false">取消</button>
          <button type="submit" class="btn-primary">{{ editingRecord ? '儲存' : '新增' }}</button>
        </div>
      </form>
    </Modal>

    <!-- Delete confirm modal -->
    <Modal v-model="showDeleteModal" title="確認刪除">
      <p style="color: var(--text-primary)">確定要刪除此保養記錄嗎？此操作無法復原。</p>
      <template #footer>
        <button class="btn-secondary" @click="showDeleteModal = false">取消</button>
        <button class="btn-danger" @click="doDelete">刪除</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useVehiclesStore } from '../stores/vehicles'
import { useMaintenanceStore } from '../stores/maintenance'
import AddButton from '../components/AddButton.vue'
import Modal from '../components/Modal.vue'

const vehiclesStore = useVehiclesStore()
const maintenanceStore = useMaintenanceStore()

const selectedVehicleId = ref(null)
const showModal = ref(false)
const showDeleteModal = ref(false)
const editingRecord = ref(null)
const deletingRecord = ref(null)

const defaultForm = () => ({
  vehicleId: vehiclesStore.vehicles[0]?.id || null,
  itemName: '',
  customItemName: '',
  date: new Date().toISOString().slice(0, 10),
  mileage: 0,
  cost: 0,
  notes: '',
})
const form = ref(defaultForm())

const filteredRecords = computed(() => {
  if (!selectedVehicleId.value) return maintenanceStore.records
  return maintenanceStore.records.filter((r) => r.vehicleId === selectedVehicleId.value)
})

const availableItems = computed(() => {
  if (!form.value.vehicleId) return []
  const vehicle = vehiclesStore.vehicles.find((v) => v.id === form.value.vehicleId)
  if (!vehicle) return []
  return maintenanceStore.items.filter((i) => i.vehicleType === vehicle.type)
})

function getVehicleName(vehicleId) {
  const v = vehiclesStore.vehicles.find((v) => v.id === vehicleId)
  return v ? `${v.type === 'car' ? '🚗' : '🏍️'} ${v.name}` : '未知車輛'
}

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function openAddModal() {
  editingRecord.value = null
  form.value = defaultForm()
  showModal.value = true
}

function editRecord(record) {
  editingRecord.value = record
  form.value = {
    vehicleId: record.vehicleId,
    itemName: record.itemName,
    customItemName: '',
    date: new Date(record.date).toISOString().slice(0, 10),
    mileage: record.mileage,
    cost: record.cost || 0,
    notes: record.notes || '',
  }
  showModal.value = true
}

function onVehicleSelect() {
  form.value.itemName = ''
}

async function saveRecord() {
  const itemName = form.value.itemName || form.value.customItemName
  const data = {
    vehicleId: form.value.vehicleId,
    itemName,
    date: new Date(form.value.date),
    mileage: form.value.mileage,
    cost: form.value.cost,
    notes: form.value.notes,
  }
  if (editingRecord.value) {
    await maintenanceStore.updateRecord(editingRecord.value.id, data)
  } else {
    await maintenanceStore.addRecord(data)
  }
  showModal.value = false
}

function confirmDelete(record) {
  deletingRecord.value = record
  showDeleteModal.value = true
}

async function doDelete() {
  await maintenanceStore.deleteRecord(deletingRecord.value.id)
  showDeleteModal.value = false
}

onMounted(async () => {
  await vehiclesStore.fetchVehicles()
  await maintenanceStore.fetchRecords()
  await maintenanceStore.fetchItems()
})
</script>

<style scoped>
.record-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 1rem;
  margin-bottom: 0.75rem;
  box-shadow: var(--shadow);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.625rem;
}

.record-vehicle {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.record-date {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.record-item-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.record-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.record-stat {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.stat-val {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary);
}

.stat-val.cost {
  color: #3b82f6;
}

.next-mileage {
  font-size: 0.8125rem;
  color: #10b981;
  font-weight: 500;
  background: #d1fae5;
  padding: 0.375rem 0.625rem;
  border-radius: 0.375rem;
  margin-top: 0.25rem;
}

.record-notes {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin: 0.5rem 0;
}

.record-actions {
  display: flex;
  gap: 1rem;
  border-top: 1px solid var(--border-color);
  padding-top: 0.5rem;
  margin-top: 0.25rem;
}

.action-link {
  background: none;
  border: none;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.25rem 0;
}

.action-link.danger {
  color: #ef4444;
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

.item-select-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
