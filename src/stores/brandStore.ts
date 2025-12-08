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

  // 自主品牌列表（按 sort_order 排序）
  const ownBrands = computed(() => {
    return brands.value
      .filter(brand => brand.is_own_brand === true)
      .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999))
  })

  // 代理品牌列表（按 sort_order 排序）
  const agentBrands = computed(() => {
    return brands.value
      .filter(brand => brand.is_own_brand !== true)
      .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999))
  })

  // 国内品牌列表
  const domesticBrands = computed(() => {
    return brands.value.filter(brand => brand.country === '中国')
  })

  // 国外品牌列表
  const internationalBrands = computed(() => {
    return brands.value.filter(brand => brand.country !== '中国')
  })

  // 按排序顺序排列的品牌列表
  const sortedBrands = computed(() => {
    return [...brands.value].sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999))
  })

  // 调整品牌排序（上移/下移）
  function moveBrand(brandId: string, direction: 'up' | 'down') {
    const brand = brands.value.find(b => b.id === brandId)
    if (!brand) return

    // 获取同类品牌列表（自主品牌或代理品牌）
    const sameCategoryBrands = brands.value
      .filter(b => b.is_own_brand === brand.is_own_brand)
      .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999))

    const currentIndex = sameCategoryBrands.findIndex(b => b.id === brandId)
    if (currentIndex === -1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= sameCategoryBrands.length) return

    // 交换排序值
    const targetBrand = sameCategoryBrands[targetIndex]
    const tempOrder = brand.sort_order
    brand.sort_order = targetBrand.sort_order
    targetBrand.sort_order = tempOrder
  }

  // 重新计算排序值（确保连续且不重复）
  function recalculateSortOrder() {
    // 分别处理自主品牌和代理品牌
    const ownList = brands.value
      .filter(b => b.is_own_brand === true)
      .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999))
    
    const agentList = brands.value
      .filter(b => b.is_own_brand !== true)
      .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999))

    ownList.forEach((brand, index) => {
      brand.sort_order = index + 1
    })

    agentList.forEach((brand, index) => {
      brand.sort_order = index + 1
    })
  }

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
    getBrandByName,
    moveBrand,
    recalculateSortOrder
  }
})

