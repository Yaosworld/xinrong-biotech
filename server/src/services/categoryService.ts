import db from '../db'
import { contentService } from './contentService'

/**
 * 分类数据接口
 */
export interface CategoryData {
  id: string           // 分类ID，如 "C01"
  name: string         // 分类名称
  imageName: string    // 图片文件名
  description?: string // 分类描述
}

/**
 * 默认分类数据（用于初始化）
 */
export const DEFAULT_CATEGORIES: CategoryData[] = [
  { id: 'C01', name: '仪器设备', imageName: 'lab-instruments.png', description: '高精度科学仪器设备，包括显微镜、光谱仪、分析仪等' },
  { id: 'C02', name: '实验耗材', imageName: 'lab-consumables.png', description: '实验室常用耗材，包括培养皿、移液管、离心管等' },
  { id: 'C03', name: '实验试剂', imageName: 'bio-reagents.png', description: '各类生物化学试剂，包括DNA提取试剂、PCR试剂、抗体等' },
  { id: 'C04', name: '细胞相关产品', imageName: 'cell-experiments.png', description: '细胞培养相关产品，包括培养基、血清、培养瓶等' },
  { id: 'C05', name: '分子生物实验产品', imageName: 'molecular-biology.png', description: '分子生物学实验产品，包括质粒、酶类、标记物等' }
]

/**
 * 未分类的特殊ID
 */
export const UNCATEGORIZED_ID = 'C00'

export const categoryService = {
  /**
   * 获取所有已发布的分类
   */
  getAllPublished(): CategoryData[] {
    const rows = db.queryAll(`
      SELECT published_data FROM contents 
      WHERE content_type = 'category' AND status = 'published' AND published_data IS NOT NULL
      ORDER BY sort_order ASC, id ASC
    `)
    
    return rows.map(row => JSON.parse(row.published_data) as CategoryData)
  },

  /**
   * 获取所有分类（包含草稿，用于后台）
   */
  getAllAdmin(): CategoryData[] {
    const rows = db.queryAll(`
      SELECT draft_data, published_data FROM contents 
      WHERE content_type = 'category' AND status != 'deleted'
      ORDER BY sort_order ASC, id ASC
    `)
    
    return rows.map(row => {
      const data = row.draft_data || row.published_data
      return data ? JSON.parse(data) as CategoryData : null
    }).filter(Boolean) as CategoryData[]
  },

  /**
   * 生成新的分类ID
   * 格式: C + 两位数字，如 C01, C02, ..., C99
   */
  generateCategoryId(): string {
    // 获取所有现有的分类ID
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
   * 获取分类及其关联的产品数量
   */
  getCategoriesWithCount(): Array<CategoryData & { productCount: number }> {
    // 获取所有分类
    const categories = this.getAllAdmin()
    
    // 获取所有已发布产品的分类统计
    const productRows = db.queryAll(`
      SELECT published_data FROM contents 
      WHERE content_type = 'product' AND status = 'published' AND published_data IS NOT NULL
    `)
    
    // 统计每个分类的产品数量
    const countMap = new Map<string, number>()
    productRows.forEach(row => {
      const product = JSON.parse(row.published_data)
      if (product.categoryId) {
        countMap.set(product.categoryId, (countMap.get(product.categoryId) || 0) + 1)
      }
    })
    
    // 合并数据
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
    // 统计该分类下的产品数量
    const productRows = db.queryAll(`
      SELECT published_data FROM contents 
      WHERE content_type = 'product' AND status != 'deleted'
    `)
    
    let productCount = 0
    productRows.forEach(row => {
      const data = row.draft_data || row.published_data
      if (data) {
        const product = JSON.parse(data)
        if (product.categoryId === categoryId) {
          productCount++
        }
      }
    })
    
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
  getCategoryByNameOrId(value: string): CategoryData | null {
    const categories = this.getAllPublished()
    
    // 先按ID查找
    const byId = categories.find(c => c.id === value)
    if (byId) return byId
    
    // 再按名称查找
    const byName = categories.find(c => c.name === value)
    return byName || null
  },

  /**
   * 初始化默认分类数据
   * 仅在数据库中没有分类数据时执行
   */
  initDefaultCategories(): void {
    // 检查是否已有分类数据
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
   * 创建新分类
   */
  createCategory(data: Omit<CategoryData, 'id'>): CategoryData {
    const id = this.generateCategoryId()
    const category: CategoryData = { id, ...data }
    
    contentService.saveDraft('category', id, category)
    
    return category
  },

  /**
   * 批量创建分类
   */
  batchCreateCategories(items: Array<Omit<CategoryData, 'id'>>): CategoryData[] {
    return items.map(item => this.createCategory(item))
  }
}
