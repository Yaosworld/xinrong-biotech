import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Promotion, PromotionFilters, PromotionTimeStatus } from '@/types'
import { contentApi } from '@/api/contentApi'
import { 
  PROMOTION_STATUS_CONFIG, 
  PROMOTION_PAGINATION_CONFIG,
  PROMOTION_IMAGE_CONFIG 
} from '@/constants/promotions'

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
    timeStatus: 'all',
    dateRange: null,
    tags: []
  })

  // 状态缓存（避免重复计算）
  const statusCache = ref<Map<string, { status: PromotionTimeStatus; statusText: string; timestamp: number }>>(new Map())
  const CACHE_TTL = 60 * 1000  // 缓存有效期：1分钟

  // ========================================
  // 辅助函数
  // ========================================
  
  /**
   * 获取北京时间（UTC+8）
   * 公司只在中国运营，统一使用北京时间
   */
  function getBeijingTime(date?: Date): Date {
    const d = date || new Date()
    return new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + (8 * 3600000))
  }

  /**
   * 计算促销活动时间状态
   * 使用缓存机制避免重复计算
   */
  function calculateStatus(promotion: Promotion): { status: PromotionTimeStatus; statusText: string } {
    if (!promotion.start_date || !promotion.end_date) {
      return { status: 'active', statusText: PROMOTION_STATUS_CONFIG.TEXT.unknown }
    }

    const cacheKey = `${promotion.id}-${promotion.start_date}-${promotion.end_date}`
    const cached = statusCache.value.get(cacheKey)
    const now = Date.now()
    
    // 检查缓存是否有效
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return { status: cached.status, statusText: cached.statusText }
    }

    const beijingNow = getBeijingTime()
    beijingNow.setHours(0, 0, 0, 0)

    const start = getBeijingTime(new Date(promotion.start_date))
    start.setHours(0, 0, 0, 0)

    const end = getBeijingTime(new Date(promotion.end_date))
    end.setHours(23, 59, 59, 999)

    // 计算距离结束的天数
    const msPerDay = 24 * 60 * 60 * 1000
    const daysUntilEnd = Math.ceil((end.getTime() - beijingNow.getTime()) / msPerDay)

    let result: { status: PromotionTimeStatus; statusText: string }

    if (beijingNow < start) {
      result = { status: 'coming', statusText: PROMOTION_STATUS_CONFIG.TEXT.coming }
    } else if (beijingNow > end) {
      result = { status: 'ended', statusText: PROMOTION_STATUS_CONFIG.TEXT.ended }
    } else if (daysUntilEnd <= PROMOTION_STATUS_CONFIG.ENDING_SOON_DAYS) {
      result = { status: 'endingSoon', statusText: PROMOTION_STATUS_CONFIG.TEXT.endingSoon }
    } else {
      result = { status: 'active', statusText: PROMOTION_STATUS_CONFIG.TEXT.active }
    }

    // 更新缓存
    statusCache.value.set(cacheKey, { ...result, timestamp: now })
    
    return result
  }

  /**
   * 获取状态优先级（用于排序）
   */
  function getStatusPriority(status: PromotionTimeStatus): number {
    return PROMOTION_STATUS_CONFIG.PRIORITY[status] ?? 4
  }

  // ========================================
  // Getters
  // ========================================
  
  // 处理后的促销活动（带状态）- 使用缓存优化
  const processedPromotions = computed(() => {
    return promotions.value.map(promotion => {
      const { status, statusText } = calculateStatus(promotion)
      return {
        ...promotion,
        timeStatus: status,
        timeStatusText: statusText,
        // 兼容旧字段
        status,
        statusText
      }
    })
  })

  // 排序后的促销活动
  const sortedPromotions = computed(() => {
    return [...processedPromotions.value].sort((a, b) => {
      // 第一优先级：状态优先级
      const aPriority = getStatusPriority(a.timeStatus as PromotionTimeStatus)
      const bPriority = getStatusPriority(b.timeStatus as PromotionTimeStatus)
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }

      // 第二优先级：相同状态内部排序
      const aEndDate = a.end_date ? new Date(a.end_date).getTime() : 0
      const bEndDate = b.end_date ? new Date(b.end_date).getTime() : 0
      const aStartDate = a.start_date ? new Date(a.start_date).getTime() : 0
      const bStartDate = b.start_date ? new Date(b.start_date).getTime() : 0

      const status = a.timeStatus as PromotionTimeStatus
      switch (status) {
        case 'endingSoon':
        case 'active':
          return aEndDate - bEndDate
        case 'coming':
          return aStartDate - bStartDate
        case 'ended':
          return bEndDate - aEndDate
        default:
          return 0
      }
    })
  })

  // 筛选后的促销活动
  const filteredPromotions = computed(() => {
    let result = [...sortedPromotions.value]

    // 关键词搜索
    if (filters.value.search) {
      const query = filters.value.search.toLowerCase()
      result = result.filter(promotion =>
        promotion.title.toLowerCase().includes(query) ||
        promotion.summary.toLowerCase().includes(query) ||
        promotion.description?.toLowerCase().includes(query) ||
        promotion.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // 按时间状态筛选
    if (filters.value.timeStatus && filters.value.timeStatus !== 'all') {
      result = result.filter(p => p.timeStatus === filters.value.timeStatus)
    }

    // 按日期范围筛选
    if (filters.value.dateRange && filters.value.dateRange.length === 2) {
      const [startFilter, endFilter] = filters.value.dateRange
      result = result.filter(p => {
        if (!p.start_date || !p.end_date) return false
        // 活动时间范围与筛选范围有交集
        return p.start_date <= endFilter && p.end_date >= startFilter
      })
    }

    // 按标签筛选
    if (filters.value.tags && filters.value.tags.length > 0) {
      result = result.filter(p => 
        p.tags?.some(tag => filters.value.tags!.includes(tag))
      )
    }

    return result
  })

  // 各状态的活动
  const activePromotions = computed(() => 
    processedPromotions.value.filter(p => p.timeStatus === 'active')
  )
  const comingPromotions = computed(() => 
    processedPromotions.value.filter(p => p.timeStatus === 'coming')
  )
  const endedPromotions = computed(() => 
    processedPromotions.value.filter(p => p.timeStatus === 'ended')
  )
  const endingSoonPromotions = computed(() => 
    processedPromotions.value.filter(p => p.timeStatus === 'endingSoon')
  )

  // ========================================
  // Actions
  // ========================================
  
  async function loadPromotions() {
    if (initialized.value && promotions.value.length > 0) {
      return
    }

    loading.value = true
    error.value = null

    try {
      const data = await contentApi.getAllPublished<Promotion>('promotion')
      promotions.value = data
      initialized.value = true
    } catch (e) {
      console.warn('API 加载失败，降级到静态 JSON:', e)
      try {
        const response = await fetch('/data/promotions.json')
        if (response.ok) {
          promotions.value = await response.json()
          initialized.value = true
        }
      } catch {
        error.value = e instanceof Error ? e.message : '加载促销数据失败'
      }
    } finally {
      loading.value = false
    }
  }

  function getPromotionById(id: string | number): Promotion | undefined {
    const promotion = promotions.value.find(p => String(p.id) === String(id))
    if (promotion) {
      const { status, statusText } = calculateStatus(promotion)
      return { 
        ...promotion, 
        timeStatus: status, 
        timeStatusText: statusText,
        status, 
        statusText 
      }
    }
    return undefined
  }

  function getPromotionCoverPath(promotion: Promotion): string {
    if (promotion.cover_url) {
      return promotion.cover_url
    }
    return PROMOTION_IMAGE_CONFIG.PLACEHOLDER
  }

  function getPromotionPosterPath(promotion: Promotion): string {
    if (promotion.poster_url) {
      return promotion.poster_url
    }
    return PROMOTION_IMAGE_CONFIG.PLACEHOLDER
  }

  function setFilter<K extends keyof PromotionFilters>(key: K, value: PromotionFilters[K]) {
    filters.value[key] = value
  }

  function clearAllFilters() {
    filters.value = { 
      search: '', 
      timeStatus: 'all',
      dateRange: null,
      tags: []
    }
  }

  // 获取所有可用的标签（用于筛选选项）
  const availableTags = computed(() => {
    const tagSet = new Set<string>()
    promotions.value.forEach(p => {
      p.tags?.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'zh-CN'))
  })

  function clearCache() {
    promotions.value = []
    initialized.value = false
    error.value = null
    statusCache.value.clear()
  }

  // 清除状态缓存（用于时间变化后刷新）
  function clearStatusCache() {
    statusCache.value.clear()
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
    endingSoonPromotions,
    availableTags,

    // Actions
    loadPromotions,
    getPromotionById,
    getPromotionCoverPath,
    getPromotionPosterPath,
    setFilter,
    clearAllFilters,
    clearCache,
    clearStatusCache
  }
})
