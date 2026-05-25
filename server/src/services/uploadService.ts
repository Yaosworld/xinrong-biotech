/**
 * 文件上传服务
 * 
 * 安全措施：
 * 1. 文件类型白名单验证（不支持 SVG 以防止 XSS 攻击）
 * 2. 文件扩展名验证
 * 3. 文件大小限制
 * 4. 文件名安全处理（防止路径遍历攻击）
 */
import fs from 'fs'
import path from 'path'
import {
  getProfileForUploadCategory,
  optimizeUploadedImage
} from './imageProcessingService'

// 上传目录配置
const UPLOAD_BASE = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads')

// 允许的图片类型（不包含 SVG，因为 SVG 可能包含恶意脚本导致 XSS 攻击）
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

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
  'site-config': 'images/site',  // 网站配置图片（Logo、二维码等）
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
   * 清理文件名，防止路径遍历和注入攻击
   * @param filename 原始文件名
   * @returns 安全的文件名
   */
  sanitizeFilename(filename: string): string {
    // 1. 只取文件名部分，移除任何路径
    let safeName = path.basename(filename)
    
    // 2. 移除路径遍历字符
    safeName = safeName.replace(/\.\./g, '')
    
    // 3. 移除空字节和控制字符
    safeName = safeName.replace(/[\x00-\x1f\x7f]/g, '')
    
    // 4. 只保留安全字符：中文、字母、数字、下划线、横线、点
    safeName = safeName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_')
    
    // 5. 移除连续的点（防止隐藏文件或特殊文件名）
    safeName = safeName.replace(/\.{2,}/g, '.')
    
    // 6. 移除开头的点（防止创建隐藏文件）
    safeName = safeName.replace(/^\.+/, '')
    
    // 7. 限制长度
    if (safeName.length > 100) {
      const ext = path.extname(safeName)
      const base = path.basename(safeName, ext).substring(0, 100 - ext.length)
      safeName = base + ext
    }
    
    // 8. 如果文件名为空，使用默认名称
    if (!safeName || safeName === '.') {
      safeName = 'unnamed'
    }
    
    return safeName
  },

  /**
   * 生成安全的文件名
   * 优先保持原文件名，只在冲突时添加后缀
   */
  generateFilename(originalName: string, targetDir: string): string {
    // 先清理文件名
    const safeName = this.sanitizeFilename(originalName)
    const ext = path.extname(safeName).toLowerCase()
    const baseName = path.basename(safeName, ext).substring(0, 50)
    
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
   * @param file 文件信息
   * @param category 上传分类
   * @param options 选项
   *   - rejectDuplicate: 如果为 true，文件名冲突时返回错误而不是添加后缀
   */
  async upload(file: FileInfo, category: string, options?: { rejectDuplicate?: boolean }): Promise<UploadResult> {
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

    const fullDir = path.join(UPLOAD_BASE, targetDir)
    
    // 确保目录存在
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true })
    }

    const optimized = await optimizeUploadedImage(file, getProfileForUploadCategory(category))

    // 使用安全的文件名处理
    const safeName = this.sanitizeFilename(optimized.originalName)
    const ext = path.extname(safeName).toLowerCase()
    const baseName = path.basename(safeName, ext).substring(0, 50)
    
    let filename = `${baseName}${ext}`
    let fullPath = path.join(fullDir, filename)

    // 二次验证：确保最终路径在目标目录内（防止路径遍历）
    const resolvedPath = path.resolve(fullPath)
    const resolvedDir = path.resolve(fullDir)
    if (!resolvedPath.startsWith(resolvedDir)) {
      return { success: false, error: '非法的文件路径' }
    }

    // 检查文件是否已存在
    if (fs.existsSync(fullPath)) {
      if (options?.rejectDuplicate) {
        // 拒绝重复文件名
        return { success: false, error: `文件名 "${filename}" 已存在，请修改文件名后重试` }
      } else {
        // 添加数字后缀
        let counter = 1
        while (fs.existsSync(fullPath)) {
          filename = `${baseName}_${counter}${ext}`
          fullPath = path.join(fullDir, filename)
          counter++
        }
      }
    }

    // 写入文件
    try {
      fs.writeFileSync(fullPath, optimized.buffer)
      
      const url = `/uploads/${targetDir}/${filename}`
      return {
        success: true,
        filename,
        path: path.join(targetDir, filename),
        url,
        size: optimized.buffer.length
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
