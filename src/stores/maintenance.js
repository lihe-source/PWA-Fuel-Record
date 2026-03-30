import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db'
import { useAuthStore } from './auth'
import { useVehiclesStore } from './vehicles'

export const useMaintenanceStore = defineStore('maintenance', () => {
  const records = ref([])
  const items = ref([])

  async function fetchRecords(vehicleId = null) {
    const authStore = useAuthStore()
    if (!authStore.user) return
    const all = await db.maintenanceRecords.where('userId').equals(authStore.user.uid).toArray()
    records.value = vehicleId ? all.filter((r) => r.vehicleId === vehicleId) : all
    records.value.sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  async function addRecord(data) {
    const authStore = useAuthStore()
    // Find interval for this item
    const vehiclesStore = useVehiclesStore()
    const vehicle = vehiclesStore.vehicles.find((v) => v.id === data.vehicleId)
    let nextMileage = null
    if (vehicle) {
      const item = await db.maintenanceItems
        .where('userId')
        .equals(authStore.user.uid)
        .filter((i) => i.vehicleType === vehicle.type && i.itemName === data.itemName)
        .first()
      if (item) {
        nextMileage = data.mileage + item.intervalKm
      }
    }

    const id = await db.maintenanceRecords.add({
      ...data,
      nextMileage,
      userId: authStore.user.uid,
      createdAt: new Date(),
    })
    // Update vehicle mileage
    await vehiclesStore.updateMileage(data.vehicleId, data.mileage)
    await fetchRecords()
    return id
  }

  async function updateRecord(id, data) {
    await db.maintenanceRecords.update(id, data)
    await fetchRecords()
  }

  async function deleteRecord(id) {
    await db.maintenanceRecords.delete(id)
    await fetchRecords()
  }

  async function fetchItems() {
    const authStore = useAuthStore()
    if (!authStore.user) return
    items.value = await db.maintenanceItems.where('userId').equals(authStore.user.uid).toArray()
  }

  async function addItem(data) {
    const authStore = useAuthStore()
    const id = await db.maintenanceItems.add({
      ...data,
      userId: authStore.user.uid,
    })
    await fetchItems()
    return id
  }

  async function updateItem(id, data) {
    await db.maintenanceItems.update(id, data)
    await fetchItems()
  }

  async function deleteItem(id) {
    await db.maintenanceItems.delete(id)
    await fetchItems()
  }

  return {
    records, items,
    fetchRecords, addRecord, updateRecord, deleteRecord,
    fetchItems, addItem, updateItem, deleteItem,
  }
})
