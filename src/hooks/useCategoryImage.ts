import { computed, type Ref, type ComputedRef } from 'vue'
import type { Category } from '@/types'

// ========================================
// 分类数据常量（静态配置）
// ========================================
export const CATEGORIES: Category[] = [
  {
    id: 'C01',
    name: '仪器设备',
    imageName: 'lab-instruments.png',
    description: '高精度科学仪器设备，包括显微镜、光谱仪、分析仪等'
  },
  {
    id: 'C02',
    name: '实验耗材',
    imageName: 'lab-consumables.png',
    description: '实验室常用耗材，包括培养皿、移液管、离心管等'
  },
  {
    id: 'C03',
    name: '实验试剂',
    imageName: 'bio-reagents.png',
    description: '各类生物化学试剂，包括DNA提取试剂、PCR试剂、抗体等'
  },
  {
    id: 'C04',
    name: '细胞相关产品',
    imageName: 'cell-experiments.png',
    description: '细胞培养相关产品，包括培养基、血清、培养瓶等'
  },
  {
    id: 'C05',
    name: '分子生物实验产品',
    imageName: 'molecular-biology.png',
    description: '分子生物学实验产品，包括质粒、酶类、标记物等'
  }
]

// ========================================
// 分类查询映射表（懒加载）
// ========================================
let categoryMapCache: Map<string, Category> | null = null

function getCategoryMap(): Map<string, Category> {
  if (!categoryMapCache) {
    categoryMapCache = new Map(CATEGORIES.map(cat => [cat.id, cat]))
  }
  return categoryMapCache
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
 */
export function getCategoryImagePath(id: string): string {
  const category = getCategoryById(id)
  if (category && category.imageName) {
    return `/images/products/${category.imageName}`
  }
  return '/images/common/placeholder.png'
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
  fallback: string = '/images/common/placeholder.png'
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

