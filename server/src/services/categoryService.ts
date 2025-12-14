/**
 * 分类服务（重构版）
 * 
 * 设计原则：
 * 1. 分类通过 imageId 关联图片（一对一）
 * 2. 图片由 categoryImageService 独立管理
 * 3. 移除旧的 imageName 关联方式
 * 4. 添加产品数量缓存机制
 */
import db from '../db'
import { categoryImageService } from './categoryImageService'
import { 
  CategoryData, 
  CategoryWithImage, 
  DEFAULT_CATEGORIES, 
  UNCATEGORIZED_ID 
} from '../constants/categories'

// 重新导出类型和常量
export type { CategoryData, CategoryWithImage }
export { DEFAULT_CATEGORIES, UNCATEGORIZED_ID }

// ========================================
// 缓存机制
// ========================================

interface ProductCountCache {
  data: Map<string, number>
  timestamp: number
  ttl: number // 缓存有效期（毫秒）
}

const productCountCache: ProductCountCache = {
  data: new Map(),
  timestamp: 0,
  ttl: 60000 // 1分钟缓存
}

/**
 * 使缓存失效
 */
function invalidateCache(): void {
  productCountCache.timestamp = 0
  productCountCache.data.clear()
}

/**
 * 获取产品数量统计（带缓存）
 */
function getProductCountMap(): Map<string, number> {
  const now = Date.now()
  
  // 检查缓存是否有效
  if (productCountCache.timestamp > 0 && 
      now - productCountCache.timestamp < productCountCache.ttl) {
    return productCountCache.data
  }
  
  // 重新计算
  const countMap = new Map<string, number>()
  const productRows = db.queryAll(`
    SELECT draft_data, published_data FROM contents 
    WHERE content_type = 'product' AND status != 'deleted'
  `)
  
  productRows.forEach(row => {
    // 优先使用草稿数据（与 canDelete 逻辑保持一致）
    const data = row.draft_data || row.published_data
    if (data) {
      try {
        const product = JSON.parse(data)
        if (product.categoryId) {
          countMap.set(product.categoryId, (countMap.get(product.categoryId) || 0) + 1)
        }
      } catch {
        // 忽略解析错误
      }
    }
  })
  
  // 更新缓存
  productCountCache.data = countMap
  productCountCache.timestamp = now
  
  return countMap
}

// ========================================
// 图片URL计算
// ========================================

/**
 * 根据图片ID获取图片URL
 */
function getImageUrl(imageId: number | null | undefined, imageMap: Map<number, { filename: string; path: string }>): string {
  if (!imageId) {
    return '/images/common/placeholder.png'
  }
  
  const image = imageMap.get(imageId)
  if (!image) {
    return '/images/common/placeholder.png'
  }
  
  const fs = require('fs')
  const path = require('path')
  const UPLOAD_BASE = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads')
  const uploadPath = path.join(UPLOAD_BASE, 'images/products', image.filename)
  
  if (fs.existsSync(uploadPath)) {
    return `/uploads/images/products/${image.filename}`
  }
  
  // 预设图片在 public 目录
  return `/images/products/${image.filename}`
}

/**
 * 构建图片映射表
 */
function buildImageMap(): Map<number, { filename: string; path: string }> {
  const imageRows = db.queryAll('SELECT id, filename, path FROM category_images')
  return new Map(imageRows.map(row => [row.id, { filename: row.filename, path: row.path }]))
}

// ========================================
// 分类服务
// ========================================

export const categoryService = {
  /**
   * 使缓存失效（供外部调用）
   */
  invalidateCache,

  /**
   * 获取所有已发布的分类（用于前台）
   */
  getAllPublished(): CategoryWithImage[] {
    const rows = db.queryAll(`
      SELECT published_data FROM contents 
      WHERE content_type = 'category' AND status = 'published' AND published_data IS NOT NULL
      ORDER BY sort_order ASC, id ASC
    `)
    
    const imageMap = buildImageMap()
    
    return rows.map(row => {
      const cat = JSON.parse(row.published_data) as CategoryData
      const imageName = cat.imageId ? imageMap.get(cat.imageId)?.filename || '' : ''
      return {
        ...cat,
        imageUrl: getImageUrl(cat.imageId, imageMap),
        imageName
      }
    })
  },

  /**
   * 获取所有分类（包含草稿，用于后台）
   */
  getAllAdmin(): CategoryWithImage[] {
    const rows = db.queryAll(`
      SELECT draft_data, published_data FROM contents 
      WHERE content_type = 'category' AND status != 'deleted'
      ORDER BY sort_order ASC, id ASC
    `)
    
    const imageMap = buildImageMap()
    
    return rows.map(row => {
      const data = row.draft_data || row.published_data
      if (!data) return null
      
      const cat = JSON.parse(data) as CategoryData
      const imageName = cat.imageId ? imageMap.get(cat.imageId)?.filename || '' : ''
      return {
        ...cat,
        imageUrl: getImageUrl(cat.imageId, imageMap),
        imageName
      }
    }).filter(Boolean) as CategoryWithImage[]
  },

  /**
   * 生成新的分类ID
   * 格式: C + 两位数字，如 C01, C02, ..., C99
   */
  generateCategoryId(): string {
    const rows = db.queryAll(`
      SELECT content_key FROM contents 
      WHERE content_type = 'category' AND status != 'deleted'
    `)
    
    const existingIds = new Set(rows.map(row => row.content_key))
    
    // 从 C01 开始查找可用的ID
    for (let i = 1; i <= 99; i++) {
      const id = `C${i.toString().padStart(2, '0')}`
      if (!existingIds.has(id)) {
        return id
      }
    }
    
    // 如果 C01-C99 都用完了，使用 C + 3位数字
    for (let i = 100; i <= 999; i++) {
      const id = `C${i}`
      if (!existingIds.has(id)) {
        return id
      }
    }
    
    throw new Error('无法生成新的分类ID，已达到上限')
  },

  /**
   * 获取分类及其关联的产品数量（含图片信息）
   */
  getCategoriesWithCount(): Array<CategoryWithImage & { productCount: number }> {
    const categories = this.getAllAdmin()
    const countMap = getProductCountMap()
    
    return categories.map(cat => ({
      ...cat,
      productCount: countMap.get(cat.id) || 0
    }))
  },

  /**
   * 检查分类是否可以删除
   * @returns canDelete: 是否可删除, productCount: 关联产品数量
   */
  canDelete(categoryId: string): { canDelete: boolean; productCount: number } {
    const countMap = getProductCountMap()
    const productCount = countMap.get(categoryId) || 0
    
    return {
      canDelete: productCount === 0,
      productCount
    }
  },

  /**
   * 检测未定义的分类
   * @param categoryValues Excel中的分类值列表（可能是ID或名称）
   * @returns 未定义的分类值列表
   */
  detectUndefinedCategories(categoryValues: string[]): string[] {
    const categories = this.getAllPublished()
    
    // 构建ID和名称的映射
    const validIds = new Set(categories.map(c => c.id))
    const nameToId = new Map(categories.map(c => [c.name, c.id]))
    
    const undefinedCategories: string[] = []
    const seen = new Set<string>()
    
    for (const value of categoryValues) {
      if (!value || seen.has(value)) continue
      seen.add(value)
      
      const trimmed = value.trim()
      // 检查是否是有效的ID
      if (validIds.has(trimmed)) continue
      // 检查是否是有效的名称
      if (nameToId.has(trimmed)) continue
      
      // 未定义的分类
      undefinedCategories.push(trimmed)
    }
    
    return undefinedCategories
  },

  /**
   * 根据名称或ID获取分类
   */
  getCategoryByNameOrId(value: string): CategoryWithImage | null {
    const categories = this.getAllPublished()
    return categories.find(c => c.id === value || c.name === value) || null
  },

  /**
   * 初始化默认分类数据
   * 仅在数据库中没有分类数据时执行
   */
  initDefaultCategories(): void {
    const existing = db.queryOne(`
      SELECT COUNT(*) as count FROM contents WHERE content_type = 'category'
    `)
    
    if (existing && existing.count > 0) {
      console.log('📂 分类数据已存在，跳过初始化')
      return
    }
    
    console.log('📂 初始化默认分类数据...')
    
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    
    db.transaction(() => {
      DEFAULT_CATEGORIES.forEach((category, index) => {
        const data = JSON.stringify(category)
        db.run(`
          INSERT INTO contents (content_type, content_key, draft_data, published_data, status, sort_order, created_at, updated_at, published_at)
          VALUES (?, ?, ?, ?, 'published', ?, ?, ?, ?)
        `, ['category', category.id, data, data, index + 1, now, now, now])
      })
    })
    
    console.log(`✅ 已初始化 ${DEFAULT_CATEGORIES.length} 个默认分类`)
  },

  /**
   * 重置为默认分类数据
   * 会删除所有现有分类并重新创建默认分类
   */
  resetToDefaultCategories(): CategoryWithImage[] {
    console.log('📂 重置为默认分类数据...')
    
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    
    db.transaction(() => {
      // 删除所有现有分类
      db.run(`DELETE FROM contents WHERE content_type = 'category'`)
      
      // 创建默认分类
      DEFAULT_CATEGORIES.forEach((category, index) => {
        const data = JSON.stringify(category)
        db.run(`
          INSERT INTO contents (content_type, content_key, draft_data, published_data, status, sort_order, created_at, updated_at, published_at)
          VALUES (?, ?, ?, ?, 'published', ?, ?, ?, ?)
        `, ['category', category.id, data, data, index + 1, now, now, now])
      })
    })
    
    // 使缓存失效
    invalidateCache()
    
    console.log(`✅ 已重置为 ${DEFAULT_CATEGORIES.length} 个默认分类`)
    
    return this.getCategoriesWithCount()
  },

  /**
   * 创建新分类（同时保存草稿和发布）
   */
  createCategory(data: Omit<CategoryData, 'id'>, autoPublish = true): CategoryData {
    const id = this.generateCategoryId()
    const category: CategoryData = { id, ...data }
    
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    const categoryData = JSON.stringify(category)
    
    // 获取当前最大排序值
    const maxOrder = db.queryOne(`
      SELECT MAX(sort_order) as max FROM contents WHERE content_type = 'category'
    `)
    const sortOrder = (maxOrder?.max || 0) + 1
    
    if (autoPublish) {
      db.run(`
        INSERT INTO contents (content_type, content_key, draft_data, published_data, status, sort_order, created_at, updated_at, published_at)
        VALUES (?, ?, ?, ?, 'published', ?, ?, ?, ?)
      `, ['category', id, categoryData, categoryData, sortOrder, now, now, now])
    } else {
      db.run(`
        INSERT INTO contents (content_type, content_key, draft_data, status, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, 'draft', ?, ?, ?)
      `, ['category', id, categoryData, sortOrder, now, now])
    }
    
    // 使缓存失效
    invalidateCache()
    
    return category
  },

  /**
   * 批量创建分类（同时保存草稿和发布）
   */
  batchCreateCategories(items: Array<Omit<CategoryData, 'id'>>, autoPublish = true): CategoryData[] {
    return items.map(item => this.createCategory(item, autoPublish))
  },

  /**
   * 直接保存所有分类到数据库（替换现有数据）
   * 用于分类管理页面的保存操作
   */
  saveAllCategories(categories: CategoryData[]): void {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    
    // 获取当前数据库中所有活跃分类
    const activeRows = db.queryAll(`
      SELECT content_key FROM contents 
      WHERE content_type = 'category' AND status != 'deleted'
    `)
    const activeIds = new Set(activeRows.map(row => row.content_key))
    const newIds = new Set(categories.map(c => c.id))
    
    // 找出需要删除的分类（当前活跃但不在新数据中）
    const toDeleteIds = [...activeIds].filter(id => !newIds.has(id))
    
    db.transaction(() => {
      // 1. 物理删除不再需要的分类记录
      for (const id of toDeleteIds) {
        db.run(`DELETE FROM contents WHERE content_type = 'category' AND content_key = ?`, [id])
      }
      
      // 2. 清理所有已软删除的分类记录（物理删除）
      db.run(`DELETE FROM contents WHERE content_type = 'category' AND status = 'deleted'`)
      
      // 3. 更新或创建分类
      categories.forEach((category, index) => {
        const data = JSON.stringify(category)
        
        if (activeIds.has(category.id)) {
          // 更新现有活跃分类
          db.run(`
            UPDATE contents 
            SET draft_data = ?, published_data = ?, status = 'published', sort_order = ?, updated_at = ?, published_at = ?
            WHERE content_type = 'category' AND content_key = ?
          `, [data, data, index + 1, now, now, category.id])
        } else {
          // 创建新分类（直接发布）
          db.run(`
            INSERT INTO contents (content_type, content_key, draft_data, published_data, status, sort_order, created_at, updated_at, published_at)
            VALUES (?, ?, ?, ?, 'published', ?, ?, ?, ?)
          `, ['category', category.id, data, data, index + 1, now, now, now])
        }
      })
    })
    
    // 使缓存失效
    invalidateCache()
  },

  /**
   * 删除分类
   */
  deleteCategory(categoryId: string): { success: boolean; error?: string } {
    // 检查是否可以删除
    const { canDelete, productCount } = this.canDelete(categoryId)
    if (!canDelete) {
      return { success: false, error: `该分类下有 ${productCount} 个产品，无法删除` }
    }
    
    // 检查分类是否存在
    const row = db.queryOne(`
      SELECT id FROM contents 
      WHERE content_type = 'category' AND content_key = ? AND status != 'deleted'
    `, [categoryId])
    
    if (!row) {
      return { success: false, error: '分类不存在' }
    }
    
    // 物理删除记录
    db.run(`DELETE FROM contents WHERE content_type = 'category' AND content_key = ?`, [categoryId])
    
    // 使缓存失效
    invalidateCache()
    
    return { success: true }
  }
}
