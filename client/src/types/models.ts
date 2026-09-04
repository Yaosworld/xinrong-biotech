// ========================================
// 数据模型类型定义
// ========================================

/**
 * 分类接口
 */
export interface Category {
  id: string            // 分类ID, e.g., "C01"
  name: string          // 分类名称, e.g., "精密仪器"
  imageId?: number      // 关联的图片ID（新架构）
  imageName?: string    // 对应图片文件名（旧架构兼容）
  imageUrl?: string     // 图片完整URL（由服务端计算）
  description?: string  // 分类描述
}

/**
 * 产品接口
 */
export interface Product {
  id: string            // 产品ID, e.g., "P000001" (P + 6位数字，自增不重用)
  name: string          // 产品名称
  categoryId: string    // 分类ID (外键)
  brand?: string        // 品牌名称
  sku?: string          // 产品SKU编码
  price?: string | number  // 价格信息，如 "¥299/盒"、"面议"
  specs: string         // 规格参数
  unit?: string         // 销售单位, e.g., "台"
  desc: string          // 产品详细描述
  detailImageUrl?: string        // 产品主展示图，优先于分类图
  descriptionImageUrl?: string   // 产品描述海报
}

/**
 * 品牌分类类型
 */
export type BrandType = 'own' | 'exclusive' | 'primary' | 'partner'

/**
 * 品牌分类配置
 */
export const BRAND_TYPE_CONFIG: Record<BrandType, { label: string; badge: string; subtitle: string }> = {
  own: { label: '自主品牌', badge: '自主品牌', subtitle: '自主研发，品质保证' },
  exclusive: { label: '独家代理', badge: '独家代理', subtitle: '独家授权，正品保障' },
  primary: { label: '一级代理', badge: '一级代理', subtitle: '厂家直供，价格优势' },
  partner: { label: '合作品牌', badge: '合作品牌', subtitle: '全球知名品牌，值得信赖' }
}

/**
 * 品牌接口
 * 
 * 字段命名规范：
 * - 使用下划线命名法（snake_case）
 * - 布尔字段使用 is_ 前缀
 * - URL 字段使用 _url 后缀
 */
export interface Brand {
  // === 核心字段 ===
  id: string                  // 品牌ID, e.g., "B001"
  name: string                // 品牌名称
  
  // === 图片字段 ===
  logo_url?: string           // Logo 图片路径
  certificate_url?: string    // 品牌授权证书图片路径
  
  // === 分类字段 ===
  brand_type?: BrandType      // 品牌分类：own=自主品牌, exclusive=独家代理, primary=一级代理, partner=合作品牌
  country?: string            // 品牌国家/地区
  
  // === 展示字段 ===
  description?: string        // 品牌描述
  website?: string            // 官网链接
  sort_order?: number         // 排序顺序（越小越靠前）
  
  // === 兼容旧字段（逐步废弃，仅用于数据迁移） ===
  /** @deprecated 使用 brand_type 替代 */
  is_own_brand?: boolean
  /** @deprecated 使用 id 替代 */
  brand_id?: string
  /** @deprecated 使用 name 替代 */
  show_name?: string
  /** @deprecated 使用 is_own_brand 替代 */
  is_own?: boolean
  /** @deprecated 使用 website 替代 */
  website_url?: string
}

/**
 * 促销/资讯活动接口
 */
export interface Promotion {
  id: string               // 促销活动 ID (统一使用字符串，如 "A001")
  title: string            // 标题
  summary: string          // 摘要
  description?: string     // 详细描述
  
  // 图片信息（新架构：使用 ID 关联）
  coverId?: number | null  // 封面图片ID
  posterId?: number | null // 海报图片ID
  cover_url?: string       // 封面图片URL（兼容旧数据/动态计算）
  poster_url?: string      // 海报图片URL（兼容旧数据/动态计算）
  
  icon_class?: string      // FontAwesome 图标类名
  
  // 时间信息
  publish_date?: string    // 发布日期 (YYYY-MM-DD)
  start_date?: string      // 开始日期 (YYYY-MM-DD)
  end_date?: string        // 结束日期 (YYYY-MM-DD)
  
  // 价格信息
  original_price?: number  // 原价
  current_price?: number   // 现价
  discount_badge?: string  // 折扣标签 (e.g., "8折")
  
  // 扩展信息
  tags?: string[]          // 标签数组
  applicable_products?: string  // 适用产品描述
  
  // 时间状态信息 (动态计算，非存储字段)
  timeStatus?: PromotionTimeStatus  // 活动时间状态
  timeStatusText?: string           // 时间状态文本
  
  // 兼容旧字段（逐步废弃）
  status?: PromotionTimeStatus | 'all'  // 兼容旧代码
  statusText?: string                    // 兼容旧代码
}

/**
 * 促销时间状态类型（动态计算）
 * 与数据库状态（draft/published/deleted）区分
 */
export type PromotionTimeStatus = 'active' | 'ended' | 'coming' | 'endingSoon'

/**
 * 促销状态类型（兼容旧代码）
 * @deprecated 使用 PromotionTimeStatus 替代
 */
export type PromotionStatus = PromotionTimeStatus | 'all'

/**
 * 排序方式类型
 */
export type SortOption = 
  | 'name-asc' 
  | 'name-desc' 
  | 'featured'
  | 'priority'

/**
 * 产品筛选条件
 */
export interface ProductFilters {
  search: string
  categoryId: string
  brand: string
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
  timeStatus?: PromotionTimeStatus | 'all'  // 按时间状态筛选
  dateRange?: [string, string] | null       // 按日期范围筛选 [startDate, endDate]
  tags?: string[]                           // 按标签筛选
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
