import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db'
import { useAuthStore } from './auth'

export const useVehiclesStore = defineStore('vehicles', () => {
  const vehicles = ref([])

  async function fetchVehicles() {
    const authStore = useAuthStore()
    if (!authStore.user) return
    vehicles.value = await db.vehicles
      .where('userId')
      .equals(authStore.user.uid)
      .toArray()
  }

  async function addVehicle(data) {
    const authStore = useAuthStore()
    const id = await db.vehicles.add({
      ...data,
      userId: authStore.user.uid,
      createdAt: new Date(),
    })
    await fetchVehicles()
    return id
  }

  async function updateVehicle(id, data) {
    await db.vehicles.update(id, data)
    await fetchVehicles()
  }

  async function deleteVehicle(id) {
    await db.vehicles.delete(id)
    await fetchVehicles()
  }

  async function updateMileage(vehicleId, mileage) {
    const vehicle = vehicles.value.find((v) => v.id === vehicleId)
    if (vehicle && mileage > (vehicle.currentMileage || vehicle.initialMileage || 0)) {
      await db.vehicles.update(vehicleId, { currentMileage: mileage })
      await fetchVehicles()
    }
  }

  return { vehicles, fetchVehicles, addVehicle, updateVehicle, deleteVehicle, updateMileage }
})
