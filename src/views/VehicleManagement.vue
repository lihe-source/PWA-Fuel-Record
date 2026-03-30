<template>
  <div class="page-container">
    <h1 class="page-title">車輛管理</h1>

    <div v-if="vehiclesStore.vehicles.length === 0" class="empty-state">
      <div class="empty-icon">🚗</div>
      <p>尚未新增車輛</p>
      <p class="empty-sub">點擊下方 + 按鈕新增車輛</p>
    </div>

    <VehicleCard
      v-for="vehicle in vehiclesStore.vehicles"
      :key="vehicle.id"
      :vehicle="vehicle"
      @edit="editVehicle"
      @delete="confirmDelete"
    />

    <!-- Add Button FAB -->
    <AddButton @click="openAddModal" />

    <!-- Add/Edit Modal -->
    <Modal v-model="showModal" :title="editingVehicle ? '編輯車輛' : '新增車輛'">
      <form @submit.prevent="saveVehicle" class="modal-form">
        <div class="form-group">
          <label class="form-label">車輛名稱 *</label>
          <input v-model="form.name" type="text" class="form-input" placeholder="例如：我的愛車" required />
        </div>
        <div class="form-group">
          <label class="form-label">車輛類型 *</label>
          <div class="type-select">
            <button
              type="button"
              :class="['type-btn', form.type === 'car' ? 'active' : '']"
              @click="form.type = 'car'"
            >🚗 汽車</button>
            <button
              type="button"
              :class="['type-btn', form.type === 'motorcycle' ? 'active' : '']"
              @click="form.type = 'motorcycle'"
            >🏍️ 機車</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">車牌號碼</label>
          <input v-model="form.plate" type="text" class="form-input" placeholder="例如：ABC-1234" />
        </div>
        <div class="form-group">
          <label class="form-label">初始里程 (公里)</label>
          <input v-model.number="form.initialMileage" type="number" class="form-input" min="0" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="showModal = false">取消</button>
          <button type="submit" class="btn-primary">{{ editingVehicle ? '儲存' : '新增' }}</button>
        </div>
      </form>
    </Modal>

    <!-- Delete confirm modal -->
    <Modal v-model="showDeleteModal" title="確認刪除">
      <p style="color: var(--text-primary)">確定要刪除「{{ deletingVehicle?.name }}」嗎？此操作無法復原，相關記錄不會被刪除。</p>
      <template #footer>
        <button class="btn-secondary" @click="showDeleteModal = false">取消</button>
        <button class="btn-danger" @click="doDelete">刪除</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useVehiclesStore } from '../stores/vehicles'
import VehicleCard from '../components/VehicleCard.vue'
import AddButton from '../components/AddButton.vue'
import Modal from '../components/Modal.vue'

const vehiclesStore = useVehiclesStore()
const showModal = ref(false)
const showDeleteModal = ref(false)
const editingVehicle = ref(null)
const deletingVehicle = ref(null)

const defaultForm = () => ({
  name: '',
  type: 'car',
  plate: '',
  initialMileage: 0,
})
const form = ref(defaultForm())

function openAddModal() {
  editingVehicle.value = null
  form.value = defaultForm()
  showModal.value = true
}

function editVehicle(vehicle) {
  editingVehicle.value = vehicle
  form.value = {
    name: vehicle.name,
    type: vehicle.type,
    plate: vehicle.plate || '',
    initialMileage: vehicle.initialMileage || 0,
  }
  showModal.value = true
}

async function saveVehicle() {
  if (editingVehicle.value) {
    await vehiclesStore.updateVehicle(editingVehicle.value.id, form.value)
  } else {
    await vehiclesStore.addVehicle({
      ...form.value,
      currentMileage: form.value.initialMileage,
    })
  }
  showModal.value = false
}

function confirmDelete(vehicle) {
  deletingVehicle.value = vehicle
  showDeleteModal.value = true
}

async function doDelete() {
  await vehiclesStore.deleteVehicle(deletingVehicle.value.id)
  showDeleteModal.value = false
}

onMounted(() => vehiclesStore.fetchVehicles())
</script>

<style scoped>
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
</style>
