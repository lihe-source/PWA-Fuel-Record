<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black bg-opacity-50" @click="emit('update:modelValue', false)"></div>
      <div class="relative w-full max-w-md max-h-screen overflow-y-auto rounded-2xl shadow-2xl p-6" style="background: var(--bg-primary); border: var(--card-border);">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold" style="color: var(--text-primary)">{{ title }}</h2>
          <button
            @click="emit('update:modelValue', false)"
            class="w-8 h-8 flex items-center justify-center rounded-full text-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            style="color: var(--text-secondary)"
          >
            ✕
          </button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({ modelValue: Boolean, title: String })
const emit = defineEmits(['update:modelValue'])
</script>
