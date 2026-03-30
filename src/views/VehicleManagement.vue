<template>
  <div class="min-h-screen pb-20" style="background: var(--bg-secondary)">
    <div class="p-4 max-w-lg mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4 pt-2">
        <h1 class="text-xl font-bold" style="color: var(--text-primary)">車輛管理</h1>
        <button
          @click="openAddModal"
          class="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-white font-medium"
          style="background: var(--accent)"
        >
          + 新增
        </button>
      </div>

      <div v-if="vehiclesStore.vehicles.length === 0" class="text-center py-16">
        <div class="text-5xl mb-4">🚗</div>
        <p style="color: var(--text-secondary)">尚未新增任何車輛</p>
      </div>

      <VehicleCard
        v-for="vehicle in vehiclesStore.vehicles"
        :key="vehicle.id"
        :vehicle="vehicle"
        @edit="editVehicle"
        @delete="confirmDelete"
      />
    </div>

    <!-- Add/Edit Modal -->
    <Modal v-model="showModal" :title="editingVehicle ? '編輯車輛' : '新增車輛'">
      <form @submit.prevent="saveVehicle" class="space-y-3">
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">車輛名稱</label>
          <input v-model="form.name" type="text" required class="w-full px-3 py-2 rounded-lg border text-sm outline-none" style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)" placeholder="例：我的愛車" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">類型</label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer" style="color: var(--text-primary)">
              <input type="radio" v-model="form.type" value="汽車" class="accent-blue-500" />
              🚗 汽車
            </label>
            <label class="flex items-center gap-2 cursor-pointer" style="color: var(--text-primary)">
              <input type="radio" v-model="form.type" value="機車" class="accent-blue-500" />
              🏍️ 機車
            </label>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">車牌號碼</label>
          <input v-model="form.plate" type="text" required class="w-full px-3 py-2 rounded-lg border text-sm outline-none" style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)" placeholder="例：ABC-1234" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">初始里程 (km)</label>
          <input v-model.number="form.initialMileage" type="number" min="0" required class="w-full px-3 py-2 rounded-lg border text-sm outline-none" style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)" placeholder="0" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">目前里程 (km)</label>
          <input v-model.number="form.currentMileage" type="number" min="0" required class="w-full px-3 py-2 rounded-lg border text-sm outline-none" style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)" placeholder="0" />
        </div>
        <div class="flex gap-2 pt-2">
          <button type="button" @click="showModal = false" class="flex-1 py-2.5 rounded-lg border text-sm" style="border-color: var(--border-color); color: var(--text-secondary)">取消</button>
          <button type="submit" :disabled="saving" class="flex-1 py-2.5 rounded-lg text-sm text-white font-medium" style="background: var(--accent)">{{ saving ? '儲存中...' : '儲存' }}</button>
        </div>
      </form>
    </Modal>

    <!-- Delete Confirm Modal -->
    <Modal v-model="showDeleteModal" title="確認刪除">
      <p class="mb-4" style="color: var(--text-primary)">確定要刪除此車輛嗎？相關油耗和保養紀錄將不受影響。</p>
      <div class="flex gap-2">
        <button @click="showDeleteModal = false" class="flex-1 py-2.5 rounded-lg border text-sm" style="border-color: var(--border-color); color: var(--text-secondary)">取消</button>
        <button @click="deleteVehicle" class="flex-1 py-2.5 rounded-lg text-sm text-white bg-red-500">刪除</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import VehicleCard from '../components/VehicleCard.vue'
import Modal from '../components/Modal.vue'
import { useVehiclesStore } from '../stores/vehicles.js'
import { useMaintenanceStore } from '../stores/maintenance.js'
import { useAuthStore } from '../stores/auth.js'

const vehiclesStore = useVehiclesStore()
const maintenanceStore = useMaintenanceStore()
const authStore = useAuthStore()

const showModal = ref(false)
const showDeleteModal = ref(false)
const editingVehicle = ref(null)
const deletingVehicle = ref(null)
const saving = ref(false)

const defaultForm = () => ({ name: '', type: '汽車', plate: '', initialMileage: 0, currentMileage: 0 })
const form = ref(defaultForm())

function openAddModal() {
  editingVehicle.value = null
  form.value = defaultForm()
  showModal.value = true
}

function editVehicle(vehicle) {
  editingVehicle.value = vehicle
  form.value = { name: vehicle.name, type: vehicle.type, plate: vehicle.plate, initialMileage: vehicle.initialMileage, currentMileage: vehicle.currentMileage }
  showModal.value = true
}

function confirmDelete(vehicle) {
  deletingVehicle.value = vehicle
  showDeleteModal.value = true
}

async function deleteVehicle() {
  if (!deletingVehicle.value) return
  await vehiclesStore.deleteVehicle(deletingVehicle.value.id)
  showDeleteModal.value = false
  deletingVehicle.value = null
}

async function saveVehicle() {
  saving.value = true
  try {
    if (editingVehicle.value) {
      await vehiclesStore.updateVehicle(editingVehicle.value.id, form.value)
    } else {
      await vehiclesStore.addVehicle(form.value)
    }
    showModal.value = false
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await vehiclesStore.fetchVehicles()
  if (authStore.user) {
    await maintenanceStore.ensureDefaultItems(authStore.user.uid)
  }
})
</script>
