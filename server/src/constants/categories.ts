/**
 * 分类相关常量定义（后端）
 * 统一管理默认分类数据，避免多处重复定义
 */

/**
 * 分类数据接口
 */
export interface CategoryData {
  id: string           // 分类ID，如 "C01"
  name: string         // 分类名称
  imageId?: number | null  // 图片ID（一对一关联）
  description?: string // 分类描述
}

/**
 * 带图片信息的分类（用于前端显示）
 */
export interface CategoryWithImage extends CategoryData {
  imageUrl: string
  imageName: string
  productCount?: number
}

/**
 * 未分类的特殊ID
 */
export const UNCATEGORIZED_ID = 'C00'

/**
 * 默认分类数据（用于初始化）
 */
export const DEFAULT_CATEGORIES: CategoryData[] = [
  { 
    id: 'C01', 
    name: '仪器设备', 
    imageId: null,
    description: '高精度科学仪器设备，包括显微镜、光谱仪、分析仪等' 
  },
  { 
    id: 'C02', 
    name: '实验耗材', 
    imageId: null,
    description: '实验室常用耗材，包括培养皿、移液管、离心管等' 
  },
  { 
    id: 'C03', 
    name: '实验试剂', 
    imageId: null,
    description: '各类生物化学试剂，包括DNA提取试剂、PCR试剂、抗体等' 
  },
  { 
    id: 'C04', 
    name: '细胞相关产品', 
    imageId: null,
    description: '细胞培养相关产品，包括培养基、血清、培养瓶等' 
  },
  { 
    id: 'C05', 
    name: '分子生物实验产品', 
    imageId: null,
    description: '分子生物学实验产品，包括质粒、酶类、标记物等' 
  }
]

/**
 * 默认分类ID列表
 */
export const DEFAULT_CATEGORY_IDS = DEFAULT_CATEGORIES.map(c => c.id)
