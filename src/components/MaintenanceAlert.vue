<template>
  <div class="alerts-container">
    <div
      v-for="(alert, i) in alerts"
      :key="i"
      :class="['alert-item', alert.type === 'danger' ? 'alert-danger' : 'alert-warning']"
    >
      {{ alert.message }}
    </div>
  </div>
</template>

<script setup>
defineProps({ alerts: { type: Array, default: () => [] } })
</script>

<style scoped>
.alerts-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.alert-item {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
}
</style>
