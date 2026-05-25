import { computed, type Ref, type ComputedRef } from 'vue'
import type { Category } from '@/types'
import { useCategoryStore } from '@/stores/categoryStore'
import { DEFAULT_IMAGE_PATH } from '@/constants/categories'

// ========================================
// 动态分类数据（从 store 获取）
// ========================================

const emptyCategories: Category[] = []

/**
 * 获取分类列表（仅从 store/API 获取）
 */
export function getCategories(): Category[] {
  try {
    const store = useCategoryStore()
    return store.categories
  } catch {
    return emptyCategories
  }
}

/**
 * 导出 CATEGORIES 作为计算属性的替代（向后兼容）
 * 注意：这是一个 getter，每次访问都会获取最新数据
 */
export const CATEGORIES = new Proxy(emptyCategories, {
  get(_target, prop) {
    const categories = getCategories()
    if (prop === 'length') return categories.length
    if (prop === Symbol.iterator) return categories[Symbol.iterator].bind(categories)
    if (typeof prop === 'string' && !isNaN(Number(prop))) {
      return categories[Number(prop)]
    }
    if (typeof prop === 'string' && prop in Array.prototype) {
      return (categories as any)[prop]
    }
    return (categories as any)[prop]
  }
}) as Category[]

// ========================================
// 分类查询映射表
// ========================================
function getCategoryMap(): Map<string, Category> {
  return new Map(getCategories().map(cat => [cat.id, cat]))
}

// ========================================
// 工具函数
// ========================================

/**
 * 根据ID获取分类对象
 */
export function getCategoryById(id: string): Category | undefined {
  return getCategoryMap().get(id)
}

/**
 * 根据ID获取分类名称
 */
export function getCategoryName(id: string): string {
  return getCategoryMap().get(id)?.name || '未分类'
}

/**
 * 根据ID获取分类图片路径
 * 优先使用 imageUrl（由服务端计算）
 */
export function getCategoryImagePath(id: string): string {
  const category = getCategoryById(id)
  // 优先使用 imageUrl（服务端计算的完整路径）
  if (category?.imageUrl) {
    return category.imageUrl
  }
  return DEFAULT_IMAGE_PATH
}

// ========================================
// Composable Hooks
// ========================================

/**
 * 根据分类ID获取对应的图片路径
 * 这是项目的核心业务逻辑：产品图片复用分类封面图
 */
export function useCategoryImage(categoryId: Ref<string> | string): ComputedRef<string> {
  const imagePath = computed(() => {
    const id = typeof categoryId === 'string' ? categoryId : categoryId.value
    return getCategoryImagePath(id)
  })

  return imagePath
}

/**
 * 获取分类图片URL（带错误处理）
 */
export function useCategoryImageWithFallback(
  categoryId: Ref<string> | string,
  fallback: string = DEFAULT_IMAGE_PATH
): {
  imagePath: ComputedRef<string>
  handleError: (event: Event) => void
} {
  const imagePath = computed(() => {
    const id = typeof categoryId === 'string' ? categoryId : categoryId.value
    const path = getCategoryImagePath(id)
    return path || fallback
  })

  const handleError = (event: Event) => {
    const img = event.target as HTMLImageElement
    if (img && img.src !== fallback) {
      img.src = fallback
    }
  }

  return {
    imagePath,
    handleError
  }
}
