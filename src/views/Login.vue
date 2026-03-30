<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-logo">⛽</div>
      <h1 class="login-title">油耗與保養紀錄</h1>
      <p class="login-subtitle">汽機車油耗與保養管理 PWA</p>

      <div v-if="authStore.error" class="error-msg">{{ authStore.error }}</div>

      <div class="login-tabs">
        <button :class="['tab-btn', mode === 'login' ? 'active' : '']" @click="mode = 'login'">登入</button>
        <button :class="['tab-btn', mode === 'register' ? 'active' : '']" @click="mode = 'register'">註冊</button>
      </div>

      <form @submit.prevent="handleEmailAuth" class="login-form">
        <div class="form-group">
          <label class="form-label">電子郵件</label>
          <input v-model="email" type="email" class="form-input" placeholder="請輸入電子郵件" required />
        </div>
        <div class="form-group">
          <label class="form-label">密碼</label>
          <input v-model="password" type="password" class="form-input" placeholder="請輸入密碼" required />
        </div>
        <button type="submit" class="btn-primary w-full" :disabled="loading">
          {{ loading ? '處理中...' : (mode === 'login' ? '登入' : '註冊') }}
        </button>
      </form>

      <div class="divider"><span>或</span></div>

      <button class="google-btn" @click="handleGoogle" :disabled="loading">
        <span class="google-icon">G</span>
        使用 Google 登入
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const mode = ref('login')
const email = ref('')
const password = ref('')
const loading = ref(false)

async function handleEmailAuth() {
  loading.value = true
  try {
    if (mode.value === 'login') {
      await authStore.loginWithEmail(email.value, password.value)
    } else {
      await authStore.registerWithEmail(email.value, password.value)
    }
  } catch (e) {
    // error handled in store
  } finally {
    loading.value = false
  }
}

async function handleGoogle() {
  loading.value = true
  try {
    await authStore.loginWithGoogle()
  } catch (e) {
    // error handled in store
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  padding: 1.5rem;
}

.login-container {
  background: var(--bg-card);
  border-radius: 1.25rem;
  padding: 2rem 1.5rem;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
}

.login-logo {
  text-align: center;
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.login-title {
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.login-subtitle {
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.error-msg {
  background: #fee2e2;
  color: #b91c1c;
  border-radius: 0.5rem;
  padding: 0.75rem;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.login-tabs {
  display: flex;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  padding: 0.25rem;
  margin-bottom: 1.25rem;
  gap: 0.25rem;
}

.tab-btn {
  flex: 1;
  padding: 0.5rem;
  border: none;
  background: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.tab-btn.active {
  background: var(--bg-card);
  color: #3b82f6;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.w-full {
  width: 100%;
}

.divider {
  text-align: center;
  position: relative;
  margin: 1rem 0;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border-color);
}

.divider span {
  position: relative;
  background: var(--bg-card);
  padding: 0 0.75rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.google-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 0.9375rem;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.15s;
}

.google-btn:hover {
  background: var(--bg-secondary);
}

.google-icon {
  display: inline-flex;
  width: 1.5rem;
  height: 1.5rem;
  background: #ea4335;
  color: white;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
