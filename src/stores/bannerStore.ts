import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { contentApi } from '@/api/contentApi'

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
      // 优先从 API 加载（Banner 按 key 存储，需要逐个获取）
      const bannerKeys = ['products', 'brands', 'promotions', 'about']
      const result: BannersData = {} as BannersData
      
      for (const key of bannerKeys) {
        try {
          const data = await contentApi.getPublishedOne<BannerConfig>('banner', key)
          result[key] = data
        } catch {
          // 单个 banner 加载失败不影响其他
        }
      }
      
      if (Object.keys(result).length > 0) {
        banners.value = result
        loaded.value = true
        return banners.value
      }
      throw new Error('No banner data loaded')
    } catch (e) {
      // API 失败时降级到静态 JSON
      console.warn('API 加载失败，降级到静态 JSON:', e)
      try {
        const response = await fetch('/data/banners.json')
        if (response.ok) {
          banners.value = await response.json()
          loaded.value = true
          return banners.value
        }
      } catch {
        error.value = '加载 Banner 数据失败'
      }
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
