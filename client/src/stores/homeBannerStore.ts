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

const createEmptySections = (): HomeConfig['sections'] => ({
  products: { badge: '', title: '' },
  brands: { badge: '', title: '' },
  promotions: { badge: '', title: '' }
})

const normalizeSections = (
  sections?: Partial<HomeConfig['sections']>
): HomeConfig['sections'] => ({
  products: {
    badge: sections?.products?.badge || '',
    title: sections?.products?.title || ''
  },
  brands: {
    badge: sections?.brands?.badge || '',
    title: sections?.brands?.title || ''
  },
  promotions: {
    badge: sections?.promotions?.badge || '',
    title: sections?.promotions?.title || ''
  }
})

// ========================================
// Store 定义
// ========================================

export const useHomeBannerStore = defineStore('homeBanner', () => {
  // ========================================
  // State
  // ========================================
  const banners = ref<HomeBannerItem[]>([])
  const sections = ref<HomeConfig['sections']>(createEmptySections())
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
      const data = await contentApi.getPublishedOne<HomeConfig>('home_config', 'main')
      banners.value = Array.isArray(data?.images) ? data.images.filter(item => item?.url) : []
      sections.value = normalizeSections(data?.sections)
      loaded.value = true
      return { banners: banners.value, sections: sections.value }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载首页配置失败'
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
    sections.value = createEmptySections()
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
