import { ref, computed, watch, nextTick, readonly, type Ref, type ComputedRef } from 'vue'

interface PaginationOptions {
  initialPageSize?: number
  scrollTarget?: string  // 可选的滚动目标选择器
}

interface PaginationReturn<T> {
  currentPage: Readonly<Ref<number>>
  pageSize: Ref<number>
  totalPages: ComputedRef<number>
  currentPageItems: ComputedRef<T[]>
  paginationInfo: ComputedRef<{
    totalItems: number
    totalPages: number
    currentPage: number
    pageSize: number
    hasNextPage: boolean
    hasPrevPage: boolean
    startIndex: number
    endIndex: number
  }>
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  setPageSize: (size: number) => void
  reset: () => void
}

/**
 * 通用分页 Hook
 * @param items 数据源（响应式引用）
 * @param options 分页选项
 */
export function usePagination<T>(
  items: Ref<T[]> | ComputedRef<T[]>,
  options: PaginationOptions = {}
): PaginationReturn<T> {
  const { initialPageSize = 12, scrollTarget } = options
  const currentPage = ref(1)
  const pageSize = ref(initialPageSize)

  // 计算分页信息
  const paginationInfo = computed(() => {
    const totalItems = items.value.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize.value))

    return {
      totalItems,
      totalPages,
      currentPage: currentPage.value,
      pageSize: pageSize.value,
      hasNextPage: currentPage.value < totalPages,
      hasPrevPage: currentPage.value > 1,
      startIndex: (currentPage.value - 1) * pageSize.value,
      endIndex: Math.min(currentPage.value * pageSize.value, totalItems)
    }
  })

  // 总页数
  const totalPages = computed(() => paginationInfo.value.totalPages)

  // 当前页的数据
  const currentPageItems = computed(() => {
    const { startIndex, endIndex } = paginationInfo.value
    return items.value.slice(startIndex, endIndex)
  })

  // 滚动到目标区域
  const scrollToTarget = () => {
    if (scrollTarget) {
      nextTick(() => {
        const target = document.querySelector(scrollTarget)
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
        }
      })
    }
  }

  // 跳转到指定页
  const goToPage = (page: number) => {
    const { totalPages } = paginationInfo.value
    if (page >= 1 && page <= totalPages) {
      currentPage.value = page
      scrollToTarget()
    }
  }

  // 下一页
  const nextPage = () => {
    if (paginationInfo.value.hasNextPage) {
      currentPage.value++
      scrollToTarget()
    }
  }

  // 上一页
  const prevPage = () => {
    if (paginationInfo.value.hasPrevPage) {
      currentPage.value--
      scrollToTarget()
    }
  }

  // 设置每页显示数量
  const setPageSize = (size: number) => {
    pageSize.value = size
    currentPage.value = 1 // 重置到第一页
  }

  // 重置分页
  const reset = () => {
    currentPage.value = 1
    pageSize.value = initialPageSize
  }

  // 监听items变化，自动重置到第一页（如果当前页超出范围）
  watch(() => items.value.length, () => {
    const { totalPages } = paginationInfo.value
    if (currentPage.value > totalPages && totalPages > 0) {
      currentPage.value = 1
    }
  })

  return {
    currentPage: readonly(currentPage),
    pageSize,
    totalPages,
    currentPageItems,
    paginationInfo,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    reset
  }
}

