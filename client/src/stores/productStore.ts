import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Product, ProductFilters, SortOption } from '@/types'
import { contentApi } from '@/api/contentApi'

export const useProductStore = defineStore('product', () => {
  // ========================================
  // State
  // ========================================
  const products = ref<Product[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // 分页状态（后端分页）
  const pagination = ref({
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 0
  })

  // 筛选状态
  const filters = ref<ProductFilters>({
    search: '',
    categoryId: '',
    brand: ''
  })

  // 排序状态
  const sortBy = ref<SortOption>('name-asc')
  
  // 是否使用后端分页模式
  const useBackendPagination = ref(true)
  
  // 所有品牌列表（从后端获取）
  const allBrandsList = ref<string[]>([])

  // ========================================
  // Getters
  // ========================================
  
  // 获取所有品牌列表（优先使用后端返回的完整列表）
  const allBrands = computed(() => {
    if (allBrandsList.value.length > 0) {
      return allBrandsList.value
    }
    // 降级：从当前页产品中提取
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
  
  // 加载筛选选项（品牌列表等）
  async function loadFilterOptions() {
    try {
      const options = await contentApi.getFilterOptions('product')
      allBrandsList.value = options.brands
    } catch (e) {
      console.warn('加载筛选选项失败:', e)
    }
  }

  // 加载产品数据（支持后端分页）
  async function loadProducts(page: number = 1) {
    loading.value = true
    error.value = null

    try {
      // 首次加载时获取筛选选项
      if (!initialized.value) {
        loadFilterOptions()
      }
      
      if (useBackendPagination.value) {
        // 后端分页模式
        const result = await contentApi.getPublishedList<Product>('product', {
          page,
          pageSize: pagination.value.pageSize,
          search: filters.value.search || undefined,
          categoryId: filters.value.categoryId || undefined,
          brand: filters.value.brand || undefined,
          sortBy: sortBy.value
        })
        products.value = result.data
        pagination.value = result.pagination
      } else {
        // 前端分页模式（降级方案）
        const data = await contentApi.getAllPublished<Product>('product')
        products.value = data
        pagination.value.total = data.length
        pagination.value.totalPages = Math.ceil(data.length / pagination.value.pageSize)
      }
      initialized.value = true
    } catch (e) {
      // API 失败时降级到静态 JSON
      console.warn('API 加载失败，降级到静态 JSON:', e)
      try {
        const response = await fetch('/data/products.json')
        if (response.ok) {
          products.value = await response.json()
          useBackendPagination.value = false
          initialized.value = true
        }
      } catch {
        error.value = e instanceof Error ? e.message : '加载产品数据失败'
      }
    } finally {
      loading.value = false
    }
  }
  
  // 跳转到指定页
  function goToPage(page: number) {
    pagination.value.page = page
    loadProducts(page)
  }
  
  // 设置每页数量
  function setPageSize(size: number) {
    pagination.value.pageSize = size
    loadProducts(1)
  }

  // 根据ID获取产品
  function getProductById(id: string): Product | undefined {
    return products.value.find(p => p.id === id)
  }

  // 根据分类ID获取产品列表
  function getProductsByCategoryId(categoryId: string): Product[] {
    return products.value.filter(p => p.categoryId === categoryId)
  }

  // 更新筛选条件（后端分页模式下会重新加载）
  function setFilter<K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) {
    filters.value[key] = value
    if (useBackendPagination.value) {
      loadProducts(1) // 筛选变化时重新加载第一页
    }
  }

  // 清空所有筛选
  function clearAllFilters() {
    filters.value = {
      search: '',
      categoryId: '',
      brand: ''
    }
    if (useBackendPagination.value) {
      loadProducts(1)
    }
  }

  // 设置排序
  function setSortBy(sort: SortOption) {
    sortBy.value = sort
    if (useBackendPagination.value) {
      loadProducts(1)
    }
  }

  // 清除缓存（发布后调用）
  function clearCache() {
    products.value = []
    initialized.value = false
    error.value = null
  }

  return {
    // State
    products,
    loading,
    error,
    initialized,
    filters,
    sortBy,
    pagination,
    useBackendPagination,
    
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
    setSortBy,
    goToPage,
    setPageSize,
    clearCache
  }
})

