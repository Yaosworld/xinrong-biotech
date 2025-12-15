/**
 * 图片选择器配置
 * 
 * 定义各类型图片选择器的配置，供 ImagePicker 组件使用
 */

export interface ImagePickerConfig {
  /** API 路径 */
  apiPath: string
  /** 对话框标题 */
  title?: string
  /** 占位文本 */
  placeholder?: string
  /** 使用模式：exclusive=一对一，shared=多对多 */
  usageMode?: 'exclusive' | 'shared'
  /** 图片类型（用于 promotion 等场景） */
  imageType?: string
  /** 网格列数 */
  gridColumns?: number
  /** 图片宽高比 */
  aspectRatio?: string
  /** 对话框宽度 */
  dialogWidth?: string
  /** 上传提示 */
  uploadHint?: string
}

/**
 * 分类图片选择器配置
 */
export const CATEGORY_IMAGE_PICKER_CONFIG: ImagePickerConfig = {
  apiPath: '/api/admin/category-images',
  title: '选择分类图片',
  placeholder: '点击选择分类图片',
  usageMode: 'exclusive',
  gridColumns: 5,
  aspectRatio: '1',
  dialogWidth: '800px',
  uploadHint: '点击上传新图片'
}

/**
 * 促销封面图片选择器配置
 */
export const PROMOTION_COVER_PICKER_CONFIG: ImagePickerConfig = {
  apiPath: '/api/admin/promotion-images',
  title: '选择封面图片',
  placeholder: '点击选择封面图片',
  usageMode: 'shared',
  imageType: 'cover',
  gridColumns: 5,
  aspectRatio: '1',
  dialogWidth: '800px',
  uploadHint: '点击上传新封面图片'
}

/**
 * 促销海报图片选择器配置
 */
export const PROMOTION_POSTER_PICKER_CONFIG: ImagePickerConfig = {
  apiPath: '/api/admin/promotion-images',
  title: '选择海报图片',
  placeholder: '点击选择海报图片',
  usageMode: 'shared',
  imageType: 'poster',
  gridColumns: 4,
  aspectRatio: '2/3',
  dialogWidth: '800px',
  uploadHint: '点击上传新海报图片'
}

/**
 * 首页横幅图片选择器配置
 */
export const HOME_BANNER_PICKER_CONFIG: ImagePickerConfig = {
  apiPath: '/api/admin/home-images',
  title: '选择横幅图片',
  placeholder: '点击选择横幅图片',
  usageMode: 'shared',
  gridColumns: 4,
  aspectRatio: '16/9',
  dialogWidth: '900px',
  uploadHint: '点击上传新图片（建议尺寸 1920×900）'
}

/**
 * 所有图片选择器配置
 */
export const IMAGE_PICKER_CONFIGS = {
  category: CATEGORY_IMAGE_PICKER_CONFIG,
  promotionCover: PROMOTION_COVER_PICKER_CONFIG,
  promotionPoster: PROMOTION_POSTER_PICKER_CONFIG,
  homeBanner: HOME_BANNER_PICKER_CONFIG
} as const

export type ImagePickerType = keyof typeof IMAGE_PICKER_CONFIGS
