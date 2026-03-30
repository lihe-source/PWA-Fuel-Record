<template>
  <div id="app">
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">加油記錄</h1>
      </div>

      <div class="chip-filter">
        <button class="chip" :class="{ active: selectedVehicleId === null }" @click="selectVehicle(null)">全部</button>
        <button class="chip" v-for="v in vehicles" :key="v.id" :class="{ active: selectedVehicleId === v.id }" @click="selectVehicle(v.id)">
          {{ v.type === 'car' ? '🚗' : '🏍️' }} {{ v.name }}
        </button>
      </div>

      <MaintenanceAlert :alerts="currentAlerts" />

      <div v-if="filteredRecords.length === 0" class="empty-state">
        <div class="emoji">⛽</div>
        <p>尚無加油記錄<br>點擊 + 新增</p>
      </div>

      <div v-else class="card">
        <div class="record-item" v-for="r in filteredRecords" :key="r.id">
          <div class="record-main">
            <div class="record-title">{{ getVehicleName(r.vehicleId) }}</div>
            <div class="record-sub">{{ formatDate(r.date) }} · {{ r.mileage?.toLocaleString() }} km</div>
            <div class="record-sub">{{ r.liters }} L · NT${{ r.pricePerLiter }}/L</div>
            <div v-if="r.notes" class="record-sub" style="font-style:italic">{{ r.notes }}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
            <div class="record-cost">NT${{ r.totalCost?.toLocaleString() }}</div>
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

    <Modal v-if="showModal" :title="editingId ? '編輯加油記錄' : '新增加油記錄'" @close="closeModal">
      <div class="form-group">
        <label class="form-label">車輛</label>
        <select v-model="form.vehicleId" class="form-select">
          <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ v.name }}</option>
        </select>
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
        <label class="form-label">加油量 (公升)</label>
        <input type="number" step="0.01" v-model.number="form.liters" class="form-input" placeholder="0.00" />
      </div>
      <div class="form-group">
        <label class="form-label">每公升單價 (元)</label>
        <input type="number" step="0.1" v-model.number="form.pricePerLiter" class="form-input" placeholder="0.0" />
      </div>
      <div class="form-group">
        <label class="form-label">總金額 (元)</label>
        <input type="number" v-model.number="form.totalCost" class="form-input" :placeholder="autoTotal" />
      </div>
      <div class="form-group">
        <label class="form-label">備註</label>
        <textarea v-model="form.notes" class="form-textarea" placeholder="選填"></textarea>
      </div>
      <MaintenanceAlert :alerts="formAlerts" />
      <div class="form-actions">
        <button class="btn btn-secondary" @click="closeModal">取消</button>
        <button class="btn btn-primary" @click="saveRecord">{{ editingId ? '更新' : '儲存' }}</button>
      </div>
    </Modal>

    <Modal v-if="showDeleteConfirm" title="確認刪除" @close="showDeleteConfirm = false">
      <p style="color:var(--text-secondary);margin-bottom:20px">確定要刪除此加油記錄嗎？</p>
      <div class="form-actions">
        <button class="btn btn-secondary" @click="showDeleteConfirm = false">取消</button>
        <button class="btn btn-danger" @click="deleteRecord">刪除</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import BottomNav from '../components/BottomNav.vue'
import AddButton from '../components/AddButton.vue'
import Modal from '../components/Modal.vue'
import MaintenanceAlert from '../components/MaintenanceAlert.vue'
import { useVehiclesStore } from '../stores/vehicles'
import { useFuelRecordsStore } from '../stores/fuelRecords'

const vehiclesStore = useVehiclesStore()
const fuelStore = useFuelRecordsStore()

const vehicles = computed(() => vehiclesStore.vehicles)
const selectedVehicleId = ref(null)
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const editingId = ref(null)
const deletingId = ref(null)
const formAlerts = ref([])
const currentAlerts = ref([])

const form = ref({
  vehicleId: null,
  date: new Date().toISOString().split('T')[0],
  mileage: null,
  liters: null,
  pricePerLiter: null,
  totalCost: null,
  notes: ''
})

const autoTotal = computed(() => {
  if (form.value.liters && form.value.pricePerLiter) {
    return String(Math.round(form.value.liters * form.value.pricePerLiter))
  }
  return '自動計算'
})

const filteredRecords = computed(() => {
  if (selectedVehicleId.value === null) return fuelStore.records
  return fuelStore.records.filter(r => r.vehicleId === selectedVehicleId.value)
})

onMounted(async () => {
  await vehiclesStore.loadVehicles()
  await fuelStore.loadRecords()
  if (vehicles.value.length) form.value.vehicleId = vehicles.value[0].id
})

watch(() => form.value.mileage, async (mileage) => {
  if (mileage && form.value.vehicleId) {
    formAlerts.value = await fuelStore.checkMaintenanceAlerts(form.value.vehicleId, mileage)
  }
})

async function selectVehicle(id) {
  selectedVehicleId.value = id
  if (id) {
    const v = vehicles.value.find(v => v.id === id)
    currentAlerts.value = await fuelStore.checkMaintenanceAlerts(id, v?.currentMileage || 0)
  } else {
    currentAlerts.value = []
  }
}

function openAdd() {
  editingId.value = null
  form.value = {
    vehicleId: vehicles.value[0]?.id || null,
    date: new Date().toISOString().split('T')[0],
    mileage: null, liters: null, pricePerLiter: null, totalCost: null, notes: ''
  }
  showModal.value = true
}

function editRecord(r) {
  editingId.value = r.id
  form.value = {
    vehicleId: r.vehicleId,
    date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
    mileage: r.mileage, liters: r.liters, pricePerLiter: r.pricePerLiter,
    totalCost: r.totalCost, notes: r.notes || ''
  }
  showModal.value = true
}

function closeModal() { showModal.value = false; formAlerts.value = [] }

async function saveRecord() {
  if (!form.value.vehicleId || !form.value.date || !form.value.mileage) {
    alert('請填寫車輛、日期與里程'); return
  }
  const data = {
    ...form.value,
    totalCost: form.value.totalCost || Math.round((form.value.liters || 0) * (form.value.pricePerLiter || 0))
  }
  if (editingId.value) {
    await fuelStore.updateRecord(editingId.value, data)
  } else {
    await fuelStore.addRecord(data)
  }
  await fuelStore.loadRecords()
  closeModal()
}

function confirmDelete(r) { deletingId.value = r.id; showDeleteConfirm.value = true }

async function deleteRecord() {
  await fuelStore.deleteRecord(deletingId.value)
  await fuelStore.loadRecords()
  showDeleteConfirm.value = false
}

function getVehicleName(id) { return vehicles.value.find(v => v.id === id)?.name || '未知' }

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}
</script>
