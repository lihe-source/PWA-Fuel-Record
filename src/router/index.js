import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  { path: '/login', component: () => import('../views/Login.vue'), meta: { requiresAuth: false } },
  { path: '/', component: () => import('../views/Dashboard.vue'), meta: { requiresAuth: true } },
  { path: '/fuel', component: () => import('../views/FuelRecords.vue'), meta: { requiresAuth: true } },
  { path: '/maintenance', component: () => import('../views/MaintenanceRecords.vue'), meta: { requiresAuth: true } },
  { path: '/vehicles', component: () => import('../views/VehicleManagement.vue'), meta: { requiresAuth: true } },
  { path: '/settings', component: () => import('../views/Settings.vue'), meta: { requiresAuth: true } },
  { path: '/settings/maintenance-items', component: () => import('../views/MaintenanceItemConfig.vue'), meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  // Wait for auth to initialize
  if (!authStore.initialized) {
    await authStore.waitForAuth()
  }
  if (!authStore.user && to.path !== '/login') {
    next('/login')
  } else if (authStore.user && to.path === '/login') {
    next('/')
  } else {
    next()
  }
})

export default router
