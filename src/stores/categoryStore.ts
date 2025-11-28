import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Category } from '@/types'

export const useCategoryStore = defineStore('category', () => {
  // ========================================
  // State
  // ========================================
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // ========================================
  // Getters
  // ========================================
  
  // 分类ID到分类对象的Map
  const categoryMap = computed(() => {
    const map = new Map<string, Category>()
    categories.value.forEach(cat => {
      map.set(cat.id, cat)
    })
    return map
  })

  // 分类ID到分类名称的Map
  const categoryNameMap = computed(() => {
    const map = new Map<string, string>()
    categories.value.forEach(cat => {
      map.set(cat.id, cat.name)
    })
    return map
  })

  // ========================================
  // Actions
  // ========================================
  
  // 加载分类数据
  async function loadCategories() {
    if (initialized.value && categories.value.length > 0) {
      return // 已加载，直接返回
    }

    loading.value = true
    error.value = null

    try {
      const response = await fetch('/data/categories.json')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      categories.value = await response.json()
      initialized.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载分类数据失败'
      console.error('加载分类数据失败:', e)
    } finally {
      loading.value = false
    }
  }

  // 根据ID获取分类
  function getCategoryById(id: string): Category | undefined {
    return categoryMap.value.get(id)
  }

  // 根据ID获取分类名称
  function getCategoryName(id: string): string {
    return categoryNameMap.value.get(id) || '未分类'
  }

  // 根据ID获取分类图片路径
  function getCategoryImagePath(id: string): string {
    const category = getCategoryById(id)
    if (category && category.imageName) {
      return `/images/categories/${category.imageName}`
    }
    return '/images/common/placeholder.png'
  }

  return {
    // State
    categories,
    loading,
    error,
    initialized,
    
    // Getters
    categoryMap,
    categoryNameMap,
    
    // Actions
    loadCategories,
    getCategoryById,
    getCategoryName,
    getCategoryImagePath
  }
})

