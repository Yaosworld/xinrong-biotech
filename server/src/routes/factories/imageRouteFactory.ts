/**
 * 图片路由工厂
 * 
 * 创建通用的图片管理路由，减少重复代码
 * 支持上传后自动转换为 WebP 格式
 */
import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

// 动态导入 sharp（可能未安装）
let sharp: any = null
try {
  sharp = require('sharp')
  console.log('✅ Sharp 已加载，支持 WebP 转换')
} catch {
  console.warn('⚠️ Sharp 未安装，图片将保持原格式。安装命令: cd server && npm install sharp')
}

// ========================================
// 类型定义
// ========================================

/** 图片服务接口（所有图片服务必须实现） */
export interface ImageService {
  getAll(imageType?: string): any[]
  getById(id: number): any | null
  add(filename: string, originalName: string, imageType?: string): any
  delete(id: number): { success: boolean; error?: string }
  syncFromFileSystem(): { added: number; existing: number; skipped: number }
  isAllowedType(mimetype: string): boolean
  getAvailable?(): any[]  // 可选：获取可用图片
}

/** 路由配置 */
export interface ImageRouteConfig {
  /** 图片目录（相对于 uploads） */
  imageDir: string
  /** 文件大小限制（字节） */
  maxFileSize?: number
  /** 是否支持图片类型（如 cover/poster） */
  hasImageType?: boolean
  /** 图片类型列表 */
  imageTypes?: string[]
  /** 默认图片类型 */
  defaultImageType?: string
  /** 文件名前缀（用于生成默认文件名） */
  filenamePrefix?: string
  /** 是否有 getAvailable 方法 */
  hasAvailable?: boolean
}

// ========================================
// 常量
// ========================================

const UPLOAD_BASE = process.env.UPLOAD_PATH || path.join(__dirname, '../../../uploads')
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// ========================================
// 辅助函数
// ========================================

/**
 * 解码文件名（处理中文编码问题）
 */
function decodeFilename(originalname: string): string {
  try {
    return Buffer.from(originalname, 'latin1').toString('utf8')
  } catch {
    return originalname
  }
}

/**
 * 生成安全的文件名
 * @param convertToWebp 是否转换为 WebP（会改变扩展名）
 * 
 * 文件名格式: 原名_时间戳_随机数.扩展名
 * 这样可以避免浏览器缓存问题（同名文件被删除后重新上传）
 */
function generateSafeFilename(
  originalName: string, 
  uploadDir: string, 
  prefix: string = 'image',
  convertToWebp: boolean = false
): string {
  const originalExt = path.extname(originalName).toLowerCase()
  // 如果要转换为 WebP，使用 .webp 扩展名
  const ext = convertToWebp && originalExt !== '.webp' && originalExt !== '.gif' ? '.webp' : originalExt
  
  let baseName = path.basename(originalName, originalExt)
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
    .substring(0, 50)
  
  // 如果处理后文件名为空或只有下划线，使用前缀
  if (!baseName || /^_+$/.test(baseName)) {
    baseName = prefix
  }
  
  // 添加时间戳和随机字符串，确保文件名唯一，避免浏览器缓存问题
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 6)
  const filename = `${baseName}_${timestamp}_${random}${ext}`
  
  return filename
}

/**
 * 将图片转换为 WebP 格式
 * @returns 转换后的文件名，如果转换失败返回原文件名
 */
async function convertToWebp(
  sourcePath: string,
  targetDir: string,
  targetFilename: string,
  quality: number = 85
): Promise<{ filename: string; converted: boolean }> {
  if (!sharp) {
    return { filename: path.basename(sourcePath), converted: false }
  }
  
  const ext = path.extname(sourcePath).toLowerCase()
  
  // GIF 保持原格式（保留动画）
  if (ext === '.gif') {
    return { filename: path.basename(sourcePath), converted: false }
  }
  
  // 已经是 WebP 不需要转换
  if (ext === '.webp') {
    return { filename: path.basename(sourcePath), converted: false }
  }
  
  try {
    const targetPath = path.join(targetDir, targetFilename)
    
    await sharp(sourcePath)
      .webp({ quality })
      .toFile(targetPath)
    
    // 删除原文件
    if (fs.existsSync(sourcePath)) {
      fs.unlinkSync(sourcePath)
    }
    
    return { filename: targetFilename, converted: true }
  } catch (error) {
    console.error('WebP 转换失败:', error)
    // 转换失败，保留原文件
    return { filename: path.basename(sourcePath), converted: false }
  }
}

/**
 * 创建 multer 配置
 * 使用临时文件名保存，后续处理时再转换为 WebP
 */
function createMulterConfig(config: ImageRouteConfig) {
  const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
      let dir = path.join(UPLOAD_BASE, config.imageDir)
      
      // 如果支持图片类型，添加子目录
      if (config.hasImageType) {
        const imageType = (req.query.type as string) || config.defaultImageType || 'default'
        dir = path.join(dir, `${imageType}s`)
      }
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      cb(null, dir)
    },
    filename: (req, file, cb) => {
      // 使用临时文件名（保留原扩展名），后续转换时再改名
      const originalName = decodeFilename(file.originalname)
      const ext = path.extname(originalName).toLowerCase()
      const tempFilename = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`
      cb(null, tempFilename)
    }
  })
  
  return multer({
    storage,
    limits: { fileSize: config.maxFileSize || DEFAULT_MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true)
      } else {
        cb(new Error('不支持的文件类型，仅支持 JPG、PNG、GIF、WebP 格式'))
      }
    }
  })
}

/**
 * 处理上传的文件：转换为 WebP 并重命名
 */
async function processUploadedFile(
  file: Express.Multer.File,
  config: ImageRouteConfig,
  imageType?: string
): Promise<{ filename: string; originalName: string }> {
  const originalName = decodeFilename(file.originalname)
  let uploadDir = path.join(UPLOAD_BASE, config.imageDir)
  
  if (config.hasImageType && imageType) {
    uploadDir = path.join(uploadDir, `${imageType}s`)
  }
  
  const sourcePath = file.path
  const originalExt = path.extname(originalName).toLowerCase()
  const shouldConvert = !!sharp && originalExt !== '.webp' && originalExt !== '.gif'
  
  // 生成目标文件名（如果要转换，扩展名改为 .webp）
  const targetFilename = generateSafeFilename(
    originalName,
    uploadDir,
    config.filenamePrefix || 'image',
    shouldConvert
  )
  
  // 如果转换了格式，originalName 也要改成 .webp 扩展名
  let displayName = originalName
  if (shouldConvert) {
    const baseName = path.basename(originalName, originalExt)
    displayName = `${baseName}.webp`
  }
  
  if (shouldConvert) {
    // 转换为 WebP
    const result = await convertToWebp(sourcePath, uploadDir, targetFilename)
    return { filename: result.filename, originalName: displayName }
  } else {
    // 不转换，只重命名
    const targetPath = path.join(uploadDir, targetFilename)
    fs.renameSync(sourcePath, targetPath)
    return { filename: targetFilename, originalName: displayName }
  }
}

/**
 * 获取上传文件的完整路径
 */
function getUploadedFilePath(config: ImageRouteConfig, filename: string, imageType?: string): string {
  let filePath = path.join(UPLOAD_BASE, config.imageDir)
  if (config.hasImageType && imageType) {
    filePath = path.join(filePath, `${imageType}s`)
  }
  return path.join(filePath, filename)
}

// ========================================
// 路由工厂
// ========================================

/**
 * 创建图片管理路由
 */
export function createImageRouter(service: ImageService, config: ImageRouteConfig): Router {
  const router = Router()
  const upload = createMulterConfig(config)
  
  // ========================================
  // GET /list - 获取所有图片
  // ========================================
  router.get('/list', (req: Request, res: Response) => {
    try {
      const imageType = config.hasImageType ? req.query.type as string : undefined
      const images = service.getAll(imageType)
      res.json({ success: true, data: images })
    } catch (e) {
      res.status(500).json({ success: false, error: (e as Error).message })
    }
  })
  
  // ========================================
  // GET /available - 获取可用图片（可选）
  // ========================================
  if (config.hasAvailable && service.getAvailable) {
    router.get('/available', (_req: Request, res: Response) => {
      try {
        const images = service.getAvailable!()
        res.json({ success: true, data: images })
      } catch (e) {
        res.status(500).json({ success: false, error: (e as Error).message })
      }
    })
  }
  
  // ========================================
  // 按类型获取图片（如果支持图片类型）
  // ========================================
  if (config.hasImageType && config.imageTypes) {
    for (const type of config.imageTypes) {
      router.get(`/${type}s`, (_req: Request, res: Response) => {
        try {
          const images = service.getAll(type)
          res.json({ success: true, data: images })
        } catch (e) {
          res.status(500).json({ success: false, error: (e as Error).message })
        }
      })
    }
  }
  
  // ========================================
  // POST /upload - 上传单张图片
  // ========================================
  router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    let processedFilename: string | null = null
    const imageType = config.hasImageType 
      ? (req.query.type as string) || config.defaultImageType 
      : undefined
    
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: '没有上传文件' })
        return
      }
      
      // 处理上传的文件（转换为 WebP 并重命名）
      const { filename, originalName } = await processUploadedFile(req.file, config, imageType)
      processedFilename = filename
      
      const image = service.add(filename, originalName, imageType)
      res.json({ success: true, data: image })
    } catch (e) {
      // 如果添加记录失败，删除已上传的文件
      if (processedFilename) {
        const filePath = getUploadedFilePath(config, processedFilename, imageType)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } else if (req.file && fs.existsSync(req.file.path)) {
        // 删除临时文件
        fs.unlinkSync(req.file.path)
      }
      res.status(500).json({ success: false, error: (e as Error).message })
    }
  })
  
  // ========================================
  // POST /batch-upload - 批量上传图片
  // ========================================
  router.post('/batch-upload', upload.array('files', 20), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[]
      if (!files || files.length === 0) {
        res.status(400).json({ success: false, error: '没有上传文件' })
        return
      }
      
      const imageType = config.hasImageType 
        ? (req.query.type as string) || config.defaultImageType 
        : undefined
      
      const results: any[] = []
      const errors: string[] = []
      
      for (const file of files) {
        let processedFilename: string | null = null
        try {
          // 处理上传的文件（转换为 WebP 并重命名）
          const { filename, originalName } = await processUploadedFile(file, config, imageType)
          processedFilename = filename
          
          const image = service.add(filename, originalName, imageType)
          results.push(image)
        } catch (e) {
          const originalName = decodeFilename(file.originalname)
          errors.push(`${originalName}: ${(e as Error).message}`)
          // 删除上传失败的文件
          if (processedFilename) {
            const filePath = getUploadedFilePath(config, processedFilename, imageType)
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath)
            }
          } else if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path)
          }
        }
      }
      
      res.json({
        success: true,
        data: results,
        successCount: results.length,
        errorCount: errors.length,
        errors
      })
    } catch (e) {
      res.status(500).json({ success: false, error: (e as Error).message })
    }
  })
  
  // ========================================
  // DELETE /:id - 删除图片
  // ========================================
  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10)
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: '无效的图片ID' })
        return
      }
      
      const result = service.delete(id)
      if (result.success) {
        res.json({ success: true })
      } else {
        res.status(400).json({ success: false, error: result.error })
      }
    } catch (e) {
      res.status(500).json({ success: false, error: (e as Error).message })
    }
  })
  
  // ========================================
  // POST /batch-delete - 批量删除图片
  // ========================================
  router.post('/batch-delete', (req: Request, res: Response) => {
    try {
      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, error: '请提供要删除的图片ID列表' })
        return
      }
      
      let successCount = 0
      let failCount = 0
      const errors: string[] = []
      
      for (const id of ids) {
        const numId = parseInt(id, 10)
        if (isNaN(numId)) {
          failCount++
          errors.push(`无效的ID: ${id}`)
          continue
        }
        
        const image = service.getById(numId)
        if (!image) {
          failCount++
          errors.push(`图片不存在: ${id}`)
          continue
        }
        
        const result = service.delete(numId)
        if (result.success) {
          successCount++
        } else {
          failCount++
          errors.push(`${image.filename}: ${result.error}`)
        }
      }
      
      res.json({
        success: true,
        successCount,
        failCount,
        errors: errors.length > 0 ? errors : undefined
      })
    } catch (e) {
      res.status(500).json({ success: false, error: (e as Error).message })
    }
  })
  
  // ========================================
  // POST /sync - 同步文件系统
  // ========================================
  router.post('/sync', (_req: Request, res: Response) => {
    try {
      const result = service.syncFromFileSystem()
      res.json({ success: true, ...result })
    } catch (e) {
      res.status(500).json({ success: false, error: (e as Error).message })
    }
  })
  
  return router
}
