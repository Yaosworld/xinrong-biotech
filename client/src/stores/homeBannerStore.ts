import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { contentApi } from '@/api/contentApi'

// ========================================
// 类型定义
// ========================================

export interface HomeBannerItem {
  id: string
  url: string
}

export interface SectionConfig {
  badge: string
  title: string
}

export interface HomeConfig {
  images: HomeBannerItem[]
  sections: {
    products: SectionConfig
    brands: SectionConfig
    promotions: SectionConfig
  }
}

// 默认配置
const defaultConfig: HomeConfig = {
  images: [
    { id: '1', url: '/images/home/banner_1.jpg' },
    { id: '2', url: '/images/home/banner_2.jpg' },
    { id: '3', url: '/images/home/banner_3.jpg' },
    { id: '4', url: '/images/home/banner_4.jpg' }
  ],
  sections: {
    products: { badge: '热门产品', title: '精选优质产品' },
    brands: { badge: '品牌矩阵', title: '知名品牌，值得信赖' },
    promotions: { badge: '最新活动', title: '优惠活动动态一手掌握' }
  }
}

// ========================================
// Store 定义
// ========================================

export const useHomeBannerStore = defineStore('homeBanner', () => {
  // ========================================
  // State
  // ========================================
  const banners = ref<HomeBannerItem[]>([])
  const sections = ref<HomeConfig['sections']>({ ...defaultConfig.sections })
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  // ========================================
  // Actions
  // ========================================
  
  /**
   * 加载首页配置数据
   */
  async function loadBanners() {
    if (loaded.value) return { banners: banners.value, sections: sections.value }

    loading.value = true
    error.value = null

    try {
      // 从 API 加载已发布的数据
      const data = await contentApi.getPublishedOne<HomeConfig>('home_config', 'main')
      if (data) {
        banners.value = data.images?.length > 0 ? data.images : defaultConfig.images
        sections.value = data.sections ? { ...defaultConfig.sections, ...data.sections } : { ...defaultConfig.sections }
        loaded.value = true
        return { banners: banners.value, sections: sections.value }
      }
      throw new Error('No home config data')
    } catch (e) {
      // API 失败时降级到静态文件
      console.warn('API 加载失败，降级到静态文件:', e)
      try {
        const response = await fetch('/data/home-config.json')
        if (response.ok) {
          const data = await response.json()
          banners.value = data.images?.length > 0 ? data.images : defaultConfig.images
          sections.value = data.sections ? { ...defaultConfig.sections, ...data.sections } : { ...defaultConfig.sections }
          loaded.value = true
          return { banners: banners.value, sections: sections.value }
        }
      } catch {
        // 静态文件也失败，使用默认数据
      }
      
      // 使用默认数据
      banners.value = [...defaultConfig.images]
      sections.value = { ...defaultConfig.sections }
      loaded.value = true
      error.value = '加载首页配置失败，使用默认数据'
      return { banners: banners.value, sections: sections.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * 重新加载
   */
  function reload() {
    loaded.value = false
    return loadBanners()
  }

  /**
   * 清除缓存
   */
  function clearCache() {
    banners.value = []
    sections.value = { ...defaultConfig.sections }
    loaded.value = false
    error.value = null
  }

  // ========================================
  // Getters
  // ========================================
  
  const hasBanners = computed(() => banners.value.length > 0)
  const bannerCount = computed(() => banners.value.length)
  
  // 获取区块配置
  const getSection = computed(() => (key: 'products' | 'brands' | 'promotions') => sections.value[key])

  return {
    // State
    banners,
    sections,
    loading,
    loaded,
    error,
    
    // Actions
    loadBanners,
    reload,
    clearCache,
    
    // Getters
    hasBanners,
    bannerCount,
    getSection
  }
})
