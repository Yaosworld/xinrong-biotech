/**
 * 促销活动图片服务
 * 
 * 管理促销活动的封面图和海报图资源
 * 
 * 设计原则：
 * 1. 图片表独立存储图片元数据（ID、文件名、路径、类型）
 * 2. 促销活动通过 coverId/posterId 关联图片
 * 3. 一张图片可以被多个活动使用（多对多关系，与分类图片不同）
 * 4. 图片分为两种类型：cover（封面）和 poster（海报）
 * 5. 不支持SVG文件（安全考虑）
 */
import db from '../db'
import fs from 'fs'
import path from 'path'

// 图片存储目录
const UPLOAD_BASE = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads')
const PROMOTION_IMAGE_DIR = 'images/promotions'

// 允许的图片类型
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

// 图片类型
export type PromotionImageType = 'cover' | 'poster'

export interface PromotionImage {
  id: number
  filename: string
  originalName: string
  path: string
  url: string
  imageType: PromotionImageType
  usageCount: number  // 被多少个活动使用
  createdAt: string
}

export const promotionImageService = {
  /**
   * 初始化图片表
   * 注意：filename + image_type 组合唯一，允许封面和海报使用相同文件名
   */
  initTable(): void {
    // 检查表是否存在
    const tableExists = db.queryOne(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='promotion_images'"
    )
    
    if (tableExists) {
      // 检查表结构是否需要迁移（旧表有 filename UNIQUE，新表需要 filename + image_type UNIQUE）
      // 通过检查是否能插入相同 filename 但不同 image_type 来判断
      const needsMigration = this.checkNeedsMigration()
      
      if (needsMigration) {
        console.log('📦 迁移促销图片表结构...')
        // 备份数据
        const existingData = db.queryAll('SELECT * FROM promotion_images')
        
        // 删除旧表
        db.getDb().run('DROP TABLE promotion_images')
        
        // 创建新表
        this.createTable()
        
        // 恢复数据（只恢复 cover 类型的，因为旧表只有 cover）
        for (const row of existingData) {
          try {
            db.run(`
              INSERT INTO promotion_images (filename, original_name, path, image_type, created_at)
              VALUES (?, ?, ?, ?, ?)
            `, [row.filename, row.original_name, row.path, row.image_type || 'cover', row.created_at])
          } catch {
            // 忽略重复数据
          }
        }
        db.saveDb()
        console.log('✅ 促销图片表迁移完成')
      }
    } else {
      this.createTable()
    }
  },

  /**
   * 检查是否需要迁移表结构
   */
  checkNeedsMigration(): boolean {
    try {
      // 尝试获取表的 SQL 定义
      const tableInfo = db.queryOne(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='promotion_images'"
      )
      if (tableInfo && tableInfo.sql) {
        // 如果表定义中包含 "filename TEXT NOT NULL UNIQUE" 而不是 "UNIQUE(filename, image_type)"
        // 则需要迁移
        const sql = tableInfo.sql as string
        return sql.includes('filename TEXT NOT NULL UNIQUE') || 
               !sql.includes('UNIQUE(filename, image_type)')
      }
    } catch {
      // 忽略错误
    }
    return false
  },

  /**
   * 创建图片表
   */
  createTable(): void {
    db.getDb().run(`
      CREATE TABLE IF NOT EXISTS promotion_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        path TEXT NOT NULL,
        image_type TEXT NOT NULL DEFAULT 'cover',
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        UNIQUE(filename, image_type)
      )
    `)
    db.getDb().run(`CREATE INDEX IF NOT EXISTS idx_promotion_images_filename ON promotion_images(filename)`)
    db.getDb().run(`CREATE INDEX IF NOT EXISTS idx_promotion_images_type ON promotion_images(image_type)`)
    db.saveDb()
  },

  /**
   * 获取图片使用统计（imageId -> 使用次数）
   */
  getUsageStats(): Map<number, number> {
    const promotionRows = db.queryAll(`
      SELECT draft_data, published_data FROM contents 
      WHERE content_type = 'promotion' AND status != 'deleted'
    `)
    
    const usageMap = new Map<number, number>()
    
    promotionRows.forEach(row => {
      const data = row.draft_data || row.published_data
      if (data) {
        try {
          const promo = JSON.parse(data)
          if (promo.coverId) {
            usageMap.set(promo.coverId, (usageMap.get(promo.coverId) || 0) + 1)
          }
          if (promo.posterId) {
            usageMap.set(promo.posterId, (usageMap.get(promo.posterId) || 0) + 1)
          }
        } catch {
          // 忽略解析错误
        }
      }
    })
    
    return usageMap
  },

  /**
   * 获取所有图片（按类型筛选）
   */
  getAll(imageType?: PromotionImageType): PromotionImage[] {
    let sql = `
      SELECT id, filename, original_name as originalName, path, image_type as imageType, created_at as createdAt
      FROM promotion_images
    `
    const params: any[] = []
    
    if (imageType) {
      sql += ' WHERE image_type = ?'
      params.push(imageType)
    }
    
    sql += ' ORDER BY created_at DESC'
    
    const rows = db.queryAll(sql, params)
    const usageStats = this.getUsageStats()
    
    return rows.map(row => {
      const uploadPath = path.join(UPLOAD_BASE, PROMOTION_IMAGE_DIR, row.imageType + 's', row.filename)
      const isUploaded = fs.existsSync(uploadPath)
      const url = isUploaded 
        ? `/uploads/${PROMOTION_IMAGE_DIR}/${row.imageType}s/${row.filename}`
        : `/images/promotions/${row.imageType}s/${row.filename}`
      
      return {
        ...row,
        url,
        usageCount: usageStats.get(row.id) || 0
      }
    })
  },

  /**
   * 根据ID获取图片
   */
  getById(id: number): PromotionImage | null {
    const row = db.queryOne(`
      SELECT id, filename, original_name as originalName, path, image_type as imageType, created_at as createdAt
      FROM promotion_images WHERE id = ?
    `, [id])
    
    if (!row) return null
    
    const usageStats = this.getUsageStats()
    const uploadPath = path.join(UPLOAD_BASE, PROMOTION_IMAGE_DIR, row.imageType + 's', row.filename)
    const isUploaded = fs.existsSync(uploadPath)
    const url = isUploaded 
      ? `/uploads/${PROMOTION_IMAGE_DIR}/${row.imageType}s/${row.filename}`
      : `/images/promotions/${row.imageType}s/${row.filename}`
    
    return {
      ...row,
      url,
      usageCount: usageStats.get(id) || 0
    }
  },

  /**
   * 添加图片记录
   */
  add(filename: string, originalName: string, imageType: PromotionImageType): PromotionImage {
    const filePath = `${PROMOTION_IMAGE_DIR}/${imageType}s/${filename}`
    
    // 检查同类型下文件名是否已存在
    const existing = db.queryOne(
      'SELECT id FROM promotion_images WHERE filename = ? AND image_type = ?', 
      [filename, imageType]
    )
    if (existing) {
      throw new Error(`${imageType === 'cover' ? '封面' : '海报'}图片 "${filename}" 已存在`)
    }
    
    db.run(`
      INSERT INTO promotion_images (filename, original_name, path, image_type)
      VALUES (?, ?, ?, ?)
    `, [filename, originalName, filePath, imageType])
    
    const id = db.lastInsertRowId()
    
    return {
      id,
      filename,
      originalName,
      path: filePath,
      url: `/uploads/${filePath}`,
      imageType,
      usageCount: 0,
      createdAt: new Date().toISOString()
    }
  },

  /**
   * 删除图片（同时删除文件和记录）
   * 注意：即使图片被使用也可以删除（与分类图片不同）
   */
  delete(id: number): { success: boolean; error?: string } {
    const image = this.getById(id)
    if (!image) {
      return { success: false, error: '图片不存在' }
    }
    
    // 删除文件
    const fullPath = path.join(UPLOAD_BASE, PROMOTION_IMAGE_DIR, image.imageType + 's', image.filename)
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }
    
    // 删除记录
    db.run('DELETE FROM promotion_images WHERE id = ?', [id])
    
    return { success: true }
  },

  /**
   * 同步文件系统中的图片到数据库
   */
  syncFromFileSystem(): { added: number; existing: number; skipped: number } {
    let added = 0
    let existing = 0
    let skipped = 0
    
    const allowedPattern = /\.(jpg|jpeg|png|gif|webp)$/i
    
    // 同步两种类型的图片
    const types: PromotionImageType[] = ['cover', 'poster']
    
    for (const imageType of types) {
      // 检查 uploads 目录
      const uploadDir = path.join(UPLOAD_BASE, PROMOTION_IMAGE_DIR, imageType + 's')
      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir)
        for (const filename of files) {
          if (!allowedPattern.test(filename)) {
            if (/\.svg$/i.test(filename)) skipped++
            continue
          }
          
          const exists = db.queryOne('SELECT id FROM promotion_images WHERE filename = ?', [filename])
          if (exists) {
            existing++
          } else {
            try {
              this.add(filename, filename, imageType)
              added++
            } catch (e) {
              console.warn(`同步图片 ${filename} 失败:`, e)
            }
          }
        }
      }
      
      // 检查 public 目录
      const publicDir = path.join(__dirname, '../../../public/images/promotions', imageType + 's')
      if (fs.existsSync(publicDir)) {
        const files = fs.readdirSync(publicDir)
        for (const filename of files) {
          if (!allowedPattern.test(filename)) {
            if (/\.svg$/i.test(filename)) skipped++
            continue
          }
          
          const exists = db.queryOne('SELECT id FROM promotion_images WHERE filename = ?', [filename])
          if (exists) {
            existing++
          } else {
            try {
              this.addPreset(filename, imageType)
              added++
            } catch (e) {
              console.warn(`同步预设图片 ${filename} 失败:`, e)
            }
          }
        }
      }
    }
    
    return { added, existing, skipped }
  },

  /**
   * 添加预设图片记录（public目录中的图片）
   */
  addPreset(filename: string, imageType: PromotionImageType): PromotionImage {
    const filePath = `images/promotions/${imageType}s/${filename}`
    
    // 检查同类型下文件名是否已存在
    const existing = db.queryOne(
      'SELECT id FROM promotion_images WHERE filename = ? AND image_type = ?', 
      [filename, imageType]
    )
    if (existing) {
      throw new Error(`${imageType === 'cover' ? '封面' : '海报'}图片 "${filename}" 已存在`)
    }
    
    db.run(`
      INSERT INTO promotion_images (filename, original_name, path, image_type)
      VALUES (?, ?, ?, ?)
    `, [filename, filename, filePath, imageType])
    
    const id = db.lastInsertRowId()
    
    return {
      id,
      filename,
      originalName: filename,
      path: filePath,
      url: `/images/promotions/${imageType}s/${filename}`,
      imageType,
      usageCount: 0,
      createdAt: new Date().toISOString()
    }
  },

  /**
   * 获取图片URL（根据ID）
   */
  getImageUrl(imageId: number | null): string {
    if (!imageId) return ''
    const image = this.getById(imageId)
    return image?.url || ''
  },

  /**
   * 验证文件类型是否允许
   */
  isAllowedType(mimetype: string): boolean {
    return ALLOWED_IMAGE_TYPES.includes(mimetype)
  },

  /**
   * 验证文件扩展名是否允许
   */
  isAllowedExtension(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase()
    return ALLOWED_IMAGE_EXTENSIONS.includes(ext)
  }
}
