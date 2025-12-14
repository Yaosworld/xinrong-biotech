/**
 * 分类相关常量定义
 * 统一管理默认分类数据，避免多处重复定义
 */

import type { Category } from '@/types'

/**
 * 未分类的特殊ID
 */
export const UNCATEGORIZED_ID = 'C00'

/**
 * 默认分类数据（用于初始化和降级）
 */
export const DEFAULT_CATEGORIES: Category[] = [
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

/**
 * 默认分类ID列表
 */
export const DEFAULT_CATEGORY_IDS = DEFAULT_CATEGORIES.map(c => c.id)

/**
 * 分类ID到名称的映射
 */
export const CATEGORY_ID_TO_NAME = new Map(
  DEFAULT_CATEGORIES.map(c => [c.id, c.name])
)

/**
 * 分类名称到ID的映射
 */
export const CATEGORY_NAME_TO_ID = new Map(
  DEFAULT_CATEGORIES.map(c => [c.name, c.id])
)

/**
 * 默认图片路径
 */
export const DEFAULT_IMAGE_PATH = '/images/common/placeholder.png'

/**
 * 产品图片基础路径
 */
export const PRODUCT_IMAGE_BASE_PATH = '/images/products/'
