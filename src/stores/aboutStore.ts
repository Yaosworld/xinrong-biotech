import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ========================================
// 类型定义
// ========================================

export interface SectionConfig {
  badge: string
  title: string
}

export interface IntroCard {
  icon: string
  title: string
  content: string
}

export interface Advantage {
  icon: string
  title: string
  content: string
}

export interface AboutPageData {
  id: string
  title: string
  sections: {
    intro: SectionConfig
    advantages: SectionConfig
    contact: SectionConfig
  }
  introCards: IntroCard[]
  advantages: Advantage[]
}

// ========================================
// Store 定义
// ========================================

export const useAboutStore = defineStore('about', () => {
  // ========================================
  // State
  // ========================================
  const pageData = ref<AboutPageData | null>(null)
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  // ========================================
  // Getters
  // ========================================

  // 区块标题配置
  const sections = computed(() => pageData.value?.sections || {
    intro: { badge: '公司简介', title: '值得信赖的科研合作伙伴' },
    advantages: { badge: '核心优势', title: '为什么选择我们' },
    contact: { badge: '联系我们', title: '期待与您的合作' }
  })

  // 介绍卡片
  const introCards = computed(() => pageData.value?.introCards || [])

  // 核心优势
  const advantages = computed(() => pageData.value?.advantages || [])

  // 是否有介绍卡片
  const hasIntroCards = computed(() => introCards.value.length > 0)

  // 是否有优势数据
  const hasAdvantages = computed(() => advantages.value.length > 0)

  // ========================================
  // Actions
  // ========================================
  
  // 加载关于我们页面数据
  async function loadAboutData() {
    // 如果已经加载过，直接返回
    if (loaded.value) {
      return pageData.value
    }

    loading.value = true
    error.value = null

    try {
      const response = await fetch('/data/about.json')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      pageData.value = await response.json()
      loaded.value = true
      return pageData.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载关于我们数据失败'
      console.error('加载关于我们数据失败:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  // 重新加载数据
  function reload() {
    loaded.value = false
    return loadAboutData()
  }

  // 清除缓存
  function clearCache() {
    pageData.value = null
    loaded.value = false
    error.value = null
  }

  return {
    // State
    pageData,
    loading,
    loaded,
    error,
    
    // Getters
    sections,
    introCards,
    advantages,
    hasIntroCards,
    hasAdvantages,
    
    // Actions
    loadAboutData,
    reload,
    clearCache
  }
})
