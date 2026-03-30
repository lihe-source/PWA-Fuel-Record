<template>
  <button
    @click="emit('click')"
    class="fixed z-40 flex items-center justify-center rounded-full shadow-lg text-white text-3xl font-light transition-transform hover:scale-110 active:scale-95"
    style="bottom: 80px; left: 50%; transform: translateX(-50%); width: 64px; height: 64px; background: var(--accent);"
    aria-label="新增"
  >
    +
  </button>
</template>

<script setup>
const emit = defineEmits(['click'])
</script>
