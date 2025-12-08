import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ========================================
// 类型定义
// ========================================

export interface StatItem {
  key: string
  number: string
  label: string
}

export interface BannerConfig {
  id: string
  title: string
  slogans: string[]
  defaultStats: StatItem[]
}

export interface BannersData {
  products: BannerConfig
  brands: BannerConfig
  promotions: BannerConfig
  about: BannerConfig
  [key: string]: BannerConfig
}

// ========================================
// Store 定义
// ========================================

export const useBannerStore = defineStore('banner', () => {
  // ========================================
  // State
  // ========================================
  const banners = ref<BannersData | null>(null)
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  // ========================================
  // Actions
  // ========================================
  
  // 加载所有 banner 数据
  async function loadBanners() {
    if (loaded.value) {
      return banners.value
    }

    loading.value = true
    error.value = null

    try {
      const response = await fetch('/data/banners.json')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      banners.value = await response.json()
      loaded.value = true
      return banners.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载 Banner 数据失败'
      console.error('加载 Banner 数据失败:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  // ========================================
  // Getters
  // ========================================
  
  // 获取指定页面的 banner 配置
  const getBanner = computed(() => {
    return (pageId: string): BannerConfig | null => {
      return banners.value?.[pageId] || null
    }
  })

  // 获取指定页面的标语
  const getSlogans = computed(() => {
    return (pageId: string): string[] => {
      return banners.value?.[pageId]?.slogans || []
    }
  })

  // 获取指定页面的默认统计数据
  const getDefaultStats = computed(() => {
    return (pageId: string): StatItem[] => {
      return banners.value?.[pageId]?.defaultStats || []
    }
  })

  // 产品中心 banner
  const productsBanner = computed(() => banners.value?.products || null)
  
  // 品牌中心 banner
  const brandsBanner = computed(() => banners.value?.brands || null)
  
  // 资讯中心 banner
  const promotionsBanner = computed(() => banners.value?.promotions || null)
  
  // 关于我们 banner
  const aboutBanner = computed(() => banners.value?.about || null)

  // 重新加载
  function reload() {
    loaded.value = false
    return loadBanners()
  }

  // 清除缓存
  function clearCache() {
    banners.value = null
    loaded.value = false
    error.value = null
  }

  return {
    // State
    banners,
    loading,
    loaded,
    error,
    
    // Actions
    loadBanners,
    reload,
    clearCache,
    
    // Getters
    getBanner,
    getSlogans,
    getDefaultStats,
    productsBanner,
    brandsBanner,
    promotionsBanner,
    aboutBanner
  }
})
