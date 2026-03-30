<template>
  <div class="card vehicle-card">
    <div class="vehicle-header">
      <span class="vehicle-icon">{{ vehicle.type === 'car' ? '🚗' : '🏍️' }}</span>
      <div class="vehicle-info">
        <div class="vehicle-name">{{ vehicle.name }}</div>
        <div class="vehicle-plate">{{ vehicle.plate }}</div>
      </div>
      <div class="vehicle-actions">
        <button class="btn-icon" @click="emit('edit', vehicle)">✏️</button>
        <button class="btn-icon" @click="emit('delete', vehicle)">🗑️</button>
      </div>
    </div>
    <div class="divider"></div>
    <div class="vehicle-mileage">
      <span class="mileage-label">目前里程</span>
      <span class="mileage-value">{{ (vehicle.currentMileage || vehicle.initialMileage || 0).toLocaleString() }} km</span>
    </div>
    <div v-if="nextServices.length" class="vehicle-services">
      <div v-for="svc in nextServices" :key="svc.name" class="next-service-badge">
        🔧 {{ svc.name }}: {{ svc.nextMileage.toLocaleString() }} km
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  vehicle: Object,
  nextServices: { type: Array, default: () => [] }
})
const emit = defineEmits(['edit', 'delete'])
</script>

<style scoped>
.vehicle-header { display: flex; align-items: center; gap: 10px; }
.vehicle-icon { font-size: 28px; }
.vehicle-info { flex: 1; }
.vehicle-name { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.vehicle-plate { font-size: 13px; color: var(--text-secondary); }
.vehicle-actions { display: flex; gap: 4px; }
.vehicle-mileage { display: flex; justify-content: space-between; align-items: center; }
.mileage-label { font-size: 13px; color: var(--text-secondary); }
.mileage-value { font-size: 16px; font-weight: 700; color: var(--accent); }
.vehicle-services { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
</style>
