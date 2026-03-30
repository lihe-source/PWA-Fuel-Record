<template>
  <div class="rounded-xl p-4 mb-3" style="background: var(--bg-primary); border: var(--card-border);">
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-3">
        <span class="text-2xl">{{ vehicle.type === '汽車' ? '🚗' : '🏍️' }}</span>
        <div>
          <h3 class="font-semibold text-base" style="color: var(--text-primary)">{{ vehicle.name }}</h3>
          <p class="text-sm" style="color: var(--text-secondary)">{{ vehicle.plate }}</p>
          <p class="text-sm mt-1" style="color: var(--text-secondary)">
            目前里程：<span class="font-medium" style="color: var(--text-primary)">{{ vehicle.currentMileage?.toLocaleString() }} km</span>
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          @click="emit('edit', vehicle)"
          class="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors"
          style="color: var(--accent)"
          title="編輯"
        >
          ✏️
        </button>
        <button
          @click="emit('delete', vehicle)"
          class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900 transition-colors text-red-500"
          title="刪除"
        >
          🗑️
        </button>
      </div>
    </div>
    <div class="mt-2 text-xs" style="color: var(--text-secondary)">
      類型：{{ vehicle.type }} ｜ 初始里程：{{ vehicle.initialMileage?.toLocaleString() }} km
    </div>
  </div>
</template>

<script setup>
defineProps({ vehicle: Object })
const emit = defineEmits(['edit', 'delete'])
</script>
