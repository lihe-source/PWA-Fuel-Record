import { defineStore } from 'pinia'
import { ref } from 'vue'
import { onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth, googleProvider, isConfigured } from '../firebase'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null)
  const loading = ref(true)
  const error = ref(null)

  function init() {
    if (!auth) { loading.value = false; return }
    onAuthStateChanged(auth, (user) => {
      currentUser.value = user
      loading.value = false
    })
  }

  async function loginWithGoogle() {
    if (!auth) throw new Error('Firebase not configured')
    error.value = null
    try {
      const result = await signInWithPopup(auth, googleProvider)
      currentUser.value = result.user
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function loginWithEmail(email, password) {
    if (!auth) throw new Error('Firebase not configured')
    error.value = null
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      currentUser.value = result.user
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function registerWithEmail(email, password) {
    if (!auth) throw new Error('Firebase not configured')
    error.value = null
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      currentUser.value = result.user
    } catch (e) {
      error.value = e.message
      throw e
    }
  }

  async function logout() {
    if (!auth) return
    await signOut(auth)
    currentUser.value = null
  }

  return { currentUser, loading, error, init, loginWithGoogle, loginWithEmail, registerWithEmail, logout }
})
