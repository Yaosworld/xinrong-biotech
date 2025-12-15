/**
 * 品牌相关常量定义（后端）
 * 与前端 src/constants/brands.ts 保持一致
 */

/**
 * 品牌ID前缀
 */
export const BRAND_ID_PREFIX = 'B'

/**
 * 品牌ID位数（不含前缀）
 */
export const BRAND_ID_DIGITS = 3

/**
 * 品牌上传分类
 */
export const BRAND_UPLOAD_CATEGORIES = {
  LOGO: 'brand-logo',
  CERTIFICATE: 'brand-cert'
} as const

/**
 * 国家/地区列表
 */
export const COUNTRIES = [
  '中国', '美国', '德国', '日本', '英国', 
  '法国', '瑞士', '韩国', '意大利', '荷兰', 
  '加拿大', '澳大利亚'
] as const

export type Country = typeof COUNTRIES[number]
