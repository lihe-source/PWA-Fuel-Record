<template>
  <div class="fab-wrapper">
    <button class="fab-btn" @click="$emit('click')">
      <span class="fab-icon">+</span>
    </button>
  </div>
</template>

<script setup>
defineEmits(['click'])
</script>

<style scoped>
.fab-wrapper {
  position: fixed;
  bottom: 5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 99;
  width: 100%;
  max-width: 430px;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.fab-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: #3b82f6;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(59,130,246,0.5);
  pointer-events: all;
  transition: background-color 0.15s, transform 0.1s;
}

.fab-btn:hover {
  background-color: #2563eb;
  transform: scale(1.05);
}

.fab-btn:active {
  transform: scale(0.95);
}

.fab-icon {
  font-size: 2rem;
  line-height: 1;
  font-weight: 300;
}
</style>
