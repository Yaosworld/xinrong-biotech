import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { contentApi } from '@/api/contentApi'

// ========================================
// 类型定义
// ========================================

export interface HomeBannerItem {
  id: string
  imageId: number | null
  url: string
  filename: string
  heroGroupId: string
  hero: HomeHeroGroup
}

export interface HomeHeroGroup {
  id: string
  name: string
  keywords: string
  title: string
  subtitle: string
}

export interface HomeSlideItem {
  id: string
  imageId: number | null
  url: string
  filename: string
  heroGroupId: string
}

export interface SectionConfig {
  badge: string
  title: string
}

export interface HomeConfig {
  slides?: HomeSlideItem[]
  heroGroups?: HomeHeroGroup[]
  images?: Array<{
    id: string
    imageId?: number | null
    url: string
    filename?: string
  }>
  hero?: {
    keywords?: string
    title?: string
    subtitle?: string
  }
  sections: {
    products: SectionConfig
    brands: SectionConfig
    promotions: SectionConfig
  }
}

const DEFAULT_HERO_GROUP_ID = 'hero_default'

const createEmptyHeroGroup = (
  overrides: Partial<HomeHeroGroup> = {}
): HomeHeroGroup => ({
  id: overrides.id || DEFAULT_HERO_GROUP_ID,
  name: overrides.name || '默认文案',
  keywords: '',
  title: '',
  subtitle: '',
  ...overrides
})

const createEmptySections = (): HomeConfig['sections'] => ({
  products: { badge: '', title: '' },
  brands: { badge: '', title: '' },
  promotions: { badge: '', title: '' }
})

const normalizeHeroGroups = (
  heroGroups?: Partial<HomeHeroGroup>[],
  legacyHero?: { keywords?: string; title?: string; subtitle?: string }
): HomeHeroGroup[] => {
  if (Array.isArray(heroGroups) && heroGroups.length > 0) {
    return heroGroups.map((group, index) =>
      createEmptyHeroGroup({
        id: group?.id || `hero_${index + 1}`,
        name: group?.name || `文案组 ${index + 1}`,
        keywords: group?.keywords || '',
        title: group?.title || '',
        subtitle: group?.subtitle || ''
      })
    )
  }

  return [
    createEmptyHeroGroup({
      id: DEFAULT_HERO_GROUP_ID,
      name: '默认文案',
      keywords: legacyHero?.keywords || '',
      title: legacyHero?.title || '',
      subtitle: legacyHero?.subtitle || ''
    })
  ]
}

const normalizeSlides = (
  slides: HomeConfig['slides'],
  legacyImages: HomeConfig['images'],
  heroGroups: HomeHeroGroup[]
): HomeSlideItem[] => {
  const fallbackHeroGroupId = heroGroups[0]?.id || DEFAULT_HERO_GROUP_ID

  if (Array.isArray(slides) && slides.length > 0) {
    return slides.map((slide, index) => ({
      id: slide?.id || `slide_${index + 1}`,
      imageId: typeof slide?.imageId === 'number' ? slide.imageId : null,
      url: slide?.url || '',
      filename: slide?.filename || '',
      heroGroupId: slide?.heroGroupId || fallbackHeroGroupId
    }))
  }

  if (Array.isArray(legacyImages) && legacyImages.length > 0) {
    return legacyImages.map((image, index) => ({
      id: image?.id || `slide_${index + 1}`,
      imageId: typeof image?.imageId === 'number' ? image.imageId : null,
      url: image?.url || '',
      filename: image?.filename || '',
      heroGroupId: fallbackHeroGroupId
    }))
  }

  return []
}

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
  const slides = ref<HomeSlideItem[]>([])
  const heroGroups = ref<HomeHeroGroup[]>([createEmptyHeroGroup()])
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
    if (loaded.value) {
      return {
        slides: slides.value,
        heroGroups: heroGroups.value,
        banners: banners.value,
        sections: sections.value
      }
    }

    loading.value = true
    error.value = null

    try {
      const data = await contentApi.getPublishedOne<HomeConfig>('home_config', 'main')

      heroGroups.value = normalizeHeroGroups(data?.heroGroups, data?.hero)
      slides.value = normalizeSlides(data?.slides, data?.images, heroGroups.value)
      banners.value = slides.value
        .filter(item => item?.url)
        .map(item => ({
          ...item,
          hero: heroGroups.value.find(group => group.id === item.heroGroupId) || heroGroups.value[0]
        }))

      sections.value = normalizeSections(data?.sections)
      loaded.value = true

      return {
        slides: slides.value,
        heroGroups: heroGroups.value,
        banners: banners.value,
        sections: sections.value
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载首页配置失败'
      return {
        slides: slides.value,
        heroGroups: heroGroups.value,
        banners: banners.value,
        sections: sections.value
      }
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
    slides.value = []
    heroGroups.value = [createEmptyHeroGroup()]
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
    slides,
    heroGroups,
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
