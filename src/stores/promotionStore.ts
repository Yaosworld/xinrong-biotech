import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Promotion, PromotionFilters, PromotionStatus } from '@/types'

export const usePromotionStore = defineStore('promotion', () => {
  // ========================================
  // State
  // ========================================
  const promotions = ref<Promotion[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // 筛选状态
  const filters = ref<PromotionFilters>({
    search: '',
    status: 'all',
    dateRange: null,
    hasDiscount: false,
    priceRange: [0, 999999],
    category: '',
    tags: []
  })

  // ========================================
  // 辅助函数
  // ========================================
  
  // 计算促销活动状态
  function calculateStatus(promotion: Promotion): { status: PromotionStatus; statusText: string } {
    if (!promotion.start_date || !promotion.end_date) {
      return { status: 'all', statusText: '状态未知' }
    }

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const start = new Date(promotion.start_date)
    const end = new Date(promotion.end_date)
    end.setHours(23, 59, 59, 999)

    if (now < start) {
      return { status: 'coming', statusText: '即将开始' }
    } else if (now > end) {
      return { status: 'ended', statusText: '已结束' }
    } else {
      return { status: 'active', statusText: '进行中' }
    }
  }

  // ========================================
  // Getters
  // ========================================
  
  // 处理后的促销活动（带状态）
  const processedPromotions = computed(() => {
    return promotions.value.map(promotion => {
      const { status, statusText } = calculateStatus(promotion)
      return {
        ...promotion,
        status,
        statusText
      }
    })
  })

  // 排序后的促销活动（状态优先级：即将开始 > 进行中 > 已结束）
  const sortedPromotions = computed(() => {
    const statusOrder: Record<PromotionStatus, number> = {
      coming: 1,
      active: 2,
      ended: 3,
      all: 4
    }

    return [...processedPromotions.value].sort((a, b) => {
      const statusA = statusOrder[a.status || 'all']
      const statusB = statusOrder[b.status || 'all']

      if (statusA !== statusB) {
        return statusA - statusB
      }

      // 状态相同，按优先级排序
      if (a.priority && b.priority && a.priority !== b.priority) {
        return a.priority - b.priority
      }

      // 优先级相同，按开始日期降序
      if (a.start_date && b.start_date) {
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      }

      return 0
    })
  })

  // 筛选后的促销活动
  const filteredPromotions = computed(() => {
    let result = [...sortedPromotions.value]

    // 搜索筛选
    if (filters.value.search) {
      const query = filters.value.search.toLowerCase()
      result = result.filter(promotion =>
        promotion.title.toLowerCase().includes(query) ||
        promotion.summary.toLowerCase().includes(query) ||
        promotion.description?.toLowerCase().includes(query) ||
        promotion.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // 状态筛选
    if (filters.value.status !== 'all') {
      result = result.filter(promotion => promotion.status === filters.value.status)
    }

    // 时间范围筛选
    if (filters.value.dateRange) {
      const [startDate, endDate] = filters.value.dateRange
      result = result.filter(promotion => {
        if (!promotion.start_date || !promotion.end_date) return false
        return promotion.start_date >= startDate && promotion.end_date <= endDate
      })
    }

    // 价格区间筛选
    const [minPrice, maxPrice] = filters.value.priceRange
    if (minPrice > 0 || maxPrice < 999999) {
      result = result.filter(promotion => {
        const price = promotion.current_price || promotion.original_price || 0
        return price >= minPrice && price <= maxPrice
      })
    }

    // 折扣筛选
    if (filters.value.hasDiscount) {
      result = result.filter(promotion =>
        promotion.current_price &&
        promotion.original_price &&
        promotion.current_price < promotion.original_price
      )
    }

    // 分类筛选
    if (filters.value.category) {
      result = result.filter(promotion => promotion.category === filters.value.category)
    }

    // 标签筛选
    if (filters.value.tags.length > 0) {
      result = result.filter(promotion =>
        promotion.tags?.some(tag => filters.value.tags.includes(tag))
      )
    }

    return result
  })

  // 进行中的活动
  const activePromotions = computed(() => {
    return processedPromotions.value.filter(p => p.status === 'active')
  })

  // 即将开始的活动
  const comingPromotions = computed(() => {
    return processedPromotions.value.filter(p => p.status === 'coming')
  })

  // 已结束的活动
  const endedPromotions = computed(() => {
    return processedPromotions.value.filter(p => p.status === 'ended')
  })

  // 推荐活动
  const featuredPromotions = computed(() => {
    return processedPromotions.value.filter(p => p.is_featured)
  })

  // 所有活动分类
  const allCategories = computed(() => {
    const categories = promotions.value
      .map(p => p.category)
      .filter((cat): cat is string => !!cat)
    return [...new Set(categories)].sort()
  })

  // 所有标签
  const allTags = computed(() => {
    const tags = promotions.value.flatMap(p => p.tags || [])
    return [...new Set(tags)].sort()
  })

  // 激活的筛选条件数量
  const activeFiltersCount = computed(() => {
    let count = 0
    if (filters.value.search) count++
    if (filters.value.status !== 'all') count++
    if (filters.value.dateRange) count++
    if (filters.value.hasDiscount) count++
    if (filters.value.priceRange[0] > 0 || filters.value.priceRange[1] < 999999) count++
    if (filters.value.category) count++
    if (filters.value.tags.length > 0) count++
    return count
  })

  // ========================================
  // Actions
  // ========================================
  
  // 加载促销数据
  async function loadPromotions() {
    if (initialized.value && promotions.value.length > 0) {
      return // 已加载，直接返回
    }

    loading.value = true
    error.value = null

    try {
      const response = await fetch('/data/promotions.json')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      promotions.value = await response.json()
      initialized.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载促销数据失败'
      console.error('加载促销数据失败:', e)
    } finally {
      loading.value = false
    }
  }

  // 根据ID获取促销活动
  function getPromotionById(id: number): Promotion | undefined {
    const promotion = promotions.value.find(p => p.id === id)
    if (promotion) {
      const { status, statusText } = calculateStatus(promotion)
      return { ...promotion, status, statusText }
    }
    return undefined
  }

  // 更新筛选条件
  function setFilter<K extends keyof PromotionFilters>(key: K, value: PromotionFilters[K]) {
    filters.value[key] = value
  }

  // 清空所有筛选
  function clearAllFilters() {
    filters.value = {
      search: '',
      status: 'all',
      dateRange: null,
      hasDiscount: false,
      priceRange: [0, 999999],
      category: '',
      tags: []
    }
  }

  return {
    // State
    promotions,
    loading,
    error,
    initialized,
    filters,
    
    // Getters
    processedPromotions,
    sortedPromotions,
    filteredPromotions,
    activePromotions,
    comingPromotions,
    endedPromotions,
    featuredPromotions,
    allCategories,
    allTags,
    activeFiltersCount,
    
    // Actions
    loadPromotions,
    getPromotionById,
    setFilter,
    clearAllFilters
  }
})

