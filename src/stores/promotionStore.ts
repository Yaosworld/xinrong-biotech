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
    search: ''
  })

  // ========================================
  // 辅助函数
  // ========================================
  
  // 计算促销活动状态（使用北京时间 UTC+8）
  // 状态分为四种：即将结束、正在进行、即将开始、已经结束
  // 即将结束：距离活动结束还有5天以内
  // 正在进行：活动在时间范围内，但距离结束还有超过5天
  // 即将开始：活动还没到时间
  // 已经结束：活动时间已过
  function calculateStatus(promotion: Promotion): { status: PromotionStatus; statusText: string } {
    if (!promotion.start_date || !promotion.end_date) {
      return { status: 'all', statusText: '状态未知' }
    }

    // 获取北京时间（UTC+8）
    const getBeijingTime = (date?: Date): Date => {
      const d = date || new Date()
      // 转换为UTC时间，然后加上8小时偏移（北京时间）
      return new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + (8 * 3600000))
    }

    const now = getBeijingTime()
    now.setHours(0, 0, 0, 0)

    const start = getBeijingTime(new Date(promotion.start_date))
    start.setHours(0, 0, 0, 0)

    const end = getBeijingTime(new Date(promotion.end_date))
    end.setHours(23, 59, 59, 999)

    // 计算距离结束的天数
    const msPerDay = 24 * 60 * 60 * 1000
    const daysUntilEnd = Math.ceil((end.getTime() - now.getTime()) / msPerDay)

    if (now < start) {
      return { status: 'coming', statusText: '即将开始' }
    } else if (now > end) {
      return { status: 'ended', statusText: '已经结束' }
    } else if (daysUntilEnd <= 5) {
      // 距离结束5天以内为即将结束
      return { status: 'endingSoon', statusText: '即将结束' }
    } else {
      return { status: 'active', statusText: '正在进行' }
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

  // 获取状态优先级（用于排序）
  // 排序顺序：即将结束(0) > 正在进行(1) > 即将开始(2) > 已结束(3)
  function getStatusPriority(status: PromotionStatus): number {
    switch (status) {
      case 'endingSoon': return 0  // 即将结束 - 最高优先级
      case 'active': return 1      // 正在进行
      case 'coming': return 2      // 即将开始
      case 'ended': return 3       // 已结束 - 最低优先级
      default: return 4
    }
  }

  // 排序后的促销活动
  // 排序优先级：1.状态优先级 → 2.相同状态内部排序
  // 相同状态内部排序规则：
  //   - 即将结束：按结束时间升序（最快结束的在前）
  //   - 正在进行：按结束时间升序（最快结束的在前）
  //   - 即将开始：按开始时间升序（最快开始的在前）
  //   - 已结束：按结束时间降序（最近结束的在前）
  const sortedPromotions = computed(() => {
    return [...processedPromotions.value].sort((a, b) => {
      // 第一优先级：状态优先级
      const aPriority = getStatusPriority(a.status as PromotionStatus)
      const bPriority = getStatusPriority(b.status as PromotionStatus)
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }

      // 第二优先级：相同状态内部排序（只有状态相同时才执行）
      const aEndDate = a.end_date ? new Date(a.end_date).getTime() : 0
      const bEndDate = b.end_date ? new Date(b.end_date).getTime() : 0
      const aStartDate = a.start_date ? new Date(a.start_date).getTime() : 0
      const bStartDate = b.start_date ? new Date(b.start_date).getTime() : 0

      // 根据相同的状态类型进行不同的排序
      const status = a.status as PromotionStatus
      switch (status) {
        case 'endingSoon':
        case 'active':
          // 即将结束和正在进行：按结束时间升序（最快结束的在前）
          return aEndDate - bEndDate
        case 'coming':
          // 即将开始：按开始时间升序（最快开始的在前）
          return aStartDate - bStartDate
        case 'ended':
          // 已结束：按结束时间降序（最近结束的在前）
          return bEndDate - aEndDate
        default:
          return 0
      }
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
        promotion.description?.toLowerCase().includes(query)
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

  // 获取促销活动封面图片路径
  function getPromotionCoverPath(promotion: Promotion): string {
    // 如果有cover_url，直接返回
    if (promotion.cover_url) {
      return promotion.cover_url
    }

    // 如果没有cover_url，返回默认图片
    return '/images/common/placeholder.png'
  }

  // 获取促销活动海报图片路径
  function getPromotionPosterPath(promotion: Promotion): string {
    // 如果有poster_url，直接返回
    if (promotion.poster_url) {
      return promotion.poster_url
    }

    // 如果都没有，返回默认图片
    return '/images/common/placeholder.png'
  }

  // 更新筛选条件
  function setFilter<K extends keyof PromotionFilters>(key: K, value: PromotionFilters[K]) {
    filters.value[key] = value
  }

  // 清空所有筛选
  function clearAllFilters() {
    filters.value = {
      search: ''
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

    // Actions
    loadPromotions,
    getPromotionById,
    getPromotionCoverPath,
    getPromotionPosterPath,
    setFilter,
    clearAllFilters
  }
})

