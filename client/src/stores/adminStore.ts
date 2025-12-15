import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface AdminActivity {
  id: string
  type: 'upload' | 'config' | 'modify' | 'download'
  target: string
  description: string
  timestamp: string
}

export const useAdminStore = defineStore('admin', () => {
  // ========================================
  // State
  // ========================================
  
  // 管理员活动记录
  const activities = ref<AdminActivity[]>([])
  
  // 上传状态
  const uploadProgress = ref(0)
  const isUploading = ref(false)
  
  // 错误信息
  const error = ref<string | null>(null)
  
  // 成功信息
  const success = ref<string | null>(null)

  // ========================================
  // Actions
  // ========================================
  
  // 添加活动记录
  function addActivity(activity: Omit<AdminActivity, 'id' | 'timestamp'>) {
    const newActivity: AdminActivity = {
      ...activity,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    }
    
    // 添加到开头
    activities.value.unshift(newActivity)
    
    // 最多保留50条记录
    if (activities.value.length > 50) {
      activities.value = activities.value.slice(0, 50)
    }
    
    // 保存到本地存储
    saveActivitiesToStorage()
  }
  
  // 从本地存储加载活动记录
  function loadActivitiesFromStorage() {
    try {
      const stored = localStorage.getItem('admin_activities')
      if (stored) {
        activities.value = JSON.parse(stored)
      }
    } catch (e) {
      console.error('加载活动记录失败:', e)
    }
  }
  
  // 保存活动记录到本地存储
  function saveActivitiesToStorage() {
    try {
      localStorage.setItem('admin_activities', JSON.stringify(activities.value))
    } catch (e) {
      console.error('保存活动记录失败:', e)
    }
  }
  
  // 清空活动记录
  function clearActivities() {
    activities.value = []
    localStorage.removeItem('admin_activities')
  }
  
  // 设置上传进度
  function setUploadProgress(progress: number) {
    uploadProgress.value = progress
    isUploading.value = progress > 0 && progress < 100
  }
  
  // 重置上传状态
  function resetUploadState() {
    uploadProgress.value = 0
    isUploading.value = false
  }
  
  // 设置错误信息
  function setError(message: string | null) {
    error.value = message
    if (message) {
      // 5秒后自动清除错误
      setTimeout(() => {
        if (error.value === message) {
          error.value = null
        }
      }, 5000)
    }
  }
  
  // 设置成功信息
  function setSuccess(message: string | null) {
    success.value = message
    if (message) {
      // 3秒后自动清除成功信息
      setTimeout(() => {
        if (success.value === message) {
          success.value = null
        }
      }, 3000)
    }
  }
  
  // 初始化
  function init() {
    loadActivitiesFromStorage()
  }

  return {
    // State
    activities,
    uploadProgress,
    isUploading,
    error,
    success,
    
    // Actions
    addActivity,
    loadActivitiesFromStorage,
    clearActivities,
    setUploadProgress,
    resetUploadState,
    setError,
    setSuccess,
    init
  }
})

