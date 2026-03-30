import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db'
import { useAuthStore } from './auth'

export const useFuelRecordsStore = defineStore('fuelRecords', () => {
  const records = ref([])
  const loading = ref(false)

  function getUserId() {
    const auth = useAuthStore()
    return auth.currentUser?.uid || 'local'
  }

  async function loadRecords(vehicleId = null) {
    loading.value = true
    try {
      let query = db.fuelRecords.where('userId').equals(getUserId())
      let all = await query.toArray()
      if (vehicleId) all = all.filter(r => r.vehicleId === vehicleId)
      records.value = all.sort((a, b) => new Date(b.date) - new Date(a.date))
    } finally {
      loading.value = false
    }
  }

  async function addRecord(data) {
    const id = await db.fuelRecords.add({
      ...data,
      userId: getUserId(),
      createdAt: new Date()
    })
    // update vehicle mileage
    const vehicle = await db.vehicles.get(data.vehicleId)
    if (vehicle && data.mileage > (vehicle.currentMileage || 0)) {
      await db.vehicles.update(data.vehicleId, { currentMileage: data.mileage })
    }
    return id
  }

  async function updateRecord(id, data) {
    await db.fuelRecords.update(id, data)
  }

  async function deleteRecord(id) {
    await db.fuelRecords.delete(id)
  }

  async function checkMaintenanceAlerts(vehicleId, mileage) {
    const alerts = []
    const userId = getUserId()
    const vehicle = await db.vehicles.get(vehicleId)
    if (!vehicle) return alerts

    const maintItems = await db.maintenanceItems
      .where('userId').equals(userId)
      .filter(i => i.vehicleType === vehicle.type)
      .toArray()

    for (const item of maintItems) {
      const lastRecord = await db.maintenanceRecords
        .where('userId').equals(userId)
        .filter(r => r.vehicleId === vehicleId && r.itemName === item.itemName)
        .toArray()
      lastRecord.sort((a, b) => (b.mileage || 0) - (a.mileage || 0))
      const last = lastRecord[0]
      const nextMileage = last ? (last.mileage + item.intervalKm) : (vehicle.initialMileage + item.intervalKm)
      if (mileage >= nextMileage) {
        alerts.push({ type: 'danger', message: `⚠️ 需要保養: ${item.itemName}（已超過 ${mileage - nextMileage} 公里）` })
      } else if (nextMileage - mileage <= 500) {
        alerts.push({ type: 'warning', message: `即將到期保養: ${item.itemName}（剩餘 ${nextMileage - mileage} 公里）` })
      }
    }
    return alerts
  }

  return { records, loading, loadRecords, addRecord, updateRecord, deleteRecord, checkMaintenanceAlerts }
})
