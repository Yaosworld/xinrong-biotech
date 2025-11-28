// ========================================
// 数据模型类型定义
// ========================================

/**
 * 分类接口
 */
export interface Category {
  id: string            // 分类ID, e.g., "C01"
  name: string          // 分类名称, e.g., "精密仪器"
  imageName: string     // 对应图片文件名, e.g., "instrument-cover.jpg"
  description?: string  // 分类描述
}

/**
 * 产品接口
 */
export interface Product {
  id: string            // 产品ID, e.g., "P1001"
  name: string          // 产品名称
  categoryId: string    // 分类ID (外键)
  brand?: string        // 品牌名称
  sku?: string          // 产品SKU编码
  specs: string         // 规格参数
  unit?: string         // 销售单位, e.g., "台"
  desc: string          // 产品详细描述
  
  // 价格与库存字段 (可选，用于筛选功能)
  originalPrice?: number   // 原价
  currentPrice?: number    // 现价（促销价）
  stock?: number           // 库存数量
  isOnSale?: boolean       // 是否促销中
}

/**
 * 品牌接口
 */
export interface Brand {
  id: string                // 品牌ID, e.g., "B001"
  brand_id?: string         // 兼容旧字段
  name: string              // 品牌名称
  show_name?: string        // 兼容旧字段
  logo_url?: string         // Logo 图片路径
  category?: string         // 品牌分类
  route?: string | null     // 品牌详情页路由
  is_own?: boolean          // 是否为自主品牌
  is_own_brand?: boolean    // 兼容字段
  
  // 扩展字段
  description?: string      // 品牌描述
  country?: string          // 品牌国家/地区
  is_featured?: boolean     // 是否推荐品牌
  product_count?: number    // 关联产品数量
  priority?: number         // 显示优先级
  website_url?: string      // 官网链接
}

/**
 * 促销/资讯活动接口
 */
export interface Promotion {
  id: number               // 促销活动 ID
  title: string            // 标题
  summary: string          // 摘要
  description?: string     // 详细描述
  image_url?: string       // 活动图片
  icon_class?: string      // FontAwesome 图标类名
  
  // 时间信息
  start_date?: string      // 开始日期 (YYYY-MM-DD)
  end_date?: string        // 结束日期 (YYYY-MM-DD)
  
  // 价格信息
  original_price?: number  // 原价
  current_price?: number   // 现价
  discount_badge?: string  // 折扣标签 (e.g., "8折")
  
  // 扩展信息
  category?: string        // 活动分类
  tags?: string[]          // 标签数组
  is_featured?: boolean    // 是否为推荐活动
  priority?: number        // 显示优先级
  applicable_products?: string  // 适用产品描述
  
  // 状态信息 (动态计算)
  status?: 'active' | 'ended' | 'coming'  // 活动状态
  statusText?: string      // 状态文本
}

/**
 * 促销状态类型
 */
export type PromotionStatus = 'active' | 'ended' | 'coming' | 'all'

/**
 * 排序方式类型
 */
export type SortOption = 
  | 'name-asc' 
  | 'name-desc' 
  | 'price-asc' 
  | 'price-desc' 
  | 'featured'
  | 'priority'
  | 'date-asc'
  | 'date-desc'

/**
 * 产品筛选条件
 */
export interface ProductFilters {
  search: string
  categoryId: string
  brand: string
  priceRange: [number, number]
  inStock: boolean
  hasDiscount: boolean
}

/**
 * 品牌筛选条件
 */
export interface BrandFilters {
  search: string
  categoryId: string
  alphabet: string
  country: string
  hasProducts: boolean
  featured: boolean
}

/**
 * 促销筛选条件
 */
export interface PromotionFilters {
  search: string
  status: PromotionStatus
  dateRange: [string, string] | null
  hasDiscount: boolean
  priceRange: [number, number]
  category: string
  tags: string[]
}

/**
 * 分页信息
 */
export interface PaginationInfo {
  currentPage: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  startIndex: number
  endIndex: number
}

