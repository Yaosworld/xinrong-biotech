import { ref, watch, type Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'

interface UseSearchOptions {
  delay?: number
  minLength?: number
}

interface UseSearchReturn {
  searchQuery: Ref<string>
  isSearching: Ref<boolean>
  debouncedQuery: Ref<string>
  clearSearch: () => void
}

/**
 * 通用搜索 Hook
 * @param onSearch 搜索回调函数
 * @param options 搜索选项
 */
export function useSearch(
  onSearch?: (query: string) => void | Promise<void>,
  options: UseSearchOptions = {}
): UseSearchReturn {
  const { delay = 300, minLength = 0 } = options
  
  const searchQuery = ref('')
  const isSearching = ref(false)
  const debouncedQuery = ref('')

  // 防抖搜索函数
  const debouncedSearch = useDebounceFn(async (query: string) => {
    debouncedQuery.value = query
    
    if (query.length < minLength) {
      isSearching.value = false
      return
    }

    isSearching.value = true

    try {
      if (onSearch) {
        await onSearch(query.trim())
      }
    } finally {
      isSearching.value = false
    }
  }, delay)

  // 监听搜索输入
  watch(searchQuery, (newQuery) => {
    if (newQuery.length === 0) {
      debouncedQuery.value = ''
      isSearching.value = false
      if (onSearch) {
        onSearch('')
      }
    } else {
      debouncedSearch(newQuery)
    }
  })

  // 清空搜索
  const clearSearch = () => {
    searchQuery.value = ''
    debouncedQuery.value = ''
    isSearching.value = false
  }

  return {
    searchQuery,
    isSearching,
    debouncedQuery,
    clearSearch
  }
}

/**
 * 高亮关键词工具函数
 */
export function highlightKeywords(text: string, keywords: string): string {
  if (!keywords || !text) return text

  const keywordList = keywords
    .trim()
    .split(/\s+/)
    .filter(keyword => keyword.length > 0)
    .map(keyword => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  if (keywordList.length === 0) return text

  let highlightedText = text

  keywordList.forEach(keyword => {
    const regex = new RegExp(`(${keyword})`, 'gi')
    highlightedText = highlightedText.replace(regex, '<mark class="search-highlight">$1</mark>')
  })

  return highlightedText
}

