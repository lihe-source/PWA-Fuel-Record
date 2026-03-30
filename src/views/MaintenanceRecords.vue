<template>
  <div class="min-h-screen pb-32" style="background: var(--bg-secondary)">
    <div class="p-4 max-w-lg mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4 pt-2">
        <h1 class="text-xl font-bold" style="color: var(--text-primary)">保養記錄</h1>
        <select
          v-if="vehiclesStore.vehicles.length > 1"
          v-model="selectedVehicleId"
          @change="loadData"
          class="text-sm rounded-lg px-3 py-1.5 border outline-none"
          style="background: var(--bg-primary); border-color: var(--border-color); color: var(--text-primary)"
        >
          <option v-for="v in vehiclesStore.vehicles" :key="v.id" :value="v.id">{{ v.name }}</option>
        </select>
      </div>

      <!-- Next service info -->
      <div v-if="nextServiceMsg" class="mb-4 p-3 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
        ✅ {{ nextServiceMsg }}
      </div>

      <!-- Records List -->
      <div v-if="maintenanceStore.records.length === 0" class="text-center py-16">
        <div class="text-5xl mb-4">🔧</div>
        <p style="color: var(--text-secondary)">尚無保養紀錄，點擊下方按鈕新增</p>
      </div>

      <div v-for="record in maintenanceStore.records" :key="record.id" class="rounded-xl p-4 mb-3" style="background: var(--bg-primary); border: var(--card-border)">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-semibold" style="color: var(--text-primary)">{{ record.itemName }}</p>
            <p class="text-sm mt-1" style="color: var(--text-secondary)">日期：{{ record.date }}</p>
            <p class="text-sm" style="color: var(--text-secondary)">里程：{{ record.mileage?.toLocaleString() }} km</p>
            <p v-if="record.nextMileage" class="text-sm" style="color: var(--text-secondary)">下次：{{ record.nextMileage?.toLocaleString() }} km</p>
            <p v-if="record.notes" class="text-xs mt-1" style="color: var(--text-secondary)">備註：{{ record.notes }}</p>
          </div>
          <div class="text-right">
            <p class="text-base font-bold" style="color: var(--accent)">NT$ {{ record.cost?.toLocaleString() }}</p>
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
    <Modal v-model="showModal" :title="editingRecord ? '編輯保養紀錄' : '新增保養紀錄'">
      <form @submit.prevent="saveRecord" class="space-y-3">
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">日期</label>
          <input v-model="form.date" type="date" required class="w-full px-3 py-2 rounded-lg border text-sm outline-none" style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">里程 (km)</label>
          <input v-model.number="form.mileage" type="number" min="0" required class="w-full px-3 py-2 rounded-lg border text-sm outline-none" style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">保養項目</label>
          <select v-model="form.itemName" required class="w-full px-3 py-2 rounded-lg border text-sm outline-none" style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)">
            <option value="" disabled>請選擇保養項目</option>
            <option v-for="item in availableItems" :key="item.id" :value="item.itemName">{{ item.itemName }}</option>
            <option value="__custom__">其他（自行輸入）</option>
          </select>
        </div>
        <div v-if="form.itemName === '__custom__'">
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">自訂項目名稱</label>
          <input v-model="form.customItemName" type="text" class="w-full px-3 py-2 rounded-lg border text-sm outline-none" style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)" placeholder="輸入保養項目名稱" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">費用 (元)</label>
          <input v-model.number="form.cost" type="number" min="0" class="w-full px-3 py-2 rounded-lg border text-sm outline-none" style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)" placeholder="0" />
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
      <p class="mb-4" style="color: var(--text-primary)">確定要刪除此筆保養紀錄嗎？</p>
      <div class="flex gap-2">
        <button @click="showDeleteModal = false" class="flex-1 py-2.5 rounded-lg border text-sm" style="border-color: var(--border-color); color: var(--text-secondary)">取消</button>
        <button @click="deleteRecord" class="flex-1 py-2.5 rounded-lg text-sm text-white bg-red-500">刪除</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AddButton from '../components/AddButton.vue'
import Modal from '../components/Modal.vue'
import { useVehiclesStore } from '../stores/vehicles.js'
import { useMaintenanceStore } from '../stores/maintenance.js'

const vehiclesStore = useVehiclesStore()
const maintenanceStore = useMaintenanceStore()

const selectedVehicleId = ref(null)
const showModal = ref(false)
const showDeleteModal = ref(false)
const editingRecord = ref(null)
const deletingRecord = ref(null)
const saving = ref(false)
const nextServiceMsg = ref('')

const defaultForm = () => ({
  date: new Date().toISOString().split('T')[0],
  mileage: '',
  itemName: '',
  customItemName: '',
  cost: '',
  notes: ''
})
const form = ref(defaultForm())

const availableItems = computed(() => {
  const vehicle = vehiclesStore.vehicles.find(v => v.id === selectedVehicleId.value)
  if (!vehicle) return []
  return maintenanceStore.items.filter(item => item.vehicleType === vehicle.type)
})

async function loadData() {
  if (!selectedVehicleId.value) return
  await maintenanceStore.fetchRecords(selectedVehicleId.value)
  const vehicle = vehiclesStore.vehicles.find(v => v.id === selectedVehicleId.value)
  if (vehicle) {
    await maintenanceStore.fetchItems(vehicle.type)
  }
}

function openAddModal() {
  editingRecord.value = null
  form.value = defaultForm()
  nextServiceMsg.value = ''
  showModal.value = true
}

function editRecord(record) {
  editingRecord.value = record
  form.value = {
    date: record.date,
    mileage: record.mileage,
    itemName: record.itemName,
    customItemName: '',
    cost: record.cost || '',
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
  await maintenanceStore.deleteRecord(deletingRecord.value.id, selectedVehicleId.value)
  showDeleteModal.value = false
  deletingRecord.value = null
}

async function saveRecord() {
  if (!selectedVehicleId.value) return
  saving.value = true
  try {
    const resolvedItemName = form.value.itemName === '__custom__'
      ? form.value.customItemName
      : form.value.itemName

    const matchedItem = availableItems.value.find(i => i.itemName === resolvedItemName)
    const nextMileage = matchedItem ? form.value.mileage + matchedItem.intervalKm : null

    const data = {
      vehicleId: selectedVehicleId.value,
      date: form.value.date,
      mileage: form.value.mileage,
      itemName: resolvedItemName,
      cost: form.value.cost || 0,
      notes: form.value.notes,
      nextMileage
    }

    if (editingRecord.value) {
      await maintenanceStore.updateRecord(editingRecord.value.id, data)
    } else {
      await maintenanceStore.addRecord(data)
      if (nextMileage) {
        nextServiceMsg.value = `下次預計更換：${nextMileage.toLocaleString()} 公里`
      }
    }
    showModal.value = false
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await vehiclesStore.fetchVehicles()
  await maintenanceStore.fetchItems()
  if (vehiclesStore.vehicles.length > 0) {
    selectedVehicleId.value = vehiclesStore.vehicles[0].id
    await loadData()
  }
})
</script>
