/**
 * 图片路由工厂
 * 
 * 创建通用的图片管理路由，减少重复代码
 */
import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

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
 */
function generateSafeFilename(
  originalName: string, 
  uploadDir: string, 
  prefix: string = 'image'
): string {
  const ext = path.extname(originalName).toLowerCase()
  let baseName = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
    .substring(0, 50)
  
  // 如果处理后文件名为空或只有下划线，使用时间戳
  if (!baseName || /^_+$/.test(baseName)) {
    baseName = `${prefix}_${Date.now()}`
  }
  
  let filename = `${baseName}${ext}`
  let fullPath = path.join(uploadDir, filename)
  
  // 检查文件名是否已存在，添加计数器
  let counter = 1
  while (fs.existsSync(fullPath)) {
    filename = `${baseName}_${counter}${ext}`
    fullPath = path.join(uploadDir, filename)
    counter++
  }
  
  return filename
}

/**
 * 创建 multer 配置
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
      const originalName = decodeFilename(file.originalname)
      let uploadDir = path.join(UPLOAD_BASE, config.imageDir)
      
      if (config.hasImageType) {
        const imageType = (req.query.type as string) || config.defaultImageType || 'default'
        uploadDir = path.join(uploadDir, `${imageType}s`)
      }
      
      const filename = generateSafeFilename(
        originalName, 
        uploadDir, 
        config.filenamePrefix || 'image'
      )
      cb(null, filename)
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
  router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: '没有上传文件' })
        return
      }
      
      const imageType = config.hasImageType 
        ? (req.query.type as string) || config.defaultImageType 
        : undefined
      
      const image = service.add(req.file.filename, req.file.originalname, imageType)
      res.json({ success: true, data: image })
    } catch (e) {
      // 如果添加记录失败，删除已上传的文件
      if (req.file) {
        const imageType = config.hasImageType 
          ? (req.query.type as string) || config.defaultImageType 
          : undefined
        const filePath = getUploadedFilePath(config, req.file.filename, imageType)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      }
      res.status(500).json({ success: false, error: (e as Error).message })
    }
  })
  
  // ========================================
  // POST /batch-upload - 批量上传图片
  // ========================================
  router.post('/batch-upload', upload.array('files', 20), (req: Request, res: Response) => {
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
        try {
          const image = service.add(file.filename, file.originalname, imageType)
          results.push(image)
        } catch (e) {
          errors.push(`${file.originalname}: ${(e as Error).message}`)
          // 删除上传失败的文件
          const filePath = getUploadedFilePath(config, file.filename, imageType)
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
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
