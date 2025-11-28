import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Brand, BrandFilters, SortOption } from '@/types'

export const useBrandStore = defineStore('brand', () => {
  // ========================================
  // State
  // ========================================
  const brands = ref<Brand[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // 筛选状态
  const filters = ref<BrandFilters>({
    search: '',
    categoryId: '',
    alphabet: '',
    country: '',
    hasProducts: false,
    featured: false
  })

  // 排序状态
  const sortBy = ref<SortOption>('name-asc')

  // ========================================
  // Getters
  // ========================================
  
  // 自主品牌列表
  const ownBrands = computed(() => {
    return brands.value.filter(brand => brand.is_own === true)
  })

  // 甄选品牌列表
  const selectedBrands = computed(() => {
    return brands.value.filter(brand => brand.is_own !== true)
  })

  // 推荐品牌列表
  const featuredBrands = computed(() => {
    return brands.value.filter(brand => brand.is_featured === true)
  })

  // 所有品牌分类
  const allCategories = computed(() => {
    const categories = brands.value
      .map(b => b.category)
      .filter((cat): cat is string => !!cat)
    return [...new Set(categories)].sort()
  })

  // 所有品牌国家
  const allCountries = computed(() => {
    const countries = brands.value
      .map(b => b.country)
      .filter((country): country is string => !!country)
    return [...new Set(countries)].sort()
  })

  // 字母索引
  const alphabetIndex = computed(() => {
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  })

  // 筛选后的品牌列表
  const filteredBrands = computed(() => {
    let result = [...brands.value]

    // 搜索筛选
    if (filters.value.search) {
      const keyword = filters.value.search.toLowerCase()
      result = result.filter(brand =>
        brand.show_name.toLowerCase().includes(keyword) ||
        brand.description?.toLowerCase().includes(keyword) ||
        brand.country?.toLowerCase().includes(keyword)
      )
    }

    // 分类筛选
    if (filters.value.categoryId) {
      result = result.filter(brand =>
        brand.category === filters.value.categoryId
      )
    }

    // 字母筛选
    if (filters.value.alphabet) {
      result = result.filter(brand =>
        brand.show_name.charAt(0).toUpperCase() === filters.value.alphabet
      )
    }

    // 国家筛选
    if (filters.value.country) {
      result = result.filter(brand =>
        brand.country === filters.value.country
      )
    }

    // 有产品品牌筛选
    if (filters.value.hasProducts) {
      result = result.filter(brand =>
        (brand.product_count || 0) > 0
      )
    }

    // 推荐品牌筛选
    if (filters.value.featured) {
      result = result.filter(brand =>
        brand.is_featured === true
      )
    }

    return result
  })

  // 排序后的品牌列表
  const sortedBrands = computed(() => {
    const result = [...filteredBrands.value]

    switch (sortBy.value) {
      case 'name-asc':
        result.sort((a, b) => a.show_name.localeCompare(b.show_name, 'zh-CN'))
        break
      case 'name-desc':
        result.sort((a, b) => b.show_name.localeCompare(a.show_name, 'zh-CN'))
        break
      case 'featured':
        result.sort((a, b) => {
          if (a.is_featured === b.is_featured) {
            return (a.priority || 999) - (b.priority || 999)
          }
          return a.is_featured ? -1 : 1
        })
        break
      case 'priority':
        result.sort((a, b) => (a.priority || 999) - (b.priority || 999))
        break
    }

    return result
  })

  // 激活的筛选条件数量
  const activeFiltersCount = computed(() => {
    let count = 0
    if (filters.value.search) count++
    if (filters.value.categoryId) count++
    if (filters.value.alphabet) count++
    if (filters.value.country) count++
    if (filters.value.hasProducts) count++
    if (filters.value.featured) count++
    return count
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
    return brands.value.find(b => b.brand_id === id)
  }

  // 根据名称获取品牌
  function getBrandByName(name: string): Brand | undefined {
    return brands.value.find(b => b.show_name === name)
  }

  // 更新筛选条件
  function setFilter<K extends keyof BrandFilters>(key: K, value: BrandFilters[K]) {
    filters.value[key] = value
  }

  // 清空所有筛选
  function clearAllFilters() {
    filters.value = {
      search: '',
      categoryId: '',
      alphabet: '',
      country: '',
      hasProducts: false,
      featured: false
    }
  }

  // 设置排序
  function setSortBy(sort: SortOption) {
    sortBy.value = sort
  }

  return {
    // State
    brands,
    loading,
    error,
    initialized,
    filters,
    sortBy,
    
    // Getters
    ownBrands,
    selectedBrands,
    featuredBrands,
    allCategories,
    allCountries,
    alphabetIndex,
    filteredBrands,
    sortedBrands,
    activeFiltersCount,
    
    // Actions
    loadBrands,
    getBrandById,
    getBrandByName,
    setFilter,
    clearAllFilters,
    setSortBy
  }
})

