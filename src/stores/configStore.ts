import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SiteInfo, PageContent } from '@/types'

export interface ConfigBackup {
  id: string
  type: string
  data: any
  timestamp: string
  checksum: string
}

export const useConfigStore = defineStore('config', () => {
  // ========================================
  // State
  // ========================================
  
  // 网站配置
  const siteConfig = ref<SiteInfo | null>(null)
  
  // 页面配置缓存
  const pageConfigs = ref<Map<string, PageContent>>(new Map())
  
  // 配置备份列表
  const backups = ref<ConfigBackup[]>([])
  
  // 状态
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isDirty = ref(false) // 是否有未保存的更改

  // ========================================
  // Getters
  // ========================================
  
  // 获取备份数量
  const backupCount = computed(() => backups.value.length)
  
  // 获取最近的备份
  const latestBackup = computed(() => 
    backups.value.length > 0 ? backups.value[0] : null
  )

  // ========================================
  // 辅助函数
  // ========================================
  
  // 生成简单校验和
  function generateChecksum(data: any): string {
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16).padStart(8, '0')
  }

  // ========================================
  // Actions
  // ========================================
  
  // 加载网站配置
  async function loadSiteConfig() {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch('/data/site-info.json')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      siteConfig.value = await response.json()
      return siteConfig.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载网站配置失败'
      return null
    } finally {
      loading.value = false
    }
  }
  
  // 加载页面配置
  async function loadPageConfig(pageId: string): Promise<PageContent | null> {
    // 检查缓存
    if (pageConfigs.value.has(pageId)) {
      return pageConfigs.value.get(pageId)!
    }
    
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(`/data/pages/${pageId}.json`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const config: PageContent = await response.json()
      pageConfigs.value.set(pageId, config)
      return config
    } catch (e) {
      error.value = e instanceof Error ? e.message : `加载页面配置 ${pageId} 失败`
      return null
    } finally {
      loading.value = false
    }
  }
  
  // 更新网站配置
  function updateSiteConfig(config: Partial<SiteInfo>) {
    if (siteConfig.value) {
      siteConfig.value = { ...siteConfig.value, ...config }
      isDirty.value = true
    }
  }
  
  // 更新页面配置
  function updatePageConfig(pageId: string, config: Partial<PageContent>) {
    const existing = pageConfigs.value.get(pageId)
    if (existing) {
      pageConfigs.value.set(pageId, { ...existing, ...config })
      isDirty.value = true
    }
  }
  
  // 创建备份
  function createBackup(type: string, data: any) {
    const backup: ConfigBackup = {
      id: Date.now().toString(),
      type,
      data: JSON.parse(JSON.stringify(data)), // 深拷贝
      timestamp: new Date().toISOString(),
      checksum: generateChecksum(data)
    }
    
    // 添加到开头
    backups.value.unshift(backup)
    
    // 最多保留10个备份
    if (backups.value.length > 10) {
      backups.value = backups.value.slice(0, 10)
    }
    
    // 保存到本地存储
    saveBackupsToStorage()
    
    return backup
  }
  
  // 从备份恢复
  function restoreFromBackup(backupId: string): any | null {
    const backup = backups.value.find(b => b.id === backupId)
    if (!backup) {
      error.value = '找不到指定的备份'
      return null
    }
    
    // 验证校验和
    if (generateChecksum(backup.data) !== backup.checksum) {
      error.value = '备份数据校验失败'
      return null
    }
    
    return backup.data
  }
  
  // 删除备份
  function deleteBackup(backupId: string) {
    backups.value = backups.value.filter(b => b.id !== backupId)
    saveBackupsToStorage()
  }
  
  // 保存备份到本地存储
  function saveBackupsToStorage() {
    try {
      localStorage.setItem('config_backups', JSON.stringify(backups.value))
    } catch (e) {
      console.error('保存备份失败:', e)
    }
  }
  
  // 从本地存储加载备份
  function loadBackupsFromStorage() {
    try {
      const stored = localStorage.getItem('config_backups')
      if (stored) {
        backups.value = JSON.parse(stored)
      }
    } catch (e) {
      console.error('加载备份失败:', e)
    }
  }
  
  // 导出配置为JSON
  function exportConfig(type: 'site' | 'page', pageId?: string): string | null {
    let data: any = null
    
    if (type === 'site') {
      data = siteConfig.value
    } else if (type === 'page' && pageId) {
      data = pageConfigs.value.get(pageId)
    }
    
    if (!data) {
      error.value = '没有可导出的配置'
      return null
    }
    
    return JSON.stringify(data, null, 2)
  }
  
  // 导入配置
  function importConfig(type: 'site' | 'page', jsonString: string, pageId?: string): boolean {
    try {
      const data = JSON.parse(jsonString)
      
      if (type === 'site') {
        // 在导入前创建备份
        if (siteConfig.value) {
          createBackup('site', siteConfig.value)
        }
        siteConfig.value = data
      } else if (type === 'page' && pageId) {
        // 在导入前创建备份
        const existing = pageConfigs.value.get(pageId)
        if (existing) {
          createBackup(`page-${pageId}`, existing)
        }
        pageConfigs.value.set(pageId, data)
      }
      
      isDirty.value = true
      return true
    } catch (e) {
      error.value = 'JSON格式无效'
      return false
    }
  }
  
  // 初始化
  function init() {
    loadBackupsFromStorage()
  }
  
  // 重置脏标记
  function markSaved() {
    isDirty.value = false
  }

  return {
    // State
    siteConfig,
    pageConfigs,
    backups,
    loading,
    error,
    isDirty,
    
    // Getters
    backupCount,
    latestBackup,
    
    // Actions
    loadSiteConfig,
    loadPageConfig,
    updateSiteConfig,
    updatePageConfig,
    createBackup,
    restoreFromBackup,
    deleteBackup,
    exportConfig,
    importConfig,
    init,
    markSaved
  }
})

