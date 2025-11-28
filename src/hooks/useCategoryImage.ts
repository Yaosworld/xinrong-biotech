import { computed, type Ref, type ComputedRef } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'

/**
 * 根据分类ID获取对应的图片路径
 * 这是项目的核心业务逻辑：产品图片复用分类封面图
 */
export function useCategoryImage(categoryId: Ref<string> | string): ComputedRef<string> {
  const categoryStore = useCategoryStore()

  const imagePath = computed(() => {
    const id = typeof categoryId === 'string' ? categoryId : categoryId.value
    return categoryStore.getCategoryImagePath(id)
  })

  return imagePath
}

/**
 * 获取分类图片URL（带错误处理）
 */
export function useCategoryImageWithFallback(
  categoryId: Ref<string> | string,
  fallback: string = '/images/common/placeholder.png'
): {
  imagePath: ComputedRef<string>
  handleError: (event: Event) => void
} {
  const categoryStore = useCategoryStore()

  const imagePath = computed(() => {
    const id = typeof categoryId === 'string' ? categoryId : categoryId.value
    const path = categoryStore.getCategoryImagePath(id)
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

