import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db'
import { useAuthStore } from './auth'

export const useVehiclesStore = defineStore('vehicles', () => {
  const vehicles = ref([])
  const loading = ref(false)

  function getUserId() {
    const auth = useAuthStore()
    return auth.currentUser?.uid || 'local'
  }

  async function loadVehicles() {
    loading.value = true
    try {
      vehicles.value = await db.vehicles.where('userId').equals(getUserId()).toArray()
    } finally {
      loading.value = false
    }
  }

  async function addVehicle(data) {
    const id = await db.vehicles.add({
      ...data,
      userId: getUserId(),
      currentMileage: data.initialMileage || 0,
      createdAt: new Date()
    })
    await loadVehicles()
    return id
  }

  async function updateVehicle(id, data) {
    await db.vehicles.update(id, data)
    await loadVehicles()
  }

  async function deleteVehicle(id) {
    await db.vehicles.delete(id)
    await loadVehicles()
  }

  return { vehicles, loading, loadVehicles, addVehicle, updateVehicle, deleteVehicle }
})
