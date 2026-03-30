import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth, googleProvider } from '../firebase'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(true)
  const error = ref(null)

  function init() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (u) => {
        user.value = u
        loading.value = false
        resolve(u)
      })
    })
  }

  async function loginWithGoogle() {
    error.value = null
    try {
      const result = await signInWithPopup(auth, googleProvider)
      user.value = result.user
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function loginWithEmail(email, password) {
    error.value = null
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      user.value = result.user
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function registerWithEmail(email, password) {
    error.value = null
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      user.value = result.user
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function logout() {
    await signOut(auth)
    user.value = null
  }

  return { user, loading, error, init, loginWithGoogle, loginWithEmail, registerWithEmail, logout }
})
