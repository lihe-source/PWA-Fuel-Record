import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db.js'
import { useAuthStore } from './auth.js'

export const useMaintenanceStore = defineStore('maintenance', () => {
  const records = ref([])
  const items = ref([])

  async function fetchRecords(vehicleId) {
    const authStore = useAuthStore()
    if (!authStore.user) return
    const all = await db.maintenanceRecords.where('userId').equals(authStore.user.uid).toArray()
    if (vehicleId) {
      records.value = all.filter(r => r.vehicleId === vehicleId).sort((a, b) => new Date(b.date) - new Date(a.date))
    } else {
      records.value = all.sort((a, b) => new Date(b.date) - new Date(a.date))
    }
  }

  async function addRecord(data) {
    const authStore = useAuthStore()
    const id = await db.maintenanceRecords.add({
      ...data,
      userId: authStore.user.uid,
      createdAt: new Date().toISOString()
    })
    await fetchRecords(data.vehicleId)
    return id
  }

  async function updateRecord(id, data) {
    await db.maintenanceRecords.update(id, data)
    await fetchRecords(data.vehicleId)
  }

  async function deleteRecord(id, vehicleId) {
    await db.maintenanceRecords.delete(id)
    await fetchRecords(vehicleId)
  }

  async function fetchItems(vehicleType) {
    const authStore = useAuthStore()
    if (!authStore.user) return
    if (vehicleType) {
      items.value = await db.maintenanceItems
        .where('userId').equals(authStore.user.uid)
        .and(item => item.vehicleType === vehicleType)
        .toArray()
    } else {
      items.value = await db.maintenanceItems.where('userId').equals(authStore.user.uid).toArray()
    }
  }

  async function addItem(data) {
    const authStore = useAuthStore()
    const id = await db.maintenanceItems.add({
      ...data,
      userId: authStore.user.uid
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

  async function checkMaintenanceAlerts(vehicleId, currentMileage) {
    const vehicle = await db.vehicles.get(vehicleId)
    if (!vehicle) return []
    const authStore = useAuthStore()
    const itemsList = await db.maintenanceItems
      .where('userId').equals(authStore.user.uid)
      .and(item => item.vehicleType === vehicle.type)
      .toArray()
    const alerts = []
    for (const item of itemsList) {
      const allRecords = await db.maintenanceRecords
        .where('vehicleId').equals(vehicleId)
        .and(r => r.itemName === item.itemName)
        .toArray()
      allRecords.sort((a, b) => b.mileage - a.mileage)
      const lastRecord = allRecords[0]
      if (lastRecord) {
        const nextMileage = lastRecord.mileage + item.intervalKm
        if (currentMileage >= nextMileage) {
          alerts.push({ type: 'overdue', item: item.itemName, nextMileage })
        } else if (nextMileage - currentMileage <= 500) {
          alerts.push({ type: 'warning', item: item.itemName, nextMileage })
        }
      }
    }
    return alerts
  }

  async function ensureDefaultItems(userId) {
    const existing = await db.maintenanceItems.where('userId').equals(userId).count()
    if (existing > 0) return

    const defaults = [
      { vehicleType: '汽車', itemName: '機油更換', intervalKm: 5000, notes: '定期更換機油' },
      { vehicleType: '汽車', itemName: '空氣濾清器', intervalKm: 20000, notes: '定期更換空氣濾清器' },
      { vehicleType: '汽車', itemName: '火星塞', intervalKm: 30000, notes: '定期更換火星塞' },
      { vehicleType: '汽車', itemName: '煞車油', intervalKm: 40000, notes: '定期更換煞車油' },
      { vehicleType: '汽車', itemName: '變速箱油', intervalKm: 60000, notes: '定期更換變速箱油' },
      { vehicleType: '機車', itemName: '機油更換', intervalKm: 3000, notes: '定期更換機油' },
      { vehicleType: '機車', itemName: '空氣濾清器', intervalKm: 10000, notes: '定期更換空氣濾清器' },
      { vehicleType: '機車', itemName: '火星塞', intervalKm: 10000, notes: '定期更換火星塞' },
      { vehicleType: '機車', itemName: '煞車皮', intervalKm: 15000, notes: '定期更換煞車皮' },
      { vehicleType: '機車', itemName: '傳動皮帶', intervalKm: 20000, notes: '定期更換傳動皮帶' }
    ]
    for (const item of defaults) {
      await db.maintenanceItems.add({ ...item, userId })
    }
  }

  return {
    records, items,
    fetchRecords, addRecord, updateRecord, deleteRecord,
    fetchItems, addItem, updateItem, deleteItem,
    checkMaintenanceAlerts, ensureDefaultItems
  }
})
