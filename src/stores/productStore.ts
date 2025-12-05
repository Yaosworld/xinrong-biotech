import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Product, ProductFilters, SortOption } from '@/types'

export const useProductStore = defineStore('product', () => {
  // ========================================
  // State
  // ========================================
  const products = ref<Product[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // 筛选状态
  const filters = ref<ProductFilters>({
    search: '',
    categoryId: '',
    brand: ''
  })

  // 排序状态
  const sortBy = ref<SortOption>('name-asc')

  // ========================================
  // Getters
  // ========================================
  
  // 获取所有品牌列表
  const allBrands = computed(() => {
    const brands = products.value
      .map(p => p.brand)
      .filter((brand): brand is string => !!brand)
    return [...new Set(brands)].sort()
  })

  // 按分类分组
  const productsByCategory = computed(() => {
    const map = new Map<string, Product[]>()
    products.value.forEach(p => {
      const list = map.get(p.categoryId) || []
      list.push(p)
      map.set(p.categoryId, list)
    })
    return map
  })

  // 筛选后的产品列表
  const filteredProducts = computed(() => {
    let result = [...products.value]

    // 搜索筛选
    if (filters.value.search) {
      const keyword = filters.value.search.toLowerCase()
      result = result.filter(product =>
        product.name.toLowerCase().includes(keyword) ||
        product.specs.toLowerCase().includes(keyword) ||
        product.desc.toLowerCase().includes(keyword) ||
        product.brand?.toLowerCase().includes(keyword) ||
        product.sku?.toLowerCase().includes(keyword)
      )
    }

    // 分类筛选
    if (filters.value.categoryId) {
      result = result.filter(product =>
        product.categoryId === filters.value.categoryId
      )
    }

    // 品牌筛选
    if (filters.value.brand) {
      result = result.filter(product =>
        product.brand === filters.value.brand
      )
    }

    return result
  })

  // 排序后的产品列表
  const sortedProducts = computed(() => {
    const result = [...filteredProducts.value]

    switch (sortBy.value) {
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
        break
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name, 'zh-CN'))
        break
    }

    return result
  })

  // 激活的筛选条件数量
  const activeFiltersCount = computed(() => {
    let count = 0
    if (filters.value.search) count++
    if (filters.value.categoryId) count++
    if (filters.value.brand) count++
    return count
  })

  // ========================================
  // Actions
  // ========================================
  
  // 加载产品数据
  async function loadProducts() {
    if (initialized.value && products.value.length > 0) {
      return // 已加载，直接返回
    }

    loading.value = true
    error.value = null

    try {
      const response = await fetch('/data/products.json')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      products.value = await response.json()
      initialized.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载产品数据失败'
      console.error('加载产品数据失败:', e)
    } finally {
      loading.value = false
    }
  }

  // 根据ID获取产品
  function getProductById(id: string): Product | undefined {
    return products.value.find(p => p.id === id)
  }

  // 根据分类ID获取产品列表
  function getProductsByCategoryId(categoryId: string): Product[] {
    return products.value.filter(p => p.categoryId === categoryId)
  }

  // 更新筛选条件
  function setFilter<K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) {
    filters.value[key] = value
  }

  // 清空所有筛选
  function clearAllFilters() {
    filters.value = {
      search: '',
      categoryId: '',
      brand: ''
    }
  }

  // 设置排序
  function setSortBy(sort: SortOption) {
    sortBy.value = sort
  }

  return {
    // State
    products,
    loading,
    error,
    initialized,
    filters,
    sortBy,
    
    // Getters
    allBrands,
    productsByCategory,
    filteredProducts,
    sortedProducts,
    activeFiltersCount,
    
    // Actions
    loadProducts,
    getProductById,
    getProductsByCategoryId,
    setFilter,
    clearAllFilters,
    setSortBy
  }
})

