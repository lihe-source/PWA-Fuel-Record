<template>
  <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg-secondary)">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="text-5xl mb-3">⛽</div>
        <h1 class="text-2xl font-bold" style="color: var(--text-primary)">油耗保養紀錄</h1>
        <p class="text-sm mt-1" style="color: var(--text-secondary)">請登入以繼續使用</p>
      </div>

      <div class="rounded-2xl p-6 shadow-lg" style="background: var(--bg-primary); border: var(--card-border)">
        <!-- Google Sign-in -->
        <button
          @click="handleGoogleLogin"
          :disabled="loading"
          class="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 mb-4"
          style="border-color: var(--border-color); color: var(--text-primary)"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
          </svg>
          使用 Google 帳號登入
        </button>

        <div class="flex items-center gap-3 mb-4">
          <div class="flex-1 h-px" style="background: var(--border-color)"></div>
          <span class="text-sm" style="color: var(--text-secondary)">或</span>
          <div class="flex-1 h-px" style="background: var(--border-color)"></div>
        </div>

        <!-- Email/Password Form -->
        <form @submit.prevent="handleEmailLogin" class="space-y-3">
          <div>
            <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">電子郵件</label>
            <input
              v-model="email"
              type="email"
              required
              class="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500"
              style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1" style="color: var(--text-primary)">密碼</label>
            <input
              v-model="password"
              type="password"
              required
              class="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500"
              style="background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary)"
              placeholder="••••••••"
            />
          </div>

          <div v-if="error" class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity"
            :class="loading ? 'opacity-50' : 'hover:opacity-90'"
            style="background: var(--accent)"
          >
            {{ loading ? '登入中...' : '登入' }}
          </button>

          <button
            type="button"
            @click="handleRegister"
            :disabled="loading"
            class="w-full py-3 rounded-xl text-sm font-medium border transition-colors"
            style="border-color: var(--accent); color: var(--accent)"
          >
            註冊新帳號
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleGoogleLogin() {
  error.value = ''
  loading.value = true
  try {
    await authStore.loginWithGoogle()
    router.push('/')
  } catch (e) {
    error.value = '登入失敗：' + e.message
  } finally {
    loading.value = false
  }
}

async function handleEmailLogin() {
  error.value = ''
  loading.value = true
  try {
    await authStore.loginWithEmail(email.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = '登入失敗：' + e.message
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!email.value || !password.value) {
    error.value = '請輸入電子郵件和密碼'
    return
  }
  error.value = ''
  loading.value = true
  try {
    await authStore.register(email.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = '註冊失敗：' + e.message
  } finally {
    loading.value = false
  }
}
</script>
