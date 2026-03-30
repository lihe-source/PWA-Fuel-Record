<template>
  <div id="app">
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">保養記錄</h1>
      </div>

      <div class="chip-filter">
        <button class="chip" :class="{ active: selectedVehicleId === null }" @click="selectedVehicleId = null">全部</button>
        <button class="chip" v-for="v in vehicles" :key="v.id" :class="{ active: selectedVehicleId === v.id }" @click="selectedVehicleId = v.id">
          {{ v.type === 'car' ? '🚗' : '🏍️' }} {{ v.name }}
        </button>
      </div>

      <div v-if="filteredRecords.length === 0" class="empty-state">
        <div class="emoji">🔧</div>
        <p>尚無保養記錄<br>點擊 + 新增</p>
      </div>

      <div v-else class="card">
        <div class="record-item" v-for="r in filteredRecords" :key="r.id">
          <div class="record-main">
            <div class="record-title">{{ r.itemName }}</div>
            <div class="record-sub">{{ getVehicleName(r.vehicleId) }} · {{ formatDate(r.date) }}</div>
            <div class="record-sub">{{ r.mileage?.toLocaleString() }} km</div>
            <div v-if="r.nextMileage" class="next-service-badge">下次預計更換: {{ r.nextMileage.toLocaleString() }} 公里</div>
            <div v-if="r.notes" class="record-sub" style="font-style:italic;margin-top:4px">{{ r.notes }}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
            <div class="record-cost">NT${{ r.cost?.toLocaleString() }}</div>
            <div style="display:flex;gap:4px">
              <button class="btn-icon" @click="editRecord(r)">✏️</button>
              <button class="btn-icon" @click="confirmDelete(r)">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <AddButton @click="openAdd" />
    <BottomNav />

    <Modal v-if="showModal" :title="editingId ? '編輯保養記錄' : '新增保養記錄'" @close="closeModal">
      <div class="form-group">
        <label class="form-label">車輛</label>
        <select v-model="form.vehicleId" class="form-select" @change="onVehicleChange">
          <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ v.name }}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">保養項目</label>
        <select v-model="form.itemName" class="form-select" @change="onItemChange">
          <option value="">自定義</option>
          <option v-for="item in relevantItems" :key="item.id" :value="item.itemName">{{ item.itemName }}</option>
        </select>
        <input v-if="form.itemName === ''" type="text" v-model="form.customItemName" class="form-input" style="margin-top:8px" placeholder="請輸入保養項目名稱" />
      </div>
      <div class="form-group">
        <label class="form-label">日期</label>
        <input type="date" v-model="form.date" class="form-input" />
      </div>
      <div class="form-group">
        <label class="form-label">里程 (km)</label>
        <input type="number" v-model.number="form.mileage" class="form-input" placeholder="當前里程" />
      </div>
      <div class="form-group">
        <label class="form-label">費用 (元)</label>
        <input type="number" v-model.number="form.cost" class="form-input" placeholder="0" />
      </div>
      <div class="form-group">
        <label class="form-label">下次更換里程 (km)</label>
        <input type="number" v-model.number="form.nextMileage" class="form-input" :placeholder="autoNextMileage || '選填'" />
      </div>
      <div class="form-group">
        <label class="form-label">備註</label>
        <textarea v-model="form.notes" class="form-textarea" placeholder="選填"></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" @click="closeModal">取消</button>
        <button class="btn btn-primary" @click="saveRecord">{{ editingId ? '更新' : '儲存' }}</button>
      </div>
    </Modal>

    <Modal v-if="showDeleteConfirm" title="確認刪除" @close="showDeleteConfirm = false">
      <p style="color:var(--text-secondary);margin-bottom:20px">確定要刪除此保養記錄嗎？</p>
      <div class="form-actions">
        <button class="btn btn-secondary" @click="showDeleteConfirm = false">取消</button>
        <button class="btn btn-danger" @click="deleteRecord">刪除</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import BottomNav from '../components/BottomNav.vue'
import AddButton from '../components/AddButton.vue'
import Modal from '../components/Modal.vue'
import { useVehiclesStore } from '../stores/vehicles'
import { useMaintenanceStore } from '../stores/maintenance'

const vehiclesStore = useVehiclesStore()
const maintStore = useMaintenanceStore()

const vehicles = computed(() => vehiclesStore.vehicles)
const selectedVehicleId = ref(null)
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const editingId = ref(null)
const deletingId = ref(null)

const form = ref({
  vehicleId: null, itemName: '', customItemName: '',
  date: new Date().toISOString().split('T')[0],
  mileage: null, cost: null, nextMileage: null, notes: ''
})

const relevantItems = computed(() => {
  const v = vehicles.value.find(v => v.id === form.value.vehicleId)
  if (!v) return []
  return maintStore.items.filter(i => i.vehicleType === v.type)
})

const autoNextMileage = computed(() => {
  const item = maintStore.items.find(i => i.itemName === form.value.itemName)
  if (item && form.value.mileage) return form.value.mileage + item.intervalKm
  return null
})

const filteredRecords = computed(() => {
  if (selectedVehicleId.value === null) return maintStore.records
  return maintStore.records.filter(r => r.vehicleId === selectedVehicleId.value)
})

onMounted(async () => {
  await vehiclesStore.loadVehicles()
  await maintStore.loadRecords()
  await maintStore.loadItems()
  if (vehicles.value.length) form.value.vehicleId = vehicles.value[0].id
})

function onVehicleChange() { form.value.itemName = '' }

function onItemChange() {
  const item = maintStore.items.find(i => i.itemName === form.value.itemName)
  if (item && form.value.mileage) {
    form.value.nextMileage = form.value.mileage + item.intervalKm
  }
}

function openAdd() {
  editingId.value = null
  form.value = {
    vehicleId: vehicles.value[0]?.id || null, itemName: '', customItemName: '',
    date: new Date().toISOString().split('T')[0],
    mileage: null, cost: null, nextMileage: null, notes: ''
  }
  showModal.value = true
}

function editRecord(r) {
  editingId.value = r.id
  form.value = {
    vehicleId: r.vehicleId, itemName: r.itemName, customItemName: '',
    date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
    mileage: r.mileage, cost: r.cost, nextMileage: r.nextMileage, notes: r.notes || ''
  }
  showModal.value = true
}

function closeModal() { showModal.value = false }

async function saveRecord() {
  const itemName = form.value.itemName || form.value.customItemName
  if (!form.value.vehicleId || !form.value.date || !form.value.mileage || !itemName) {
    alert('請填寫車輛、日期、里程與保養項目'); return
  }
  const item = maintStore.items.find(i => i.itemName === itemName)
  const data = {
    vehicleId: form.value.vehicleId,
    itemName,
    date: form.value.date,
    mileage: form.value.mileage,
    cost: form.value.cost || 0,
    nextMileage: form.value.nextMileage || (item ? form.value.mileage + item.intervalKm : null),
    notes: form.value.notes,
    intervalKm: item?.intervalKm
  }
  if (editingId.value) {
    await maintStore.updateRecord(editingId.value, data)
  } else {
    await maintStore.addRecord(data)
  }
  await maintStore.loadRecords()
  closeModal()
}

function confirmDelete(r) { deletingId.value = r.id; showDeleteConfirm.value = true }

async function deleteRecord() {
  await maintStore.deleteRecord(deletingId.value)
  await maintStore.loadRecords()
  showDeleteConfirm.value = false
}

function getVehicleName(id) { return vehicles.value.find(v => v.id === id)?.name || '未知' }

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}
</script>
