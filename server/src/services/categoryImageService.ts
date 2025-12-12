/**
 * 分类图片服务
 * 
 * 独立管理分类图片资源，与分类表形成一对一关系
 * 
 * 设计原则：
 * 1. 图片表独立存储图片元数据（ID、文件名、路径）
 * 2. 分类表通过 imageId 关联图片
 * 3. 一张图片只能被一个分类使用（一对一）
 * 4. 图片文件名不能重复
 */
import db from '../db'
import fs from 'fs'
import path from 'path'

// 图片存储目录
const UPLOAD_BASE = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads')
const CATEGORY_IMAGE_DIR = 'images/products'

export interface CategoryImage {
  id: number
  filename: string      // 文件名（唯一）
  originalName: string  // 原始文件名
  path: string          // 相对路径
  url: string           // 访问URL
  usedByCategoryId: string | null  // 被哪个分类使用（null表示未使用）
  createdAt: string
}

export const categoryImageService = {
  /**
   * 初始化图片表
   */
  initTable(): void {
    db.getDb().run(`
      CREATE TABLE IF NOT EXISTS category_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        original_name TEXT NOT NULL,
        path TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `)
    db.getDb().run(`CREATE INDEX IF NOT EXISTS idx_category_images_filename ON category_images(filename)`)
    db.saveDb()
  },

  /**
   * 获取所有图片（含使用状态）
   * 同时支持新旧两种关联方式：imageId（新）和 imageName（旧）
   */
  getAll(): CategoryImage[] {
    const rows = db.queryAll(`
      SELECT 
        ci.id,
        ci.filename,
        ci.original_name as originalName,
        ci.path,
        ci.created_at as createdAt
      FROM category_images ci
      ORDER BY ci.created_at DESC
    `)
    
    // 获取分类使用情况
    const categoryRows = db.queryAll(`
      SELECT draft_data, published_data FROM contents 
      WHERE content_type = 'category' AND status != 'deleted'
    `)
    
    // 构建 filename -> categoryId 映射（支持新旧两种方式）
    const usageMap = new Map<string, string>()
    categoryRows.forEach(row => {
      const data = row.draft_data || row.published_data
      if (data) {
        const cat = JSON.parse(data)
        // 新方式：通过 imageId 关联
        if (cat.imageId) {
          const imgRow = db.queryOne('SELECT filename FROM category_images WHERE id = ?', [cat.imageId])
          if (imgRow) {
            usageMap.set(imgRow.filename, cat.id)
          }
        }
        // 旧方式：通过 imageName 关联
        else if (cat.imageName) {
          usageMap.set(cat.imageName, cat.id)
        }
      }
    })
    
    return rows.map(row => {
      // 判断图片是在 uploads 还是 public 目录
      const uploadPath = path.join(UPLOAD_BASE, CATEGORY_IMAGE_DIR, row.filename)
      const isUploaded = fs.existsSync(uploadPath)
      const url = isUploaded 
        ? `/uploads/${CATEGORY_IMAGE_DIR}/${row.filename}`
        : `/images/products/${row.filename}`
      
      return {
        ...row,
        url,
        usedByCategoryId: usageMap.get(row.filename) || null
      }
    })
  },

  /**
   * 根据ID获取图片
   */
  getById(id: number): CategoryImage | null {
    const row = db.queryOne(`
      SELECT id, filename, original_name as originalName, path, created_at as createdAt
      FROM category_images WHERE id = ?
    `, [id])
    
    if (!row) return null
    
    // 检查使用状态
    const categoryRows = db.queryAll(`
      SELECT draft_data, published_data FROM contents 
      WHERE content_type = 'category' AND status != 'deleted'
    `)
    
    let usedByCategoryId: string | null = null
    for (const catRow of categoryRows) {
      const data = catRow.draft_data || catRow.published_data
      if (data) {
        const cat = JSON.parse(data)
        if (cat.imageId === id) {
          usedByCategoryId = cat.id
          break
        }
      }
    }
    
    return {
      ...row,
      url: `/uploads/${CATEGORY_IMAGE_DIR}/${row.filename}`,
      usedByCategoryId
    }
  },

  /**
   * 根据文件名获取图片
   */
  getByFilename(filename: string): CategoryImage | null {
    const row = db.queryOne(`
      SELECT id, filename, original_name as originalName, path, created_at as createdAt
      FROM category_images WHERE filename = ?
    `, [filename])
    
    if (!row) return null
    
    return {
      ...row,
      url: `/uploads/${CATEGORY_IMAGE_DIR}/${row.filename}`,
      usedByCategoryId: null // 简化版，不查使用状态
    }
  },

  /**
   * 添加图片记录（上传后调用）
   */
  add(filename: string, originalName: string): CategoryImage {
    const filePath = `${CATEGORY_IMAGE_DIR}/${filename}`
    
    // 检查文件名是否已存在
    const existing = db.queryOne('SELECT id FROM category_images WHERE filename = ?', [filename])
    if (existing) {
      throw new Error(`图片文件名 "${filename}" 已存在`)
    }
    
    db.run(`
      INSERT INTO category_images (filename, original_name, path)
      VALUES (?, ?, ?)
    `, [filename, originalName, filePath])
    
    const id = db.lastInsertRowId()
    
    return {
      id,
      filename,
      originalName,
      path: filePath,
      url: `/uploads/${filePath}`,
      usedByCategoryId: null,
      createdAt: new Date().toISOString()
    }
  },

  /**
   * 删除图片（同时删除文件和记录）
   */
  delete(id: number): { success: boolean; error?: string } {
    const image = this.getById(id)
    if (!image) {
      return { success: false, error: '图片不存在' }
    }
    
    if (image.usedByCategoryId) {
      return { success: false, error: `图片正被分类 ${image.usedByCategoryId} 使用，无法删除` }
    }
    
    // 删除文件
    const fullPath = path.join(UPLOAD_BASE, CATEGORY_IMAGE_DIR, image.filename)
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }
    
    // 删除记录
    db.run('DELETE FROM category_images WHERE id = ?', [id])
    
    return { success: true }
  },

  /**
   * 检查文件名是否可用
   */
  isFilenameAvailable(filename: string): boolean {
    const existing = db.queryOne('SELECT id FROM category_images WHERE filename = ?', [filename])
    return !existing
  },

  /**
   * 同步文件系统中的图片到数据库
   * 同时扫描 uploads 目录和 public 目录
   */
  syncFromFileSystem(): { added: number; existing: number } {
    const uploadDir = path.join(UPLOAD_BASE, CATEGORY_IMAGE_DIR)
    const publicDir = path.join(__dirname, '../../../public/images/products')
    
    // 确保 uploads 目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    
    let added = 0
    let existing = 0
    
    // 扫描 uploads 目录
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir).filter(f => 
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f)
      )
      
      for (const filename of files) {
        const exists = db.queryOne('SELECT id FROM category_images WHERE filename = ?', [filename])
        if (exists) {
          existing++
        } else {
          try {
            this.add(filename, filename)
            added++
          } catch (e) {
            console.warn(`同步图片 ${filename} 失败:`, e)
          }
        }
      }
    }
    
    // 扫描 public 目录（预设图片）
    if (fs.existsSync(publicDir)) {
      const publicFiles = fs.readdirSync(publicDir).filter(f => 
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f)
      )
      
      for (const filename of publicFiles) {
        const exists = db.queryOne('SELECT id FROM category_images WHERE filename = ?', [filename])
        if (exists) {
          existing++
        } else {
          try {
            // 预设图片也添加到数据库，但路径指向 public 目录
            this.addPreset(filename)
            added++
          } catch (e) {
            console.warn(`同步预设图片 ${filename} 失败:`, e)
          }
        }
      }
    }
    
    return { added, existing }
  },

  /**
   * 添加预设图片记录（public目录中的图片）
   */
  addPreset(filename: string): CategoryImage {
    const filePath = `images/products/${filename}`
    
    const existing = db.queryOne('SELECT id FROM category_images WHERE filename = ?', [filename])
    if (existing) {
      throw new Error(`图片文件名 "${filename}" 已存在`)
    }
    
    db.run(`
      INSERT INTO category_images (filename, original_name, path)
      VALUES (?, ?, ?)
    `, [filename, filename, filePath])
    
    const id = db.lastInsertRowId()
    
    return {
      id,
      filename,
      originalName: filename,
      path: filePath,
      url: `/images/products/${filename}`, // 预设图片使用 public 路径
      usedByCategoryId: null,
      createdAt: new Date().toISOString()
    }
  },

  /**
   * 获取图片使用映射（imageId -> categoryId）
   */
  getUsageMap(): Map<number, string> {
    const categoryRows = db.queryAll(`
      SELECT draft_data, published_data FROM contents 
      WHERE content_type = 'category' AND status != 'deleted'
    `)
    
    const map = new Map<number, string>()
    categoryRows.forEach(row => {
      const data = row.draft_data || row.published_data
      if (data) {
        const cat = JSON.parse(data)
        if (cat.imageId) {
          map.set(cat.imageId, cat.id)
        }
      }
    })
    
    return map
  },

  /**
   * 获取可用图片列表（未被使用的）
   */
  getAvailable(): CategoryImage[] {
    const all = this.getAll()
    return all.filter(img => !img.usedByCategoryId)
  }
}
