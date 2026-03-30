import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth, googleProvider } from '../firebase.js'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const initialized = ref(false)
  let resolveAuth = null
  const authPromise = new Promise(resolve => { resolveAuth = resolve })

  onAuthStateChanged(auth, (firebaseUser) => {
    user.value = firebaseUser
    if (!initialized.value) {
      initialized.value = true
      resolveAuth()
    }
  })

  async function waitForAuth() {
    return authPromise
  }

  async function loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  }

  async function loginWithEmail(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  }

  async function register(email, password) {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    return result.user
  }

  async function logout() {
    await signOut(auth)
    user.value = null
  }

  return { user, initialized, waitForAuth, loginWithGoogle, loginWithEmail, register, logout }
})
