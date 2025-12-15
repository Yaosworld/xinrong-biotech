/**
 * 图片服务基类
 * 
 * 提供图片管理的通用功能，子类通过配置实现差异化行为
 * 
 * 设计原则：
 * 1. 配置驱动：通过 ImageServiceConfig 定义差异
 * 2. 单一职责：基类只负责通用逻辑
 * 3. 开闭原则：对扩展开放，对修改关闭
 */
import db from '../../db'
import fs from 'fs'
import path from 'path'

// ========================================
// 类型定义
// ========================================

/** 基础图片接口 */
export interface BaseImage {
  id: number
  filename: string
  originalName: string
  path: string
  url: string
  createdAt: string
}

/** 使用模式：exclusive=一对一，shared=多对多 */
export type UsageMode = 'exclusive' | 'shared'

/** 图片服务配置 */
export interface ImageServiceConfig {
  /** 数据库表名 */
  tableName: string
  /** 图片存储目录（相对于 uploads） */
  imageDir: string
  /** 关联的内容类型（用于查询使用状态） */
  contentType: string
  /** 使用模式 */
  usageMode: UsageMode
  /** 是否允许删除被使用的图片 */
  allowDeleteWhenUsed: boolean
  /** 是否有图片类型（如 cover/poster） */
  hasImageType?: boolean
  /** 图片类型列表 */
  imageTypes?: string[]
  /** 数据库中的类型字段名 */
  imageTypeField?: string
}

/** 使用信息 */
export interface UsageInfo {
  isUsed: boolean
  usedBy?: string | number  // exclusive 模式：被谁使用
  usageCount?: number       // shared 模式：使用次数
}

/** 同步结果 */
export interface SyncResult {
  added: number
  existing: number
  skipped: number
}

/** 删除结果 */
export interface DeleteResult {
  success: boolean
  error?: string
}

/** 分页结果 */
export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// ========================================
// 常量定义
// ========================================

/** 允许的图片 MIME 类型 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/** 允许的图片扩展名 */
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

/** 允许的文件名模式（用于同步） */
export const ALLOWED_FILE_PATTERN = /\.(jpg|jpeg|png|gif|webp)$/i

/** 默认分页大小 */
export const DEFAULT_PAGE_SIZE = 50

/** 最大分页大小 */
export const MAX_PAGE_SIZE = 200

// ========================================
// 基类实现
// ========================================

export abstract class BaseImageService<T extends BaseImage> {
  protected config: ImageServiceConfig
  protected uploadBase: string
  
  constructor(config: ImageServiceConfig) {
    this.config = config
    this.uploadBase = process.env.UPLOAD_PATH || path.join(__dirname, '../../../uploads')
  }
  
  // ========================================
  // 表初始化
  // ========================================
  
  /** 初始化数据库表 */
  initTable(): void {
    const { tableName, hasImageType, imageTypeField } = this.config
    const typeField = imageTypeField || 'image_type'
    
    let createSql = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        path TEXT NOT NULL,
        ${hasImageType ? `${typeField} TEXT NOT NULL DEFAULT 'default',` : ''}
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
    `
    
    // 唯一约束
    if (hasImageType) {
      createSql += `, UNIQUE(filename, ${typeField})`
    } else {
      createSql += `, UNIQUE(filename)`
    }
    createSql += ')'
    
    db.getDb().run(createSql)
    db.getDb().run(`CREATE INDEX IF NOT EXISTS idx_${tableName}_filename ON ${tableName}(filename)`)
    
    if (hasImageType) {
      db.getDb().run(`CREATE INDEX IF NOT EXISTS idx_${tableName}_type ON ${tableName}(${typeField})`)
    }
    
    db.saveDb()
  }
  
  // ========================================
  // 查询方法
  // ========================================
  
  /** 获取所有图片 */
  getAll(imageType?: string): T[] {
    const { tableName, hasImageType, imageTypeField } = this.config
    const typeField = imageTypeField || 'image_type'
    
    let sql = `
      SELECT id, filename, original_name as originalName, path, 
             ${hasImageType ? `${typeField} as imageType,` : ''} 
             created_at as createdAt
      FROM ${tableName}
    `
    const params: any[] = []
    
    if (hasImageType && imageType) {
      sql += ` WHERE ${typeField} = ?`
      params.push(imageType)
    }
    
    sql += ' ORDER BY created_at DESC'
    
    const rows = db.queryAll(sql, params)
    return rows.map(row => this.mapRowToImage(row))
  }
  
  /** 获取分页图片列表 */
  getPaginated(page: number = 1, pageSize: number = DEFAULT_PAGE_SIZE, imageType?: string): PaginatedResult<T> {
    const { tableName, hasImageType, imageTypeField } = this.config
    const typeField = imageTypeField || 'image_type'
    
    // 限制页大小
    const limitedPageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE)
    const offset = (Math.max(1, page) - 1) * limitedPageSize
    
    // 构建 WHERE 子句
    let whereClause = ''
    const params: any[] = []
    if (hasImageType && imageType) {
      whereClause = ` WHERE ${typeField} = ?`
      params.push(imageType)
    }
    
    // 获取总数
    const countResult = db.queryOne(`SELECT COUNT(*) as total FROM ${tableName}${whereClause}`, params)
    const total = countResult?.total || 0
    const totalPages = Math.ceil(total / limitedPageSize)
    
    // 获取分页数据
    const sql = `
      SELECT id, filename, original_name as originalName, path,
             ${hasImageType ? `${typeField} as imageType,` : ''}
             created_at as createdAt
      FROM ${tableName}${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
    const rows = db.queryAll(sql, [...params, limitedPageSize, offset])
    
    return {
      data: rows.map(row => this.mapRowToImage(row)),
      pagination: {
        page: Math.max(1, page),
        pageSize: limitedPageSize,
        total,
        totalPages
      }
    }
  }
  
  /** 根据 ID 获取图片 */
  getById(id: number): T | null {
    const { tableName, hasImageType, imageTypeField } = this.config
    const typeField = imageTypeField || 'image_type'
    
    const sql = `
      SELECT id, filename, original_name as originalName, path,
             ${hasImageType ? `${typeField} as imageType,` : ''}
             created_at as createdAt
      FROM ${tableName} WHERE id = ?
    `
    const row = db.queryOne(sql, [id])
    
    return row ? this.mapRowToImage(row) : null
  }
  
  /** 根据文件名获取图片 */
  getByFilename(filename: string, imageType?: string): T | null {
    const { tableName, hasImageType, imageTypeField } = this.config
    const typeField = imageTypeField || 'image_type'
    
    let sql = `
      SELECT id, filename, original_name as originalName, path,
             ${hasImageType ? `${typeField} as imageType,` : ''}
             created_at as createdAt
      FROM ${tableName} WHERE filename = ?
    `
    const params: any[] = [filename]
    
    if (hasImageType && imageType) {
      sql += ` AND ${typeField} = ?`
      params.push(imageType)
    }
    
    const row = db.queryOne(sql, params)
    return row ? this.mapRowToImage(row) : null
  }

  
  // ========================================
  // 写入方法
  // ========================================
  
  /** 添加图片记录（上传后调用） */
  add(filename: string, originalName: string, imageType?: string): T {
    const { tableName, imageDir, hasImageType, imageTypeField } = this.config
    const typeField = imageTypeField || 'image_type'
    
    // 构建路径
    const subDir = hasImageType && imageType ? `${imageType}s` : ''
    const filePath = subDir ? `${imageDir}/${subDir}/${filename}` : `${imageDir}/${filename}`
    
    // 检查是否已存在
    const existingCheck = hasImageType && imageType
      ? db.queryOne(`SELECT id FROM ${tableName} WHERE filename = ? AND ${typeField} = ?`, [filename, imageType])
      : db.queryOne(`SELECT id FROM ${tableName} WHERE filename = ?`, [filename])
    
    if (existingCheck) {
      const typeLabel = this.getImageTypeLabel(imageType)
      throw new Error(`${typeLabel}图片 "${filename}" 已存在`)
    }
    
    // 插入记录
    if (hasImageType) {
      db.run(`
        INSERT INTO ${tableName} (filename, original_name, path, ${typeField})
        VALUES (?, ?, ?, ?)
      `, [filename, originalName, filePath, imageType || 'default'])
    } else {
      db.run(`
        INSERT INTO ${tableName} (filename, original_name, path)
        VALUES (?, ?, ?)
      `, [filename, originalName, filePath])
    }
    
    const id = db.lastInsertRowId()
    return this.getById(id)!
  }
  
  /** 添加预设图片记录（public 目录中的图片） */
  addPreset(filename: string, imageType?: string): T {
    const { tableName, imageDir, hasImageType, imageTypeField } = this.config
    const typeField = imageTypeField || 'image_type'
    
    // 预设图片路径不包含 uploads 前缀
    const subDir = hasImageType && imageType ? `${imageType}s` : ''
    const filePath = subDir ? `${imageDir}/${subDir}/${filename}` : `${imageDir}/${filename}`
    
    // 检查是否已存在
    const existingCheck = hasImageType && imageType
      ? db.queryOne(`SELECT id FROM ${tableName} WHERE filename = ? AND ${typeField} = ?`, [filename, imageType])
      : db.queryOne(`SELECT id FROM ${tableName} WHERE filename = ?`, [filename])
    
    if (existingCheck) {
      const typeLabel = this.getImageTypeLabel(imageType)
      throw new Error(`${typeLabel}图片 "${filename}" 已存在`)
    }
    
    // 插入记录
    if (hasImageType) {
      db.run(`
        INSERT INTO ${tableName} (filename, original_name, path, ${typeField})
        VALUES (?, ?, ?, ?)
      `, [filename, filename, filePath, imageType || 'default'])
    } else {
      db.run(`
        INSERT INTO ${tableName} (filename, original_name, path)
        VALUES (?, ?, ?)
      `, [filename, filename, filePath])
    }
    
    const id = db.lastInsertRowId()
    return this.getById(id)!
  }
  
  /** 删除图片（同时删除文件和记录） */
  delete(id: number): DeleteResult {
    const image = this.getById(id)
    if (!image) {
      return { success: false, error: '图片不存在' }
    }
    
    // 检查使用状态
    if (!this.config.allowDeleteWhenUsed) {
      const usage = this.getUsageInfo(id)
      if (usage.isUsed) {
        if (this.config.usageMode === 'exclusive' && usage.usedBy) {
          return { success: false, error: `图片正被 ${usage.usedBy} 使用，无法删除` }
        }
        return { success: false, error: '图片正在被使用，无法删除' }
      }
    }
    
    // 删除文件
    const fullPath = this.getFullPath(image)
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }
    
    // 删除记录
    db.run(`DELETE FROM ${this.config.tableName} WHERE id = ?`, [id])
    
    return { success: true }
  }
  
  // ========================================
  // 同步方法
  // ========================================
  
  /** 同步文件系统中的图片到数据库 */
  syncFromFileSystem(): SyncResult {
    let added = 0
    let existing = 0
    let skipped = 0
    
    const { imageDir, hasImageType, imageTypes } = this.config
    
    // 构建需要扫描的目录列表
    const dirsToScan: { dir: string; imageType?: string; isPublic: boolean }[] = []
    
    if (hasImageType && imageTypes && imageTypes.length > 0) {
      // 多类型：扫描每个类型的子目录
      for (const type of imageTypes) {
        // uploads 目录
        dirsToScan.push({
          dir: path.join(this.uploadBase, imageDir, `${type}s`),
          imageType: type,
          isPublic: false
        })
        // public 目录
        dirsToScan.push({
          dir: path.join(__dirname, '../../../../public', imageDir, `${type}s`),
          imageType: type,
          isPublic: true
        })
      }
    } else {
      // 单类型
      dirsToScan.push({
        dir: path.join(this.uploadBase, imageDir),
        isPublic: false
      })
      dirsToScan.push({
        dir: path.join(__dirname, '../../../../public', imageDir),
        isPublic: true
      })
    }
    
    for (const { dir, imageType, isPublic } of dirsToScan) {
      // 确保 uploads 目录存在
      if (!isPublic && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        continue
      }
      
      if (!fs.existsSync(dir)) {
        continue
      }
      
      const files = fs.readdirSync(dir)
      for (const filename of files) {
        // 跳过不允许的文件类型
        if (!ALLOWED_FILE_PATTERN.test(filename)) {
          if (/\.svg$/i.test(filename)) {
            skipped++
            console.warn(`跳过SVG文件（安全考虑）: ${filename}`)
          }
          continue
        }
        
        const existingImage = this.getByFilename(filename, imageType)
        if (existingImage) {
          existing++
        } else {
          try {
            if (isPublic) {
              this.addPreset(filename, imageType)
            } else {
              this.add(filename, filename, imageType)
            }
            added++
          } catch (e) {
            console.warn(`同步图片 ${filename} 失败:`, e)
          }
        }
      }
    }
    
    return { added, existing, skipped }
  }
  
  // ========================================
  // 抽象方法（子类实现）
  // ========================================
  
  /** 获取图片使用信息（子类必须实现） */
  abstract getUsageInfo(imageId: number): UsageInfo
  
  /** 获取使用映射（子类必须实现） */
  abstract getUsageMap(): Map<number, string | number>
  
  // ========================================
  // 辅助方法
  // ========================================
  
  /** 将数据库行映射为图片对象 */
  protected mapRowToImage(row: any): T {
    const { hasImageType, usageMode } = this.config
    const imageType = hasImageType ? row.imageType : undefined
    
    // 获取使用信息
    const usage = this.getUsageInfo(row.id)
    
    // 构建 URL
    const url = this.buildImageUrl(row.filename, imageType)
    
    // 构建基础对象
    const base: any = {
      id: row.id,
      filename: row.filename,
      originalName: row.originalName,
      path: row.path,
      url,
      createdAt: row.createdAt
    }
    
    // 添加使用状态字段
    if (usageMode === 'exclusive') {
      base.usedByCategoryId = usage.usedBy || null
    } else {
      base.usageCount = usage.usageCount || 0
    }
    
    // 添加图片类型
    if (hasImageType) {
      base.imageType = imageType
    }
    
    return base as T
  }
  
  /** 构建图片 URL */
  protected buildImageUrl(filename: string, imageType?: string): string {
    const { imageDir, hasImageType } = this.config
    const subDir = hasImageType && imageType ? `${imageType}s` : ''
    const relativePath = subDir ? `${imageDir}/${subDir}/${filename}` : `${imageDir}/${filename}`
    
    // 检查文件位置（uploads 优先）
    const uploadPath = path.join(this.uploadBase, relativePath)
    if (fs.existsSync(uploadPath)) {
      return `/uploads/${relativePath}`
    }
    
    // 降级到 public 目录
    return `/${relativePath}`
  }
  
  /** 获取图片完整路径 */
  protected getFullPath(image: T): string {
    const { hasImageType } = this.config
    const imageType = (image as any).imageType
    const subDir = hasImageType && imageType ? `${imageType}s` : ''
    const relativePath = subDir 
      ? `${this.config.imageDir}/${subDir}/${image.filename}`
      : `${this.config.imageDir}/${image.filename}`
    return path.join(this.uploadBase, relativePath)
  }
  
  /** 获取图片类型标签（用于错误消息） */
  protected getImageTypeLabel(imageType?: string): string {
    if (!imageType) return ''
    const labels: Record<string, string> = {
      cover: '封面',
      poster: '海报'
    }
    return labels[imageType] || ''
  }
  
  // ========================================
  // 验证方法
  // ========================================
  
  /** 验证文件 MIME 类型是否允许 */
  isAllowedType(mimetype: string): boolean {
    return ALLOWED_IMAGE_TYPES.includes(mimetype)
  }
  
  /** 验证文件扩展名是否允许 */
  isAllowedExtension(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase()
    return ALLOWED_IMAGE_EXTENSIONS.includes(ext)
  }
  
  /** 检查文件名是否可用 */
  isFilenameAvailable(filename: string, imageType?: string): boolean {
    const existing = this.getByFilename(filename, imageType)
    return !existing
  }
  
  // ========================================
  // Getter
  // ========================================
  
  /** 获取配置 */
  getConfig(): ImageServiceConfig {
    return this.config
  }
  
  /** 获取上传基础路径 */
  getUploadBase(): string {
    return this.uploadBase
  }
  
  /** 获取图片目录 */
  getImageDir(): string {
    return this.config.imageDir
  }
}
