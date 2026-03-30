import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'

const Dashboard = () => import('./views/Dashboard.vue')
const FuelRecords = () => import('./views/FuelRecords.vue')
const MaintenanceRecords = () => import('./views/MaintenanceRecords.vue')
const VehicleManagement = () => import('./views/VehicleManagement.vue')
const Settings = () => import('./views/Settings.vue')
const MaintenanceItemConfig = () => import('./views/MaintenanceItemConfig.vue')
const Login = () => import('./views/Login.vue')

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: Login, meta: { public: true } },
  { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/fuel', component: FuelRecords, meta: { requiresAuth: true } },
  { path: '/maintenance', component: MaintenanceRecords, meta: { requiresAuth: true } },
  { path: '/vehicles', component: VehicleManagement, meta: { requiresAuth: true } },
  { path: '/settings', component: Settings, meta: { requiresAuth: true } },
  { path: '/maintenance-config', component: MaintenanceItemConfig, meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.currentUser) {
    next('/login')
  } else if (to.path === '/login' && authStore.currentUser) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
