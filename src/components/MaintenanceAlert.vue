<template>
  <div v-if="alerts.length" class="maintenance-alerts">
    <div v-for="(alert, i) in alerts" :key="i" :class="['alert', alert.type === 'danger' ? 'alert-danger' : 'alert-warning']">
      {{ alert.message }}
    </div>
  </div>
</template>

<script setup>
defineProps({ alerts: { type: Array, default: () => [] } })
</script>
