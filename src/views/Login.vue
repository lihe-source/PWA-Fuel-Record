<template>
  <div class="login-page">
    <div class="login-logo">⛽</div>
    <h1 class="login-title">油耗記錄</h1>
    <p class="login-subtitle">記錄您的汽機車油耗與保養資訊</p>

    <div class="login-form">
      <div v-if="!isConfigured" class="alert alert-warning" style="margin-bottom:20px">
        ⚠️ Firebase 尚未設定，請配置環境變數後重新部署
      </div>

      <div v-if="authError" class="alert alert-danger" style="margin-bottom:16px">{{ authError }}</div>

      <div class="form-group">
        <label class="form-label">電子郵件</label>
        <input v-model="email" type="email" class="form-input" placeholder="請輸入電子郵件" />
      </div>
      <div class="form-group">
        <label class="form-label">密碼</label>
        <input v-model="password" type="password" class="form-input" placeholder="請輸入密碼" />
      </div>

      <button class="btn btn-primary" style="width:100%;margin-bottom:10px" @click="handleEmailLogin" :disabled="loading">
        {{ loading ? '登入中...' : '登入' }}
      </button>
      <button class="btn btn-secondary" style="width:100%;margin-bottom:20px" @click="handleRegister" :disabled="loading">
        {{ loading ? '處理中...' : '註冊新帳號' }}
      </button>

      <div class="login-divider">或</div>

      <button class="btn-google" @click="handleGoogleLogin" :disabled="loading">
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        使用 Google 登入
      </button>

      <p style="text-align:center;margin-top:16px;font-size:13px;color:var(--text-secondary)">
        未設定 Firebase 時，可用任意帳密本地使用
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { isConfigured } from '../firebase'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const authError = ref('')

async function handleEmailLogin() {
  if (!email.value || !password.value) { authError.value = '請填寫電子郵件與密碼'; return }
  loading.value = true
  authError.value = ''
  try {
    await authStore.loginWithEmail(email.value, password.value)
    router.push('/dashboard')
  } catch (e) {
    // If firebase not configured, create mock user
    if (!isConfigured) {
      authStore.currentUser = { uid: 'local', email: email.value, displayName: email.value.split('@')[0] }
      router.push('/dashboard')
    } else {
      authError.value = getErrorMessage(e.code)
    }
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!email.value || !password.value) { authError.value = '請填寫電子郵件與密碼'; return }
  loading.value = true
  authError.value = ''
  try {
    await authStore.registerWithEmail(email.value, password.value)
    router.push('/dashboard')
  } catch (e) {
    if (!isConfigured) {
      authStore.currentUser = { uid: 'local', email: email.value, displayName: email.value.split('@')[0] }
      router.push('/dashboard')
    } else {
      authError.value = getErrorMessage(e.code)
    }
  } finally {
    loading.value = false
  }
}

async function handleGoogleLogin() {
  loading.value = true
  authError.value = ''
  try {
    await authStore.loginWithGoogle()
    router.push('/dashboard')
  } catch (e) {
    authError.value = getErrorMessage(e.code)
  } finally {
    loading.value = false
  }
}

function getErrorMessage(code) {
  const map = {
    'auth/user-not-found': '找不到此帳號',
    'auth/wrong-password': '密碼錯誤',
    'auth/email-already-in-use': '此電子郵件已被使用',
    'auth/weak-password': '密碼強度不足（至少6位）',
    'auth/invalid-email': '電子郵件格式不正確',
    'auth/popup-closed-by-user': '登入視窗已關閉'
  }
  return map[code] || '登入失敗，請稍後再試'
}
</script>
