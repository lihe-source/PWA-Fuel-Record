<template>
  <div id="app">
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">車輛管理</h1>
        <button class="btn btn-primary btn-sm" @click="openAdd">＋ 新增</button>
      </div>

      <div v-if="vehicles.length === 0" class="empty-state">
        <div class="emoji">🚗</div>
        <p>尚未添加任何車輛</p>
      </div>

      <VehicleCard
        v-for="v in vehicles" :key="v.id"
        :vehicle="v"
        @edit="editVehicle"
        @delete="confirmDelete"
      />
    </div>

    <BottomNav />

    <Modal v-if="showModal" :title="editingId ? '編輯車輛' : '新增車輛'" @close="closeModal">
      <div class="form-group">
        <label class="form-label">車輛名稱</label>
        <input type="text" v-model="form.name" class="form-input" placeholder="例如：我的愛車" />
      </div>
      <div class="form-group">
        <label class="form-label">類型</label>
        <div class="toggle-group">
          <button class="toggle-btn" :class="{ active: form.type === 'car' }" @click="form.type = 'car'">🚗 汽車</button>
          <button class="toggle-btn" :class="{ active: form.type === 'motorcycle' }" @click="form.type = 'motorcycle'">🏍️ 機車</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">車牌號碼</label>
        <input type="text" v-model="form.plate" class="form-input" placeholder="例如：ABC-1234" />
      </div>
      <div class="form-group">
        <label class="form-label">初始里程 (km)</label>
        <input type="number" v-model.number="form.initialMileage" class="form-input" placeholder="0" />
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" @click="closeModal">取消</button>
        <button class="btn btn-primary" @click="saveVehicle">{{ editingId ? '更新' : '儲存' }}</button>
      </div>
    </Modal>

    <Modal v-if="showDeleteConfirm" title="確認刪除" @close="showDeleteConfirm = false">
      <p style="color:var(--text-secondary);margin-bottom:20px">確定要刪除「{{ deletingVehicle?.name }}」嗎？相關記錄不會被刪除。</p>
      <div class="form-actions">
        <button class="btn btn-secondary" @click="showDeleteConfirm = false">取消</button>
        <button class="btn btn-danger" @click="deleteVehicle">刪除</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import BottomNav from '../components/BottomNav.vue'
import VehicleCard from '../components/VehicleCard.vue'
import Modal from '../components/Modal.vue'
import { useVehiclesStore } from '../stores/vehicles'

const store = useVehiclesStore()
const vehicles = computed(() => store.vehicles)
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const editingId = ref(null)
const deletingVehicle = ref(null)

const form = ref({ name: '', type: 'car', plate: '', initialMileage: 0 })

onMounted(() => store.loadVehicles())

function openAdd() {
  editingId.value = null
  form.value = { name: '', type: 'car', plate: '', initialMileage: 0 }
  showModal.value = true
}

function editVehicle(v) {
  editingId.value = v.id
  form.value = { name: v.name, type: v.type, plate: v.plate, initialMileage: v.initialMileage }
  showModal.value = true
}

function closeModal() { showModal.value = false }

async function saveVehicle() {
  if (!form.value.name) { alert('請輸入車輛名稱'); return }
  if (editingId.value) {
    await store.updateVehicle(editingId.value, form.value)
  } else {
    await store.addVehicle(form.value)
  }
  closeModal()
}

function confirmDelete(v) { deletingVehicle.value = v; showDeleteConfirm.value = true }

async function deleteVehicle() {
  await store.deleteVehicle(deletingVehicle.value.id)
  showDeleteConfirm.value = false
}
</script>
