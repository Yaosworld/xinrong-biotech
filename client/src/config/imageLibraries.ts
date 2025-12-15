/**
 * 图片库配置
 * 
 * 定义各类型图片库管理页面的配置，供 ImageLibraryPage 组件使用
 */

export interface ImageLibraryConfig {
  /** 页面标题 */
  title: string
  /** API 路径 */
  apiPath: string
  /** 使用模式 */
  usageMode?: 'exclusive' | 'shared'
  /** 是否有类型筛选 */
  hasTypeFilter?: boolean
  /** 类型选项 */
  typeOptions?: { label: string; value: string; icon?: string }[]
  /** 图片宽高比 */
  aspectRatio?: string
  /** 上传提示 */
  uploadHint?: string
}

/**
 * 分类图片库配置
 */
export const CATEGORY_IMAGE_LIBRARY_CONFIG: ImageLibraryConfig = {
  title: '分类图片库',
  apiPath: '/api/admin/category-images',
  usageMode: 'exclusive',
  aspectRatio: '1',
  uploadHint: '点击上传新图片'
}

/**
 * 促销图片库配置
 */
export const PROMOTION_IMAGE_LIBRARY_CONFIG: ImageLibraryConfig = {
  title: '促销活动图片库',
  apiPath: '/api/admin/promotion-images',
  usageMode: 'shared',
  hasTypeFilter: true,
  typeOptions: [
    { label: '封面图', value: 'cover', icon: 'fas fa-image' },
    { label: '海报图', value: 'poster', icon: 'fas fa-file-image' }
  ],
  aspectRatio: '1',
  uploadHint: '点击上传新图片'
}

/**
 * 首页图片库配置
 */
export const HOME_IMAGE_LIBRARY_CONFIG: ImageLibraryConfig = {
  title: '首页图片库',
  apiPath: '/api/admin/home-images',
  usageMode: 'shared',
  aspectRatio: '16/9',
  uploadHint: '点击上传新图片（建议尺寸 1920×900）'
}

/**
 * 所有图片库配置
 */
export const IMAGE_LIBRARY_CONFIGS = {
  category: CATEGORY_IMAGE_LIBRARY_CONFIG,
  promotion: PROMOTION_IMAGE_LIBRARY_CONFIG,
  home: HOME_IMAGE_LIBRARY_CONFIG
} as const

export type ImageLibraryType = keyof typeof IMAGE_LIBRARY_CONFIGS
