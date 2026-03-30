import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db'
import { useAuthStore } from './auth'

export const useMaintenanceStore = defineStore('maintenance', () => {
  const records = ref([])
  const items = ref([])
  const loading = ref(false)

  function getUserId() {
    const auth = useAuthStore()
    return auth.currentUser?.uid || 'local'
  }

  async function loadRecords(vehicleId = null) {
    loading.value = true
    try {
      let all = await db.maintenanceRecords.where('userId').equals(getUserId()).toArray()
      if (vehicleId) all = all.filter(r => r.vehicleId === vehicleId)
      records.value = all.sort((a, b) => new Date(b.date) - new Date(a.date))
    } finally {
      loading.value = false
    }
  }

  async function addRecord(data) {
    const id = await db.maintenanceRecords.add({
      ...data,
      userId: getUserId(),
      nextMileage: data.nextMileage || (data.mileage + (data.intervalKm || 0)),
      createdAt: new Date()
    })
    const vehicle = await db.vehicles.get(data.vehicleId)
    if (vehicle && data.mileage > (vehicle.currentMileage || 0)) {
      await db.vehicles.update(data.vehicleId, { currentMileage: data.mileage })
    }
    return id
  }

  async function updateRecord(id, data) {
    await db.maintenanceRecords.update(id, data)
  }

  async function deleteRecord(id) {
    await db.maintenanceRecords.delete(id)
  }

  async function loadItems() {
    items.value = await db.maintenanceItems.where('userId').equals(getUserId()).toArray()
  }

  async function addItem(data) {
    await db.maintenanceItems.add({ ...data, userId: getUserId() })
    await loadItems()
  }

  async function updateItem(id, data) {
    await db.maintenanceItems.update(id, data)
    await loadItems()
  }

  async function deleteItem(id) {
    await db.maintenanceItems.delete(id)
    await loadItems()
  }

  async function getNextServiceMileage(vehicleId, itemName) {
    const userId = getUserId()
    const vehicle = await db.vehicles.get(vehicleId)
    if (!vehicle) return null
    const item = await db.maintenanceItems
      .where('userId').equals(userId)
      .filter(i => i.itemName === itemName && i.vehicleType === vehicle.type)
      .first()
    if (!item) return null
    const lastRecords = await db.maintenanceRecords
      .where('userId').equals(userId)
      .filter(r => r.vehicleId === vehicleId && r.itemName === itemName)
      .toArray()
    lastRecords.sort((a, b) => (b.mileage || 0) - (a.mileage || 0))
    const last = lastRecords[0]
    return last ? last.mileage + item.intervalKm : vehicle.initialMileage + item.intervalKm
  }

  return { records, items, loading, loadRecords, addRecord, updateRecord, deleteRecord, loadItems, addItem, updateItem, deleteItem, getNextServiceMileage }
})
