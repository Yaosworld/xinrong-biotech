import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PageContent, SiteInfo } from '@/types'

export const usePageContentStore = defineStore('pageContent', () => {
  // ========================================
  // State
  // ========================================
  const pages = ref<Map<string, PageContent>>(new Map())
  const siteInfo = ref<SiteInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ========================================
  // Getters
  // ========================================
  
  // 获取特定页面内容
  const getPage = computed(() => {
    return (pageId: string) => pages.value.get(pageId)
  })

  function getPageContent(pageId: string) {
    return pages.value.get(pageId)
  }

  // 是否已加载网站信息
  const hasSiteInfo = computed(() => siteInfo.value !== null)

  // ========================================
  // Actions
  // ========================================
  
  // 加载网站基本信息
  async function loadSiteInfo() {
    if (siteInfo.value) {
      return siteInfo.value
    }

    loading.value = true
    error.value = null

    try {
      const response = await fetch('/data/site-info.json')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      siteInfo.value = await response.json()
      return siteInfo.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载网站信息失败'
      console.error('加载网站信息失败:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  // 加载特定页面内容
  async function fetchPage(pageId: string): Promise<PageContent | null> {
    // 检查缓存
    if (pages.value.has(pageId)) {
      return pages.value.get(pageId)!
    }

    loading.value = true
    error.value = null

    try {
      const response = await fetch(`/data/pages/${pageId}.json`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const content: PageContent = await response.json()
      pages.value.set(pageId, content)
      return content
    } catch (e) {
      error.value = e instanceof Error ? e.message : `加载页面 ${pageId} 失败`
      console.error(`加载页面 ${pageId} 失败:`, e)
      return null
    } finally {
      loading.value = false
    }
  }

  // 预加载多个页面
  async function preloadPages(pageIds: string[]) {
    const promises = pageIds.map(id => fetchPage(id))
    await Promise.all(promises)
  }

  // 清除缓存
  function clearCache() {
    pages.value.clear()
    siteInfo.value = null
  }

  // 兼容旧 API
  async function loadPageContent(pageId: string) {
    return fetchPage(pageId)
  }

  return {
    // State
    pages,
    siteInfo,
    loading,
    error,
    
    // Getters
    getPage,
    getPageContent,
    hasSiteInfo,
    
    // Actions
    loadSiteInfo,
    fetchPage,
    preloadPages,
    loadPageContent,
    clearCache
  }
})

