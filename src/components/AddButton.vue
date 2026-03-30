<template>
  <div class="fab-wrapper">
    <button class="fab" @click="emit('click')">＋</button>
  </div>
</template>

<script setup>
const emit = defineEmits(['click'])
</script>
