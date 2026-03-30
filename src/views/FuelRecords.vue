<template>
  <div class="min-h-screen pb-32" style="background: var(--bg-secondary)">
    <div class="p-4 max-w-lg mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4 pt-2">
        <h1 class="text-xl font-bold" style="color: var(--text-primary)">油耗記錄</h1>
        <select
          v-if="vehiclesStore.vehicles.length > 1"
          v-model="selectedVehicleId"
          @change="loadRecords"
          class="text-sm rounded-lg px-3 py-1.5 border outline-none"
          style="background: var(--bg-primary); border-color: var(--border-color); color: var(--text-primary)"
        >
          <option v-for="v in vehiclesStore.vehicles" :key="v.id" :value="v.id">{{ v.name }}</option>
        </select>
      </div>

      <!-- Maintenance Alerts -->
      <MaintenanceAlert :alerts="maintenanceAlerts" />

      <!-- Records List -->
      <div v-if="fuelStore.records.length === 0" class="text-center py-16">
        <div class="text-5xl mb-4">⛽</div>
        <p style="color: var(--text-secondary)">尚無加油紀錄，點擊下方按鈕新增</p>
      </div>

      <div v-for="record in fuelStore.records" :key="record.id" class="rounded-xl p-4 mb-3" style="background: var(--bg-primary); border: var(--card-border)">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-semibold" style="color: var(--text-primary)">{{ record.date }}</p>
            <p class="text-sm mt-1" style="color: var(--text-secondary)">里程：{{ record.mileage?.toLocaleString() }} km</p>
            <p class="text-sm" style="color: var(--text-secondary)">加油量：{{ record.liters }} L ｜ 單價：{{ record.pricePerLiter }} 元/L</p>
            <p v-if="record.notes" class="text-xs mt-1" style="color: var(--text-secondary)">備註：{{ record.notes }}</p>
          </div>
          <div class="text-right">
            <p class="text-base font-bold" style="color: var(--accent)">NT$ {{ record.totalCost?.toLocaleString() }}</p>
            <div class="flex gap-2 mt-2 justify-end">
              <button @click="editRecord(record)" class="text-sm p-1" style="color: var(--accent)">✏️</button>
              <button @click="confirmDelete(record)" class="text-sm p-1 text-red-500">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- FAB -->
    <AddButton @click="openAddModal" />

    <!-- Add/Edit Modal -->
    <Modal v-model="showModal" :title="editingRecord ? '編輯加油紀錄' : '新增加油紀錄'">
      <form @submit.prevent="saveRecord" class="space-y-3">
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">日期</label>
          <input v-model="form.date" type="date" required class="w-full px-3 py-2 rounded-lg border text-sm outline-none" style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">里程 (km)</label>
          <input v-model.number="form.mileage" type="number" min="0" required class="w-full px-3 py-2 rounded-lg border text-sm outline-none" style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)" placeholder="目前里程" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">加油量 (L)</label>
          <input v-model.number="form.liters" type="number" min="0" step="0.01" required class="w-full px-3 py-2 rounded-lg border text-sm outline-none" style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)" placeholder="加油公升數" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">每公升價格 (元)</label>
          <input v-model.number="form.pricePerLiter" type="number" min="0" step="0.01" required class="w-full px-3 py-2 rounded-lg border text-sm outline-none" style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)" placeholder="每公升油價" />
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
      <p class="mb-4" style="color: var(--text-primary)">確定要刪除此筆加油紀錄嗎？</p>
      <div class="flex gap-2">
        <button @click="showDeleteModal = false" class="flex-1 py-2.5 rounded-lg border text-sm" style="border-color: var(--border-color); color: var(--text-secondary)">取消</button>
        <button @click="deleteRecord" class="flex-1 py-2.5 rounded-lg text-sm text-white bg-red-500">刪除</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AddButton from '../components/AddButton.vue'
import Modal from '../components/Modal.vue'
import MaintenanceAlert from '../components/MaintenanceAlert.vue'
import { useVehiclesStore } from '../stores/vehicles.js'
import { useFuelRecordsStore } from '../stores/fuelRecords.js'
import { useMaintenanceStore } from '../stores/maintenance.js'

const vehiclesStore = useVehiclesStore()
const fuelStore = useFuelRecordsStore()
const maintenanceStore = useMaintenanceStore()

const selectedVehicleId = ref(null)
const showModal = ref(false)
const showDeleteModal = ref(false)
const editingRecord = ref(null)
const deletingRecord = ref(null)
const saving = ref(false)
const maintenanceAlerts = ref([])

const defaultForm = () => ({
  date: new Date().toISOString().split('T')[0],
  mileage: '',
  liters: '',
  pricePerLiter: '',
  notes: ''
})
const form = ref(defaultForm())

async function loadRecords() {
  if (selectedVehicleId.value) {
    await fuelStore.fetchRecords(selectedVehicleId.value)
  }
}

function openAddModal() {
  editingRecord.value = null
  form.value = defaultForm()
  showModal.value = true
}

function editRecord(record) {
  editingRecord.value = record
  form.value = {
    date: record.date,
    mileage: record.mileage,
    liters: record.liters,
    pricePerLiter: record.pricePerLiter,
    notes: record.notes || ''
  }
  showModal.value = true
}

function confirmDelete(record) {
  deletingRecord.value = record
  showDeleteModal.value = true
}

async function deleteRecord() {
  if (!deletingRecord.value) return
  await fuelStore.deleteRecord(deletingRecord.value.id, selectedVehicleId.value)
  showDeleteModal.value = false
  deletingRecord.value = null
}

async function saveRecord() {
  if (!selectedVehicleId.value) return
  saving.value = true
  try {
    const totalCost = parseFloat((form.value.liters * form.value.pricePerLiter).toFixed(2))
    const data = { ...form.value, vehicleId: selectedVehicleId.value, totalCost }

    if (editingRecord.value) {
      await fuelStore.updateRecord(editingRecord.value.id, data)
    } else {
      await fuelStore.addRecord(data)
      await vehiclesStore.updateMileage(selectedVehicleId.value, form.value.mileage)
      const alerts = await maintenanceStore.checkMaintenanceAlerts(selectedVehicleId.value, form.value.mileage)
      maintenanceAlerts.value = alerts
    }
    showModal.value = false
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await vehiclesStore.fetchVehicles()
  if (vehiclesStore.vehicles.length > 0) {
    selectedVehicleId.value = vehiclesStore.vehicles[0].id
    await loadRecords()
  }
})
</script>
