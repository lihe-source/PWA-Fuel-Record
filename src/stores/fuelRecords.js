import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db.js'
import { useAuthStore } from './auth.js'

export const useFuelRecordsStore = defineStore('fuelRecords', () => {
  const records = ref([])

  async function fetchRecords(vehicleId) {
    const authStore = useAuthStore()
    if (!authStore.user) return
    let query = db.fuelRecords.where('userId').equals(authStore.user.uid)
    const all = await query.toArray()
    if (vehicleId) {
      records.value = all.filter(r => r.vehicleId === vehicleId).sort((a, b) => new Date(b.date) - new Date(a.date))
    } else {
      records.value = all.sort((a, b) => new Date(b.date) - new Date(a.date))
    }
  }

  async function addRecord(data) {
    const authStore = useAuthStore()
    const id = await db.fuelRecords.add({
      ...data,
      userId: authStore.user.uid,
      createdAt: new Date().toISOString()
    })
    await fetchRecords(data.vehicleId)
    return id
  }

  async function updateRecord(id, data) {
    await db.fuelRecords.update(id, data)
    await fetchRecords(data.vehicleId)
  }

  async function deleteRecord(id, vehicleId) {
    await db.fuelRecords.delete(id)
    await fetchRecords(vehicleId)
  }

  async function getAllRecordsByUser() {
    const authStore = useAuthStore()
    if (!authStore.user) return []
    return await db.fuelRecords.where('userId').equals(authStore.user.uid).toArray()
  }

  return { records, fetchRecords, addRecord, updateRecord, deleteRecord, getAllRecordsByUser }
})
