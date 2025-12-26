import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Brand, BrandType } from '@/types'
import { contentApi } from '@/api/contentApi'

export const useBrandStore = defineStore('brand', () => {
  // ========================================
  // State
  // ========================================
  const brands = ref<Brand[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // ========================================
  // 辅助函数：获取品牌类型（兼容旧数据）
  // ========================================
  function getBrandType(brand: Brand): BrandType {
    // 优先使用新字段
    if (brand.brand_type) return brand.brand_type
    // 兼容旧数据：is_own_brand=true 映射为 'own'，否则为 'partner'
    return brand.is_own_brand === true ? 'own' : 'partner'
  }

  // ========================================
  // Getters
  // ========================================

  // 按类型获取品牌列表
  const getBrandsByType = (type: BrandType) => {
    return computed(() => {
      return brands.value
        .filter(brand => getBrandType(brand) === type)
        .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999))
    })
  }

  // 自主品牌列表
  const ownBrands = computed(() => {
    return brands.value
      .filter(brand => getBrandType(brand) === 'own')
      .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999))
  })

  // 独家代理品牌列表
  const exclusiveBrands = computed(() => {
    return brands.value
      .filter(brand => getBrandType(brand) === 'exclusive')
      .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999))
  })

  // 一级代理品牌列表
  const primaryBrands = computed(() => {
    return brands.value
      .filter(brand => getBrandType(brand) === 'primary')
      .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999))
  })

  // 合作品牌列表
  const partnerBrands = computed(() => {
    return brands.value
      .filter(brand => getBrandType(brand) === 'partner')
      .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999))
  })

  // 代理品牌列表（兼容旧代码：非自主品牌）
  const agentBrands = computed(() => {
    return brands.value
      .filter(brand => getBrandType(brand) !== 'own')
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

  // 获取各分类的品牌数量
  const brandCountByType = computed(() => {
    const counts: Record<BrandType, number> = {
      own: 0,
      exclusive: 0,
      primary: 0,
      partner: 0
    }
    brands.value.forEach(brand => {
      const type = getBrandType(brand)
      counts[type]++
    })
    return counts
  })

  // 调整品牌排序（上移/下移）
  function moveBrand(brandId: string, direction: 'up' | 'down') {
    const brand = brands.value.find(b => b.id === brandId)
    if (!brand) return

    const brandType = getBrandType(brand)
    // 获取同类品牌列表
    const sameCategoryBrands = brands.value
      .filter(b => getBrandType(b) === brandType)
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
    const types: BrandType[] = ['own', 'exclusive', 'primary', 'partner']
    
    types.forEach(type => {
      const list = brands.value
        .filter(b => getBrandType(b) === type)
        .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999))
      
      list.forEach((brand, index) => {
        brand.sort_order = index + 1
      })
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
      // 优先从 API 加载
      const data = await contentApi.getAllPublished<Brand>('brand')
      brands.value = data
      initialized.value = true
    } catch (e) {
      // API 失败时降级到静态 JSON
      console.warn('API 加载失败，降级到静态 JSON:', e)
      try {
        const response = await fetch('/data/brands.json')
        if (response.ok) {
          brands.value = await response.json()
          initialized.value = true
        }
      } catch {
        error.value = e instanceof Error ? e.message : '加载品牌数据失败'
      }
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

  // 清除缓存（发布后调用）
  function clearCache() {
    brands.value = []
    initialized.value = false
    error.value = null
  }

  return {
    // State
    brands,
    loading,
    error,
    initialized,

    // Getters
    ownBrands,
    exclusiveBrands,
    primaryBrands,
    partnerBrands,
    agentBrands,
    domesticBrands,
    internationalBrands,
    sortedBrands,
    brandCountByType,
    getBrandsByType,

    // Actions
    loadBrands,
    getBrandById,
    getBrandByName,
    moveBrand,
    recalculateSortOrder,
    clearCache
  }
})

