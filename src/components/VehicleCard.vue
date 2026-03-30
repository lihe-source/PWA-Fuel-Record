<template>
  <div class="vehicle-card">
    <div class="vehicle-info">
      <span class="vehicle-type-icon">{{ vehicle.type === 'car' ? '🚗' : '🏍️' }}</span>
      <div class="vehicle-details">
        <div class="vehicle-name">{{ vehicle.name }}</div>
        <div class="vehicle-plate">{{ vehicle.plate }}</div>
        <div class="vehicle-mileage">里程: {{ (vehicle.currentMileage || vehicle.initialMileage || 0).toLocaleString() }} 公里</div>
      </div>
    </div>
    <div class="vehicle-actions">
      <button class="action-btn edit-btn" @click="$emit('edit', vehicle)">✏️</button>
      <button class="action-btn delete-btn" @click="$emit('delete', vehicle)">🗑️</button>
    </div>
  </div>
</template>

<script setup>
defineProps({ vehicle: Object })
defineEmits(['edit', 'delete'])
</script>

<style scoped>
.vehicle-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  box-shadow: var(--shadow);
}

.vehicle-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.vehicle-type-icon {
  font-size: 2rem;
}

.vehicle-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-primary);
}

.vehicle-plate {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.125rem;
}

.vehicle-mileage {
  font-size: 0.8125rem;
  color: #3b82f6;
  margin-top: 0.125rem;
}

.vehicle-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.375rem;
  border-radius: 0.5rem;
  transition: background-color 0.15s;
}

.action-btn:hover {
  background-color: var(--bg-secondary);
}
</style>
