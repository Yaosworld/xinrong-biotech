/**
 * 文件上传服务
 */
import fs from 'fs'
import path from 'path'

// 上传目录配置
const UPLOAD_BASE = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads')

// 允许的图片类型
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']

// 最大文件大小 (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024

// 上传目录映射
const UPLOAD_DIRS: Record<string, string> = {
  'brand-logo': 'images/brands/logos',
  'brand-cert': 'images/brands/certs',
  'promotion-cover': 'images/promotions/covers',
  'promotion-poster': 'images/promotions/posters',
  'product-category': 'images/products',
  'home-banner': 'images/home',
  'common': 'images/common'
}

export interface UploadResult {
  success: boolean
  filename?: string
  path?: string
  url?: string
  size?: number
  error?: string
}

export interface FileInfo {
  originalName: string
  mimeType: string
  size: number
  buffer: Buffer
}

export const uploadService = {
  /**
   * 验证文件
   */
  validateFile(file: FileInfo): { valid: boolean; error?: string } {
    // 检查文件类型
    if (!ALLOWED_TYPES.includes(file.mimeType)) {
      return { valid: false, error: `不支持的文件类型: ${file.mimeType}` }
    }

    // 检查文件扩展名
    const ext = path.extname(file.originalName).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: `不支持的文件扩展名: ${ext}` }
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `文件大小超过限制 (最大 ${MAX_FILE_SIZE / 1024 / 1024}MB)` }
    }

    return { valid: true }
  },

  /**
   * 生成安全的文件名
   * 优先保持原文件名，只在冲突时添加后缀
   */
  generateFilename(originalName: string, targetDir: string): string {
    const ext = path.extname(originalName).toLowerCase()
    const baseName = path.basename(originalName, ext)
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_') // 保留中文、字母、数字、下划线、横线
      .substring(0, 50) // 限制长度
    
    const fullDir = path.join(UPLOAD_BASE, targetDir)
    
    // 先尝试使用原文件名
    let filename = `${baseName}${ext}`
    let fullPath = path.join(fullDir, filename)
    
    // 如果文件已存在，添加数字后缀
    let counter = 1
    while (fs.existsSync(fullPath)) {
      filename = `${baseName}_${counter}${ext}`
      fullPath = path.join(fullDir, filename)
      counter++
    }
    
    return filename
  },

  /**
   * 上传文件
   * 每次上传都会创建新文件，文件名冲突时添加数字后缀
   */
  async upload(file: FileInfo, category: string): Promise<UploadResult> {
    // 验证分类
    const targetDir = UPLOAD_DIRS[category]
    if (!targetDir) {
      return { success: false, error: `无效的上传分类: ${category}` }
    }

    // 验证文件
    const validation = this.validateFile(file)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // 生成文件名（文件名冲突时自动添加数字后缀）
    const fullDir = path.join(UPLOAD_BASE, targetDir)
    const filename = this.generateFilename(file.originalName, targetDir)
    const fullPath = path.join(fullDir, filename)

    // 确保目录存在
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true })
    }

    // 写入文件
    try {
      fs.writeFileSync(fullPath, file.buffer)
      
      const url = `/uploads/${targetDir}/${filename}`
      return {
        success: true,
        filename,
        path: path.join(targetDir, filename),
        url,
        size: file.size
      }
    } catch (error) {
      return { success: false, error: `文件写入失败: ${(error as Error).message}` }
    }
  },

  /**
   * 删除文件
   */
  delete(filePath: string): boolean {
    const fullPath = path.join(UPLOAD_BASE, filePath)
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
      return true
    }
    return false
  },

  /**
   * 获取文件列表
   */
  listFiles(category: string): string[] {
    const targetDir = UPLOAD_DIRS[category]
    if (!targetDir) return []

    const fullDir = path.join(UPLOAD_BASE, targetDir)
    if (!fs.existsSync(fullDir)) return []

    return fs.readdirSync(fullDir).filter(file => {
      const ext = path.extname(file).toLowerCase()
      return ALLOWED_EXTENSIONS.includes(ext)
    })
  },

  /**
   * 获取上传目录配置
   */
  getUploadDirs(): Record<string, string> {
    return { ...UPLOAD_DIRS }
  }
}
