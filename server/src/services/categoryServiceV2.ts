/**
 * 分类服务 V2
 * 
 * 重构版本：
 * 1. 分类通过 imageId 关联图片（一对一）
 * 2. 图片由 categoryImageService 独立管理
 * 3. 保存时自动处理图片关联
 */
import db from '../db'
import { categoryImageService } from './categoryImageService'

export interface CategoryDataV2 {
  id: string           // 分类ID，如 "C01"
  name: string         // 分类名称
  imageId: number | null  // 关联的图片ID（新字段）
  description?: string // 分类描述
}

// 带图片信息的分类（用于前端显示）
export interface CategoryWithImage extends CategoryDataV2 {
  imageUrl: string
  imageName: string
  productCount?: number
}

export const DEFAULT_CATEGORIES_V2: Omit<CategoryDataV2, 'imageId'>[] = [
  { id: 'C01', name: '仪器设备', description: '高精度科学仪器设备，包括显微镜、光谱仪、分析仪等' },
  { id: 'C02', name: '实验耗材', description: '实验室常用耗材，包括培养皿、移液管、离心管等' },
  { id: 'C03', name: '实验试剂', description: '各类生物化学试剂，包括DNA提取试剂、PCR试剂、抗体等' },
  { id: 'C04', name: '细胞相关产品', description: '细胞培养相关产品，包括培养基、血清、培养瓶等' },
  { id: 'C05', name: '分子生物实验产品', description: '分子生物学实验产品，包括质粒、酶类、标记物等' }
]

export const categoryServiceV2 = {
  /**
   * 获取所有分类（带图片信息，用于后台）
   */
  getAllWithImages(): CategoryWithImage[] {
    const rows = db.queryAll(`
      SELECT draft_data, published_data FROM contents 
      WHERE content_type = 'category' AND status != 'deleted'
      ORDER BY sort_order ASC, id ASC
    `)
    
    const images = categoryImageService.getAll()
    const imageMap = new Map(images.map(img => [img.id, img]))
    
    return rows.map(row => {
      const data = row.draft_data || row.published_data
      if (!data) return null
      const cat = JSON.parse(data) as CategoryDataV2
      const image = cat.imageId ? imageMap.get(cat.imageId) : null
      return {
        ...cat,
        imageUrl: image?.url || '/images/common/placeholder.png',
        imageName: image?.filename || ''
      }
    }).filter(Boolean) as CategoryWithImage[]
  },

  /**
   * 获取分类及产品数量
   */
  getCategoriesWithCount(): CategoryWithImage[] {
    const categories = this.getAllWithImages()
    
    // 统计产品数量（包括草稿和已发布，与 canDelete 逻辑保持一致）
    const productRows = db.queryAll(`
      SELECT draft_data, published_data FROM contents 
      WHERE content_type = 'product' AND status != 'deleted'
    `)
    
    const countMap = new Map<string, number>()
    productRows.forEach(row => {
      const data = row.draft_data || row.published_data
      if (data) {
        const product = JSON.parse(data)
        if (product.categoryId) {
          countMap.set(product.categoryId, (countMap.get(product.categoryId) || 0) + 1)
        }
      }
    })
    
    return categories.map(cat => ({
      ...cat,
      productCount: countMap.get(cat.id) || 0
    }))
  },

  /**
   * 生成新的分类ID
   */
  generateCategoryId(): string {
    const rows = db.queryAll(`
      SELECT content_key FROM contents 
      WHERE content_type = 'category' AND status != 'deleted'
    `)
    
    const existingIds = new Set(rows.map(row => row.content_key))
    
    for (let i = 1; i <= 99; i++) {
      const id = `C${i.toString().padStart(2, '0')}`
      if (!existingIds.has(id)) return id
    }
    
    throw new Error('无法生成新的分类ID')
  },

  /**
   * 保存所有分类
   */
  saveAllCategories(categories: CategoryDataV2[]): void {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    
    const activeRows = db.queryAll(`
      SELECT content_key FROM contents 
      WHERE content_type = 'category' AND status != 'deleted'
    `)
    const activeIds = new Set(activeRows.map(row => row.content_key))
    const newIds = new Set(categories.map(c => c.id))
    
    // 找出需要删除的分类
    const toDeleteIds = [...activeIds].filter(id => !newIds.has(id))
    
    db.transaction(() => {
      // 删除不再需要的分类
      for (const id of toDeleteIds) {
        db.run(`DELETE FROM contents WHERE content_type = 'category' AND content_key = ?`, [id])
      }
      
      // 清理软删除的记录
      db.run(`DELETE FROM contents WHERE content_type = 'category' AND status = 'deleted'`)
      
      // 更新或创建分类
      categories.forEach((category, index) => {
        const data = JSON.stringify(category)
        
        if (activeIds.has(category.id)) {
          db.run(`
            UPDATE contents 
            SET draft_data = ?, published_data = ?, status = 'published', sort_order = ?, updated_at = ?, published_at = ?
            WHERE content_type = 'category' AND content_key = ?
          `, [data, data, index + 1, now, now, category.id])
        } else {
          db.run(`
            INSERT INTO contents (content_type, content_key, draft_data, published_data, status, sort_order, created_at, updated_at, published_at)
            VALUES (?, ?, ?, ?, 'published', ?, ?, ?, ?)
          `, ['category', category.id, data, data, index + 1, now, now, now])
        }
      })
    })
  },

  /**
   * 检查分类是否可删除
   */
  canDelete(categoryId: string): { canDelete: boolean; productCount: number } {
    const productRows = db.queryAll(`
      SELECT published_data FROM contents 
      WHERE content_type = 'product' AND status != 'deleted'
    `)
    
    let productCount = 0
    productRows.forEach(row => {
      const data = row.draft_data || row.published_data
      if (data) {
        const product = JSON.parse(data)
        if (product.categoryId === categoryId) productCount++
      }
    })
    
    return { canDelete: productCount === 0, productCount }
  },

  /**
   * 删除单个分类
   */
  deleteCategory(categoryId: string): { success: boolean; error?: string } {
    const { canDelete, productCount } = this.canDelete(categoryId)
    if (!canDelete) {
      return { success: false, error: `该分类下有 ${productCount} 个产品，无法删除` }
    }
    
    db.run(`DELETE FROM contents WHERE content_type = 'category' AND content_key = ?`, [categoryId])
    return { success: true }
  },

  /**
   * 获取所有已发布的分类（用于前台）
   */
  getAllPublished(): CategoryWithImage[] {
    const rows = db.queryAll(`
      SELECT published_data FROM contents 
      WHERE content_type = 'category' AND status = 'published' AND published_data IS NOT NULL
      ORDER BY sort_order ASC, id ASC
    `)
    
    const images = categoryImageService.getAll()
    const imageMap = new Map(images.map(img => [img.id, img]))
    
    return rows.map(row => {
      const cat = JSON.parse(row.published_data) as CategoryDataV2
      const image = cat.imageId ? imageMap.get(cat.imageId) : null
      return {
        ...cat,
        imageUrl: image?.url || '/images/common/placeholder.png',
        imageName: image?.filename || ''
      }
    })
  },

  /**
   * 根据名称或ID获取分类
   */
  getCategoryByNameOrId(value: string): CategoryWithImage | null {
    const categories = this.getAllPublished()
    return categories.find(c => c.id === value || c.name === value) || null
  },

  /**
   * 检测未定义的分类
   */
  detectUndefinedCategories(categoryValues: string[]): string[] {
    const categories = this.getAllPublished()
    const validIds = new Set(categories.map(c => c.id))
    const nameToId = new Map(categories.map(c => [c.name, c.id]))
    
    const undefinedCategories: string[] = []
    const seen = new Set<string>()
    
    for (const value of categoryValues) {
      if (!value || seen.has(value)) continue
      seen.add(value)
      
      const trimmed = value.trim()
      if (validIds.has(trimmed) || nameToId.has(trimmed)) continue
      undefinedCategories.push(trimmed)
    }
    
    return undefinedCategories
  },

  /**
   * 重置为默认分类
   */
  resetToDefault(): CategoryWithImage[] {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    
    db.transaction(() => {
      db.run(`DELETE FROM contents WHERE content_type = 'category'`)
      
      DEFAULT_CATEGORIES_V2.forEach((category, index) => {
        const data = JSON.stringify({ ...category, imageId: null })
        db.run(`
          INSERT INTO contents (content_type, content_key, draft_data, published_data, status, sort_order, created_at, updated_at, published_at)
          VALUES (?, ?, ?, ?, 'published', ?, ?, ?, ?)
        `, ['category', category.id, data, data, index + 1, now, now, now])
      })
    })
    
    return this.getCategoriesWithCount()
  }
}
