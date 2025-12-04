import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Brand } from '@/types'

export const useBrandStore = defineStore('brand', () => {
  // ========================================
  // State
  // ========================================
  const brands = ref<Brand[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // ========================================
  // Getters
  // ========================================

  // 自主品牌列表
  const ownBrands = computed(() => {
    return brands.value.filter(brand => brand.is_own_brand === true)
  })

  // 代理品牌列表
  const agentBrands = computed(() => {
    return brands.value.filter(brand => brand.is_own_brand !== true)
  })

  // 国内品牌列表
  const domesticBrands = computed(() => {
    return brands.value.filter(brand => brand.country === '中国')
  })

  // 国外品牌列表
  const internationalBrands = computed(() => {
    return brands.value.filter(brand => brand.country !== '中国')
  })

  // 按优先级排序的品牌列表
  const sortedBrands = computed(() => {
    return [...brands.value].sort((a, b) => (a.priority || 999) - (b.priority || 999))
  })

  // ========================================
  // Actions
  // ========================================
  
  // 加载品牌数据
  async function loadBrands() {
    if (initialized.value && brands.value.length > 0) {
      return // 已加载，直接返回
    }

    loading.value = true
    error.value = null

    try {
      const response = await fetch('/data/brands.json')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      brands.value = await response.json()
      initialized.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载品牌数据失败'
      console.error('加载品牌数据失败:', e)
    } finally {
      loading.value = false
    }
  }

  // 根据ID获取品牌
  function getBrandById(id: string): Brand | undefined {
    return brands.value.find(b => b.id === id)
  }

  // 根据名称获取品牌
  function getBrandByName(name: string): Brand | undefined {
    return brands.value.find(b => b.name === name)
  }

  return {
    // State
    brands,
    loading,
    error,
    initialized,

    // Getters
    ownBrands,
    agentBrands,
    domesticBrands,
    internationalBrands,
    sortedBrands,

    // Actions
    loadBrands,
    getBrandById,
    getBrandByName
  }
})

