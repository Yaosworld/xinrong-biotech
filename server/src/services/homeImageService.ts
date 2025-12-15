/**
 * 首页图片服务
 * 
 * 管理首页横幅图片资源
 * 
 * 设计原则：
 * 1. 图片表独立存储图片元数据（ID、文件名、路径）
 * 2. 首页配置通过 imageId 关联图片
 * 3. 一张图片可以被多次使用（多对多）
 * 4. 图片文件名不能重复
 */
import db from '../db'
import fs from 'fs'
import path from 'path'

// 图片存储目录
const UPLOAD_BASE = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads')
const HOME_IMAGE_DIR = 'images/home'

// 允许的图片类型
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

export interface HomeImage {
  id: number
  filename: string
  originalName: string
  path: string
  url: string
  usageCount: number
  createdAt: string
}

export const homeImageService = {
  /**
   * 初始化图片表
   */
  initTable(): void {
    db.getDb().run(`
      CREATE TABLE IF NOT EXISTS home_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        original_name TEXT NOT NULL,
        path TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `)
    db.getDb().run(`CREATE INDEX IF NOT EXISTS idx_home_images_filename ON home_images(filename)`)
    db.saveDb()
  },

  /**
   * 获取图片使用次数映射（通过 imageId）
   */
  getUsageMap(): Map<number, number> {
    const map = new Map<number, number>()
    
    // 从首页配置中获取使用的图片
    const configRow = db.queryOne(`
      SELECT draft_data, published_data FROM contents 
      WHERE content_type = 'home_config' AND content_key = 'main'
    `)
    
    if (configRow) {
      const data = configRow.draft_data || configRow.published_data
      if (data) {
        try {
          const config = JSON.parse(data)
          if (config.images && Array.isArray(config.images)) {
            config.images.forEach((img: { imageId?: number }) => {
              if (img.imageId) {
                map.set(img.imageId, (map.get(img.imageId) || 0) + 1)
              }
            })
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
    
    return map
  },

  /**
   * 获取所有图片（含使用状态）
   */
  getAll(): HomeImage[] {
    const rows = db.queryAll(`
      SELECT 
        id,
        filename,
        original_name as originalName,
        path,
        created_at as createdAt
      FROM home_images
      ORDER BY created_at DESC
    `)
    
    const usageMap = this.getUsageMap()
    
    return rows.map(row => {
      const uploadPath = path.join(UPLOAD_BASE, HOME_IMAGE_DIR, row.filename)
      const isUploaded = fs.existsSync(uploadPath)
      const url = isUploaded 
        ? `/uploads/${HOME_IMAGE_DIR}/${row.filename}`
        : `/images/home/${row.filename}`
      
      return {
        ...row,
        url,
        usageCount: usageMap.get(row.id) || 0
      }
    })
  },

  /**
   * 根据ID获取图片
   */
  getById(id: number): HomeImage | null {
    const row = db.queryOne(`
      SELECT id, filename, original_name as originalName, path, created_at as createdAt
      FROM home_images WHERE id = ?
    `, [id])
    
    if (!row) return null
    
    const usageMap = this.getUsageMap()
    const uploadPath = path.join(UPLOAD_BASE, HOME_IMAGE_DIR, row.filename)
    const isUploaded = fs.existsSync(uploadPath)
    const url = isUploaded 
      ? `/uploads/${HOME_IMAGE_DIR}/${row.filename}`
      : `/images/home/${row.filename}`
    
    return {
      ...row,
      url,
      usageCount: usageMap.get(id) || 0
    }
  },

  /**
   * 添加图片记录
   */
  add(filename: string, originalName: string): HomeImage {
    const filePath = `${HOME_IMAGE_DIR}/${filename}`
    
    const existing = db.queryOne('SELECT id FROM home_images WHERE filename = ?', [filename])
    if (existing) {
      throw new Error(`图片文件名 "${filename}" 已存在`)
    }
    
    db.run(`
      INSERT INTO home_images (filename, original_name, path)
      VALUES (?, ?, ?)
    `, [filename, originalName, filePath])
    
    const id = db.lastInsertRowId()
    
    return {
      id,
      filename,
      originalName,
      path: filePath,
      url: `/uploads/${filePath}`,
      usageCount: 0,
      createdAt: new Date().toISOString()
    }
  },

  /**
   * 删除图片
   */
  delete(id: number): { success: boolean; error?: string } {
    const image = this.getById(id)
    if (!image) {
      return { success: false, error: '图片不存在' }
    }
    
    // 删除文件
    const fullPath = path.join(UPLOAD_BASE, HOME_IMAGE_DIR, image.filename)
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }
    
    // 删除记录
    db.run('DELETE FROM home_images WHERE id = ?', [id])
    
    return { success: true }
  },

  /**
   * 同步文件系统中的图片到数据库
   */
  syncFromFileSystem(): { added: number; existing: number; skipped: number } {
    const uploadDir = path.join(UPLOAD_BASE, HOME_IMAGE_DIR)
    const publicDir = path.join(__dirname, '../../../public/images/home')
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    
    let added = 0
    let existing = 0
    let skipped = 0
    
    const allowedPattern = /\.(jpg|jpeg|png|gif|webp)$/i
    
    // 扫描 uploads 目录
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir)
      for (const filename of files) {
        if (!allowedPattern.test(filename)) {
          if (/\.svg$/i.test(filename)) skipped++
          continue
        }
        
        const exists = db.queryOne('SELECT id FROM home_images WHERE filename = ?', [filename])
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
    
    // 扫描 public 目录
    if (fs.existsSync(publicDir)) {
      const publicFiles = fs.readdirSync(publicDir)
      for (const filename of publicFiles) {
        if (!allowedPattern.test(filename)) {
          if (/\.svg$/i.test(filename)) skipped++
          continue
        }
        
        const exists = db.queryOne('SELECT id FROM home_images WHERE filename = ?', [filename])
        if (exists) {
          existing++
        } else {
          try {
            this.addPreset(filename)
            added++
          } catch (e) {
            console.warn(`同步预设图片 ${filename} 失败:`, e)
          }
        }
      }
    }
    
    return { added, existing, skipped }
  },

  /**
   * 添加预设图片记录
   */
  addPreset(filename: string): HomeImage {
    const filePath = `images/home/${filename}`
    
    const existing = db.queryOne('SELECT id FROM home_images WHERE filename = ?', [filename])
    if (existing) {
      throw new Error(`图片文件名 "${filename}" 已存在`)
    }
    
    db.run(`
      INSERT INTO home_images (filename, original_name, path)
      VALUES (?, ?, ?)
    `, [filename, filename, filePath])
    
    const id = db.lastInsertRowId()
    
    return {
      id,
      filename,
      originalName: filename,
      path: filePath,
      url: `/images/home/${filename}`,
      usageCount: 0,
      createdAt: new Date().toISOString()
    }
  },

  /**
   * 验证文件类型
   */
  isAllowedType(mimetype: string): boolean {
    return ALLOWED_IMAGE_TYPES.includes(mimetype)
  },

  /**
   * 验证文件扩展名
   */
  isAllowedExtension(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase()
    return ALLOWED_IMAGE_EXTENSIONS.includes(ext)
  }
}
