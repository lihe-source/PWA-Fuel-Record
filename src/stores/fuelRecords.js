import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db'
import { useAuthStore } from './auth'
import { useMaintenanceStore } from './maintenance'
import { useVehiclesStore } from './vehicles'

export const useFuelRecordsStore = defineStore('fuelRecords', () => {
  const records = ref([])
  const maintenanceAlerts = ref([])

  async function fetchRecords(vehicleId = null) {
    const authStore = useAuthStore()
    if (!authStore.user) return
    let query = db.fuelRecords.where('userId').equals(authStore.user.uid)
    const all = await query.toArray()
    records.value = vehicleId ? all.filter((r) => r.vehicleId === vehicleId) : all
    records.value.sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  async function addRecord(data) {
    const authStore = useAuthStore()
    const id = await db.fuelRecords.add({
      ...data,
      userId: authStore.user.uid,
      createdAt: new Date(),
    })
    // Update vehicle mileage
    const vehiclesStore = useVehiclesStore()
    await vehiclesStore.updateMileage(data.vehicleId, data.mileage)
    // Check maintenance alerts
    await checkMaintenanceAlerts(data.vehicleId, data.mileage)
    await fetchRecords()
    return id
  }

  async function updateRecord(id, data) {
    await db.fuelRecords.update(id, data)
    await fetchRecords()
  }

  async function deleteRecord(id) {
    await db.fuelRecords.delete(id)
    await fetchRecords()
  }

  async function checkMaintenanceAlerts(vehicleId, currentMileage) {
    const maintenanceStore = useMaintenanceStore()
    const vehiclesStore = useVehiclesStore()
    const vehicle = vehiclesStore.vehicles.find((v) => v.id === vehicleId)
    if (!vehicle) return

    const authStore = useAuthStore()
    const items = await db.maintenanceItems
      .where('userId')
      .equals(authStore.user.uid)
      .filter((i) => i.vehicleType === vehicle.type)
      .toArray()

    const alerts = []
    for (const item of items) {
      // Find last maintenance record for this item + vehicle
      const lastRecord = await db.maintenanceRecords
        .where('userId')
        .equals(authStore.user.uid)
        .filter((r) => r.vehicleId === vehicleId && r.itemName === item.itemName)
        .toArray()
        .then((arr) => arr.sort((a, b) => b.mileage - a.mileage)[0])

      if (lastRecord && lastRecord.nextMileage) {
        const diff = lastRecord.nextMileage - currentMileage
        if (diff <= 0) {
          alerts.push({ type: 'danger', itemName: item.itemName, message: `⚠️ 需要保養: ${item.itemName}` })
        } else if (diff <= 500) {
          alerts.push({ type: 'warning', itemName: item.itemName, message: `即將到期保養: ${item.itemName} (還剩 ${diff} 公里)` })
        }
      }
    }
    maintenanceAlerts.value = alerts
  }

  return { records, maintenanceAlerts, fetchRecords, addRecord, updateRecord, deleteRecord, checkMaintenanceAlerts }
})
