<template>
  <div class="min-h-screen pb-20" style="background: var(--bg-secondary)">
    <div class="p-4 max-w-lg mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4 pt-2">
        <h1 class="text-xl font-bold" style="color: var(--text-primary)">儀表板</h1>
        <select
          v-if="vehiclesStore.vehicles.length > 1"
          v-model="selectedVehicleId"
          @change="onVehicleChange"
          class="text-sm rounded-lg px-3 py-1.5 border outline-none"
          style="background: var(--bg-primary); border-color: var(--border-color); color: var(--text-primary)"
        >
          <option v-for="v in vehiclesStore.vehicles" :key="v.id" :value="v.id">{{ v.name }}</option>
        </select>
        <div v-else-if="vehiclesStore.vehicles.length === 1" class="text-sm font-medium" style="color: var(--text-secondary)">
          {{ vehiclesStore.vehicles[0].name }}
        </div>
      </div>

      <!-- No vehicle state -->
      <div v-if="vehiclesStore.vehicles.length === 0" class="text-center py-16">
        <div class="text-5xl mb-4">🚗</div>
        <p class="font-medium mb-2" style="color: var(--text-primary)">尚未新增車輛</p>
        <p class="text-sm mb-4" style="color: var(--text-secondary)">請先前往車輛管理新增您的車輛</p>
        <router-link to="/vehicles" class="px-4 py-2 rounded-lg text-sm text-white" style="background: var(--accent)">
          前往車輛管理
        </router-link>
      </div>

      <template v-else>
        <!-- Stats Grid -->
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="rounded-xl p-4" style="background: var(--bg-primary); border: 1px solid var(--border-color)">
            <p class="text-xs mb-1" style="color: var(--text-secondary)">加油次數</p>
            <p class="text-2xl font-bold" style="color: var(--text-primary)">{{ stats.fuelCount }}</p>
            <p class="text-xs mt-1" style="color: var(--text-secondary)">次</p>
          </div>
          <div class="rounded-xl p-4" style="background: var(--bg-primary); border: 1px solid var(--border-color)">
            <p class="text-xs mb-1" style="color: var(--text-secondary)">總行駛里程</p>
            <p class="text-2xl font-bold" style="color: var(--text-primary)">{{ stats.totalDistance.toLocaleString() }}</p>
            <p class="text-xs mt-1" style="color: var(--text-secondary)">km</p>
          </div>
          <div class="rounded-xl p-4" style="background: var(--bg-primary); border: 1px solid var(--border-color)">
            <p class="text-xs mb-1" style="color: var(--text-secondary)">平均油耗</p>
            <p class="text-2xl font-bold" style="color: var(--text-primary)">{{ stats.avgConsumption }}</p>
            <p class="text-xs mt-1" style="color: var(--text-secondary)">km/L</p>
          </div>
          <div class="rounded-xl p-4" style="background: var(--bg-primary); border: 1px solid var(--border-color)">
            <p class="text-xs mb-1" style="color: var(--text-secondary)">總費用</p>
            <p class="text-2xl font-bold" style="color: var(--text-primary)">{{ stats.totalCost.toLocaleString() }}</p>
            <p class="text-xs mt-1" style="color: var(--text-secondary)">元</p>
          </div>
        </div>

        <!-- Recent Fuel Records -->
        <div class="rounded-xl p-4" style="background: var(--bg-primary); border: 1px solid var(--border-color)">
          <h2 class="font-semibold mb-3" style="color: var(--text-primary)">最近加油紀錄</h2>
          <div v-if="recentRecords.length === 0" class="text-sm text-center py-4" style="color: var(--text-secondary)">
            尚無加油紀錄
          </div>
          <div v-for="record in recentRecords" :key="record.id" class="flex items-center justify-between py-2 border-b last:border-0" style="border-color: var(--border-color)">
            <div>
              <p class="text-sm font-medium" style="color: var(--text-primary)">{{ record.date }}</p>
              <p class="text-xs" style="color: var(--text-secondary)">{{ record.mileage?.toLocaleString() }} km ｜ {{ record.liters }} L</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold" style="color: var(--accent)">NT$ {{ record.totalCost?.toLocaleString() }}</p>
              <p class="text-xs" style="color: var(--text-secondary)">{{ record.pricePerLiter }} 元/L</p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useVehiclesStore } from '../stores/vehicles.js'
import { useFuelRecordsStore } from '../stores/fuelRecords.js'

const vehiclesStore = useVehiclesStore()
const fuelRecordsStore = useFuelRecordsStore()
const selectedVehicleId = ref(null)

const recentRecords = computed(() => fuelRecordsStore.records.slice(0, 5))

const stats = computed(() => {
  const r = fuelRecordsStore.records
  const fuelCount = r.length
  const totalCost = r.reduce((sum, x) => sum + (x.totalCost || 0), 0)
  const totalLiters = r.reduce((sum, x) => sum + (x.liters || 0), 0)
  const vehicle = vehiclesStore.vehicles.find(v => v.id === selectedVehicleId.value)
  const totalDistance = vehicle
    ? (vehicle.currentMileage || 0) - (vehicle.initialMileage || 0)
    : 0
  const avgConsumption = totalLiters > 0 ? (totalDistance / totalLiters).toFixed(1) : '--'
  return { fuelCount, totalCost, totalDistance, avgConsumption }
})

async function onVehicleChange() {
  await fuelRecordsStore.fetchRecords(selectedVehicleId.value)
}

onMounted(async () => {
  await vehiclesStore.fetchVehicles()
  if (vehiclesStore.vehicles.length > 0) {
    selectedVehicleId.value = vehiclesStore.vehicles[0].id
    await fuelRecordsStore.fetchRecords(selectedVehicleId.value)
  }
})
</script>
