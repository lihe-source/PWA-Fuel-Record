<template>
  <div class="page-container">
    <h1 class="page-title">儀表板</h1>

    <!-- Vehicle selector -->
    <div class="form-group mb-4" v-if="vehiclesStore.vehicles.length > 0">
      <select v-model="selectedVehicleId" class="form-input">
        <option :value="null">全部車輛</option>
        <option v-for="v in vehiclesStore.vehicles" :key="v.id" :value="v.id">
          {{ v.type === 'car' ? '🚗' : '🏍️' }} {{ v.name }}
        </option>
      </select>
    </div>

    <!-- No vehicles -->
    <div v-if="vehiclesStore.vehicles.length === 0" class="empty-state">
      <div class="empty-icon">🚗</div>
      <p>尚未新增車輛</p>
      <p class="empty-sub">請先至「車輛管理」新增車輛</p>
    </div>

    <template v-else>
      <!-- Stats cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">車輛數量</div>
          <div class="stat-value">{{ vehicleCount }}</div>
          <div class="stat-unit">輛</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">加油次數</div>
          <div class="stat-value">{{ fuelCount }}</div>
          <div class="stat-unit">次</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">保養次數</div>
          <div class="stat-value">{{ maintenanceCount }}</div>
          <div class="stat-unit">次</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">本月花費</div>
          <div class="stat-value">{{ monthlySpend.toLocaleString() }}</div>
          <div class="stat-unit">元</div>
        </div>
      </div>

      <!-- Fuel efficiency -->
      <div class="card mb-4" v-if="selectedVehicle">
        <div class="card-title">⛽ 平均油耗</div>
        <div class="efficiency-row">
          <div class="efficiency-main">
            {{ avgFuelEfficiency > 0 ? avgFuelEfficiency.toFixed(2) : '--' }}
            <span class="efficiency-unit">公里/公升</span>
          </div>
        </div>
        <div class="mileage-row">
          目前里程: <strong>{{ (selectedVehicle.currentMileage || selectedVehicle.initialMileage || 0).toLocaleString() }}</strong> 公里
        </div>
      </div>

      <!-- Upcoming maintenance -->
      <div class="card mb-4" v-if="upcomingMaintenance.length > 0">
        <div class="card-title">🔧 保養提醒</div>
        <div v-for="item in upcomingMaintenance" :key="item.itemName" class="maintenance-item">
          <span :class="['maintenance-badge', item.type === 'danger' ? 'badge-danger' : 'badge-warning']">
            {{ item.type === 'danger' ? '⚠️ 需要保養' : '⏳ 即將到期' }}
          </span>
          <span class="maintenance-name">{{ item.itemName }}</span>
          <span class="maintenance-next">下次: {{ item.nextMileage?.toLocaleString() }} 公里</span>
        </div>
      </div>

      <!-- Recent fuel records -->
      <div class="card mb-4">
        <div class="card-title">⛽ 最近加油記錄</div>
        <div v-if="recentFuel.length === 0" class="no-records">暫無記錄</div>
        <div v-for="r in recentFuel" :key="r.id" class="record-item">
          <div class="record-date">{{ formatDate(r.date) }}</div>
          <div class="record-info">{{ r.liters }}L × ${{ r.pricePerLiter }}/L</div>
          <div class="record-cost">${{ r.totalCost?.toLocaleString() }}</div>
        </div>
      </div>

      <!-- Recent maintenance -->
      <div class="card">
        <div class="card-title">🔧 最近保養記錄</div>
        <div v-if="recentMaintenance.length === 0" class="no-records">暫無記錄</div>
        <div v-for="r in recentMaintenance" :key="r.id" class="record-item">
          <div class="record-date">{{ formatDate(r.date) }}</div>
          <div class="record-info">{{ r.itemName }}</div>
          <div class="record-next" v-if="r.nextMileage">下次: {{ r.nextMileage.toLocaleString() }} 公里</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useVehiclesStore } from '../stores/vehicles'
import { useFuelRecordsStore } from '../stores/fuelRecords'
import { useMaintenanceStore } from '../stores/maintenance'
import { useAuthStore } from '../stores/auth'
import { db } from '../db'

const authStore = useAuthStore()
const vehiclesStore = useVehiclesStore()
const fuelStore = useFuelRecordsStore()
const maintenanceStore = useMaintenanceStore()

const selectedVehicleId = ref(null)

const selectedVehicle = computed(() =>
  selectedVehicleId.value
    ? vehiclesStore.vehicles.find((v) => v.id === selectedVehicleId.value)
    : null
)

const vehicleCount = computed(() => vehiclesStore.vehicles.length)

const fuelCount = computed(() => {
  if (!selectedVehicleId.value) return fuelStore.records.length
  return fuelStore.records.filter((r) => r.vehicleId === selectedVehicleId.value).length
})

const maintenanceCount = computed(() => {
  if (!selectedVehicleId.value) return maintenanceStore.records.length
  return maintenanceStore.records.filter((r) => r.vehicleId === selectedVehicleId.value).length
})

const monthlySpend = computed(() => {
  const now = new Date()
  const records = selectedVehicleId.value
    ? fuelStore.records.filter((r) => r.vehicleId === selectedVehicleId.value)
    : fuelStore.records
  const mainRecords = selectedVehicleId.value
    ? maintenanceStore.records.filter((r) => r.vehicleId === selectedVehicleId.value)
    : maintenanceStore.records
  const fuelSpend = records
    .filter((r) => new Date(r.date).getMonth() === now.getMonth())
    .reduce((sum, r) => sum + (r.totalCost || 0), 0)
  const mainSpend = mainRecords
    .filter((r) => new Date(r.date).getMonth() === now.getMonth())
    .reduce((sum, r) => sum + (r.cost || 0), 0)
  return fuelSpend + mainSpend
})

const avgFuelEfficiency = computed(() => {
  if (!selectedVehicleId.value) return 0
  const records = fuelStore.records
    .filter((r) => r.vehicleId === selectedVehicleId.value)
    .sort((a, b) => a.mileage - b.mileage)
  if (records.length < 2) return 0
  const totalKm = records[records.length - 1].mileage - records[0].mileage
  const totalLiters = records.slice(1).reduce((sum, r) => sum + r.liters, 0)
  return totalLiters > 0 ? totalKm / totalLiters : 0
})

const recentFuel = computed(() => {
  const records = selectedVehicleId.value
    ? fuelStore.records.filter((r) => r.vehicleId === selectedVehicleId.value)
    : fuelStore.records
  return records.slice(0, 5)
})

const recentMaintenance = computed(() => {
  const records = selectedVehicleId.value
    ? maintenanceStore.records.filter((r) => r.vehicleId === selectedVehicleId.value)
    : maintenanceStore.records
  return records.slice(0, 5)
})

const upcomingMaintenance = computed(() => {
  if (!selectedVehicle.value) return []
  const currentMileage = selectedVehicle.value.currentMileage || selectedVehicle.value.initialMileage || 0
  const alerts = []
  const itemsForVehicle = maintenanceStore.items.filter(
    (i) => i.vehicleType === selectedVehicle.value.type
  )
  for (const item of itemsForVehicle) {
    const lastRecord = maintenanceStore.records
      .filter((r) => r.vehicleId === selectedVehicleId.value && r.itemName === item.itemName)
      .sort((a, b) => b.mileage - a.mileage)[0]
    if (lastRecord && lastRecord.nextMileage) {
      const diff = lastRecord.nextMileage - currentMileage
      if (diff <= 0) {
        alerts.push({ type: 'danger', itemName: item.itemName, nextMileage: lastRecord.nextMileage })
      } else if (diff <= 500) {
        alerts.push({ type: 'warning', itemName: item.itemName, nextMileage: lastRecord.nextMileage })
      }
    }
  }
  return alerts
})

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

async function loadData() {
  await vehiclesStore.fetchVehicles()
  await fuelStore.fetchRecords()
  await maintenanceStore.fetchRecords()
  await maintenanceStore.fetchItems()
}

onMounted(loadData)
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stat-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 1rem;
  text-align: center;
  box-shadow: var(--shadow);
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #3b82f6;
  line-height: 1;
}

.stat-unit {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin-top: 0.125rem;
}

.card-title {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.efficiency-row {
  margin-bottom: 0.5rem;
}

.efficiency-main {
  font-size: 2rem;
  font-weight: 700;
  color: #10b981;
}

.efficiency-unit {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 400;
}

.mileage-row {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.maintenance-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.maintenance-item:last-child {
  border-bottom: none;
}

.maintenance-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  font-weight: 600;
}

.badge-danger {
  background: #fee2e2;
  color: #b91c1c;
}

.badge-warning {
  background: #fef3c7;
  color: #92400e;
}

.maintenance-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.maintenance-next {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-left: auto;
}

.record-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
  gap: 0.5rem;
  font-size: 0.9rem;
}

.record-item:last-child {
  border-bottom: none;
}

.record-date {
  color: var(--text-secondary);
  font-size: 0.8125rem;
  min-width: 5.5rem;
}

.record-info {
  flex: 1;
  color: var(--text-primary);
}

.record-cost {
  font-weight: 600;
  color: #3b82f6;
}

.record-next {
  font-size: 0.8rem;
  color: var(--text-secondary);
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

.no-records {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.875rem;
  padding: 0.75rem 0;
}

.mb-4 {
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 0;
}
</style>
