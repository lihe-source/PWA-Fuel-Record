<template>
  <div v-if="alerts && alerts.length > 0" class="mb-4 space-y-2">
    <div
      v-for="(alert, index) in alerts"
      :key="index"
      class="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium"
      :class="alert.type === 'overdue'
        ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
        : 'bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'"
    >
      <span>⚠️</span>
      <span v-if="alert.type === 'overdue'">需要保養：{{ alert.item }}</span>
      <span v-else>即將到期保養：{{ alert.item }}（距下次保養不足 500 km）</span>
    </div>
  </div>
</template>

<script setup>
defineProps({ alerts: Array })
</script>
