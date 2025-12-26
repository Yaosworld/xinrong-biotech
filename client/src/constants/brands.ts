/**
 * 品牌相关常量定义
 * 统一管理品牌配置，避免硬编码
 */

import type { BrandType } from '@/types'

/**
 * 国家/地区选项
 * 按使用频率排序
 */
export const COUNTRY_OPTIONS = [
  { label: '中国', value: '中国' },
  { label: '美国', value: '美国' },
  { label: '德国', value: '德国' },
  { label: '日本', value: '日本' },
  { label: '英国', value: '英国' },
  { label: '法国', value: '法国' },
  { label: '瑞士', value: '瑞士' },
  { label: '韩国', value: '韩国' },
  { label: '意大利', value: '意大利' },
  { label: '荷兰', value: '荷兰' },
  { label: '加拿大', value: '加拿大' },
  { label: '澳大利亚', value: '澳大利亚' }
] as const

/**
 * 国家值类型
 */
export type CountryValue = typeof COUNTRY_OPTIONS[number]['value']

/**
 * 品牌类型选项（用于下拉选择）
 */
export const BRAND_TYPE_OPTIONS = [
  { label: '自主品牌', value: 'own' },
  { label: '独家代理', value: 'exclusive' },
  { label: '一级代理', value: 'primary' },
  { label: '合作品牌', value: 'partner' }
] as const

/**
 * 品牌分类配置（用于表格分类筛选）
 */
export const BRAND_CATEGORIES = [
  { key: 'own', label: '自主品牌', filter: (item: { brand_type?: BrandType; is_own_brand?: boolean }) => 
    item.brand_type === 'own' || (item.brand_type === undefined && item.is_own_brand === true) },
  { key: 'exclusive', label: '独家代理', filter: (item: { brand_type?: BrandType }) => item.brand_type === 'exclusive' },
  { key: 'primary', label: '一级代理', filter: (item: { brand_type?: BrandType }) => item.brand_type === 'primary' },
  { key: 'partner', label: '合作品牌', filter: (item: { brand_type?: BrandType; is_own_brand?: boolean }) => 
    item.brand_type === 'partner' || (item.brand_type === undefined && item.is_own_brand !== true) }
] as const

/**
 * 品牌ID前缀
 */
export const BRAND_ID_PREFIX = 'B'

/**
 * 品牌ID位数（不含前缀）
 */
export const BRAND_ID_DIGITS = 3

/**
 * 生成品牌ID
 * @param existingBrands 现有品牌列表
 * @returns 新的品牌ID，格式如 B001, B002
 */
export function generateBrandId(existingBrands: Array<{ id?: string }>): string {
  const maxIdNum = existingBrands.reduce((max, item) => {
    const num = parseInt(item.id?.replace(BRAND_ID_PREFIX, '') || '0')
    return Math.max(max, num)
  }, 0)
  return `${BRAND_ID_PREFIX}${String(maxIdNum + 1).padStart(BRAND_ID_DIGITS, '0')}`
}

/**
 * 品牌占位符渐变色（统一使用主题蓝紫渐变）
 */
export const BRAND_PLACEHOLDER_GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'

/**
 * 默认品牌图片路径
 */
export const DEFAULT_BRAND_LOGO_PATH = '/images/common/brand-placeholder.svg'

/**
 * 品牌上传分类
 */
export const BRAND_UPLOAD_CATEGORIES = {
  LOGO: 'brand-logo',
  CERTIFICATE: 'brand-cert'
} as const
