import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/authApi'

export interface AdminUser {
  id: number
  username: string
  role: 'super_admin' | 'admin'
  displayName: string
  email?: string
  avatarUrl?: string | null
  lastLoginAt?: string
}

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<AdminUser | null>(null)
  const loading = ref(false)
  const initialized = ref(false)
  
  // 计算属性
  const isLoggedIn = computed(() => !!user.value)
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
  const displayName = computed(() => user.value?.displayName || user.value?.username || '')
  const avatarUrl = computed(() => user.value?.avatarUrl || null)
  
  // 初始化
  async function init() {
    if (initialized.value) return
    
    if (authApi.isLoggedIn()) {
      try {
        const res = await authApi.getCurrentUser()
        if (res.success) {
          user.value = res.data
        } else {
          authApi.clearToken()
        }
      } catch {
        authApi.clearToken()
      }
    }
    
    initialized.value = true
  }
  
  // 登录
  async function login(username: string, password: string) {
    loading.value = true
    try {
      const res = await authApi.login(username, password)
      if (res.success && res.data?.user) {
        user.value = res.data.user
      }
      return res
    } finally {
      loading.value = false
    }
  }
  
  // 退出登录
  async function logout() {
    await authApi.logout()
    user.value = null
  }
  
  // 修改密码
  async function changePassword(oldPassword: string, newPassword: string) {
    return authApi.changePassword(oldPassword, newPassword)
  }
  
  return {
    user, loading, initialized,
    isLoggedIn, isSuperAdmin, displayName, avatarUrl,
    init, login, logout, changePassword
  }
})
