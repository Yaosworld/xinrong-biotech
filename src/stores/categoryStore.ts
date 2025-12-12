import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Category } from '@/types'

// API 基础路径
const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// 默认分类数据（用于降级）
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'C01', name: '仪器设备', imageName: 'lab-instruments.png', description: '高精度科学仪器设备' },
  { id: 'C02', name: '实验耗材', imageName: 'lab-consumables.png', description: '实验室常用耗材' },
  { id: 'C03', name: '实验试剂', imageName: 'bio-reagents.png', description: '各类生物化学试剂' },
  { id: 'C04', name: '细胞相关产品', imageName: 'cell-experiments.png', description: '细胞培养相关产品' },
  { id: 'C05', name: '分子生物实验产品', imageName: 'molecular-biology.png', description: '分子生物学实验产品' }
]

// 默认图片路径
const DEFAULT_IMAGE = '/images/common/placeholder.png'
const IMAGE_BASE_PATH = '/images/products/'

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
  
  // 分类映射表（用于快速查找）
  const categoryMap = computed(() => {
    return new Map(categories.value.map(cat => [cat.id, cat]))
  })

  // 分类选项（用于下拉选择）
  const categoryOptions = computed(() => {
    return categories.value.map(cat => ({
      label: cat.name,
      value: cat.id
    }))
  })

  // ========================================
  // Actions
  // ========================================
  
  /**
   * 从API加载分类数据
   */
  async function loadCategories(): Promise<void> {
    if (loading.value) return
    
    loading.value = true
    error.value = null
    
    try {
      const res = await fetch(`${API_BASE}/content/category/published?pageSize=100`)
      if (!res.ok) throw new Error('获取分类数据失败')
      
      const result = await res.json()
      categories.value = result.data || []
      initialized.value = true
    } catch (e) {
      console.warn('加载分类失败，使用默认数据:', e)
      // 降级到默认数据
      categories.value = [...DEFAULT_CATEGORIES]
      error.value = e instanceof Error ? e.message : '加载分类失败'
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  /**
   * 根据ID获取分类
   */
  function getCategoryById(id: string): Category | undefined {
    // 优先从已加载数据中查找
    if (initialized.value) {
      return categoryMap.value.get(id)
    }
    // 降级到默认数据
    return DEFAULT_CATEGORIES.find(c => c.id === id)
  }

  /**
   * 根据ID获取分类名称
   */
  function getCategoryName(id: string): string {
    const category = getCategoryById(id)
    return category?.name || '未分类'
  }

  /**
   * 根据ID获取分类图片路径
   */
  function getCategoryImagePath(id: string): string {
    const category = getCategoryById(id)
    // 优先使用 imageUrl（新架构），降级到 imageName（旧架构）
    if (category?.imageUrl) {
      return category.imageUrl
    }
    if (category?.imageName) {
      return `${IMAGE_BASE_PATH}${category.imageName}`
    }
    return DEFAULT_IMAGE
  }

  /**
   * 清除缓存
   */
  function clearCache(): void {
    categories.value = []
    initialized.value = false
    error.value = null
  }

  /**
   * 确保分类数据已加载
   */
  async function ensureLoaded(): Promise<void> {
    if (!initialized.value && !loading.value) {
      await loadCategories()
    }
  }

  return {
    // State
    categories,
    loading,
    error,
    initialized,
    
    // Getters
    categoryMap,
    categoryOptions,
    
    // Actions
    loadCategories,
    getCategoryById,
    getCategoryName,
    getCategoryImagePath,
    clearCache,
    ensureLoaded
  }
})
