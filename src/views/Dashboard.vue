<template>
  <div id="app">
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">總覽</h1>
        <span class="badge badge-blue">{{ vehicles.length }} 台車輛</span>
      </div>

      <div v-if="vehicles.length === 0" class="empty-state">
        <div class="emoji">🚗</div>
        <p>尚未添加任何車輛</p>
        <RouterLink to="/vehicles" class="btn btn-primary" style="margin-top:16px;text-decoration:none">新增車輛</RouterLink>
      </div>

      <template v-else>
        <div class="stat-grid">
          <div class="stat-box">
            <div class="stat-value">{{ totalFuelCost.toLocaleString() }}</div>
            <div class="stat-label">總油費 (元)</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">{{ totalMaintCost.toLocaleString() }}</div>
            <div class="stat-label">總保養費 (元)</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">{{ totalLiters.toFixed(1) }}</div>
            <div class="stat-label">總加油量 (公升)</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">{{ avgConsumption }}</div>
            <div class="stat-label">平均油耗 (km/L)</div>
          </div>
        </div>

        <div v-if="maintenanceAlerts.length" class="card" style="border-color:var(--warning)">
          <h3 style="font-size:15px;margin-bottom:10px;color:var(--warning)">⚠️ 保養提醒</h3>
          <MaintenanceAlert :alerts="maintenanceAlerts" />
        </div>

        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:var(--text-primary)">我的車輛</h2>
        <VehicleCard
          v-for="v in vehicles"
          :key="v.id"
          :vehicle="v"
          :next-services="nextServicesMap[v.id] || []"
          @edit="() => {}"
          @delete="() => {}"
        />

        <h2 style="font-size:16px;font-weight:700;margin:16px 0 12px;color:var(--text-primary)">最近加油紀錄</h2>
        <div v-if="recentFuel.length === 0" class="empty-state" style="padding:20px">
          <p>尚無加油紀錄</p>
        </div>
        <div v-else class="card">
          <div class="record-item" v-for="r in recentFuel" :key="r.id">
            <div class="record-main">
              <div class="record-title">{{ getVehicleName(r.vehicleId) }}</div>
              <div class="record-sub">{{ formatDate(r.date) }} · {{ r.mileage?.toLocaleString() }} km · {{ r.liters }} L</div>
            </div>
            <div class="record-cost">NT${{ r.totalCost?.toLocaleString() }}</div>
          </div>
        </div>
      </template>
    </div>
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import BottomNav from '../components/BottomNav.vue'
import VehicleCard from '../components/VehicleCard.vue'
import MaintenanceAlert from '../components/MaintenanceAlert.vue'
import { useVehiclesStore } from '../stores/vehicles'
import { useFuelRecordsStore } from '../stores/fuelRecords'
import { useMaintenanceStore } from '../stores/maintenance'

const vehiclesStore = useVehiclesStore()
const fuelStore = useFuelRecordsStore()
const maintStore = useMaintenanceStore()

const vehicles = computed(() => vehiclesStore.vehicles)
const allFuelRecords = ref([])
const allMaintRecords = ref([])
const maintenanceAlerts = ref([])
const nextServicesMap = ref({})

onMounted(async () => {
  await vehiclesStore.loadVehicles()
  await fuelStore.loadRecords()
  await maintStore.loadRecords()
  await maintStore.loadItems()
  allFuelRecords.value = fuelStore.records
  allMaintRecords.value = maintStore.records
  await loadAlerts()
  await loadNextServices()
})

async function loadAlerts() {
  const alerts = []
  for (const v of vehicles.value) {
    const mileage = v.currentMileage || v.initialMileage || 0
    const va = await fuelStore.checkMaintenanceAlerts(v.id, mileage)
    alerts.push(...va)
  }
  maintenanceAlerts.value = alerts
}

async function loadNextServices() {
  const map = {}
  for (const v of vehicles.value) {
    const items = maintStore.items.filter(i => i.vehicleType === v.type)
    const svcs = []
    for (const item of items) {
      const next = await maintStore.getNextServiceMileage(v.id, item.itemName)
      if (next) svcs.push({ name: item.itemName, nextMileage: next })
    }
    map[v.id] = svcs
  }
  nextServicesMap.value = map
}

const recentFuel = computed(() => allFuelRecords.value.slice(0, 5))
const totalFuelCost = computed(() => allFuelRecords.value.reduce((s, r) => s + (r.totalCost || 0), 0))
const totalMaintCost = computed(() => allMaintRecords.value.reduce((s, r) => s + (r.cost || 0), 0))
const totalLiters = computed(() => allFuelRecords.value.reduce((s, r) => s + (r.liters || 0), 0))

const avgConsumption = computed(() => {
  if (allFuelRecords.value.length < 2) return '-'
  const sorted = [...allFuelRecords.value].sort((a, b) => (a.mileage || 0) - (b.mileage || 0))
  const totalKm = (sorted[sorted.length - 1].mileage || 0) - (sorted[0].mileage || 0)
  const totalL = sorted.slice(1).reduce((s, r) => s + (r.liters || 0), 0)
  if (!totalL) return '-'
  return (totalKm / totalL).toFixed(1)
})

function getVehicleName(id) {
  return vehicles.value.find(v => v.id === id)?.name || '未知車輛'
}

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}
</script>
