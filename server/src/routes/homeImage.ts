/**
 * 首页图片管理 API
 */
import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { homeImageService } from '../services/homeImageService'

const router = Router()

// 上传目录配置
const UPLOAD_BASE = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads')
const HOME_IMAGE_DIR = 'images/home'

// 配置 multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOAD_BASE, HOME_IMAGE_DIR)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    let originalName = file.originalname
    try {
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf8')
    } catch {}
    
    const ext = path.extname(originalName).toLowerCase()
    let baseName = path.basename(originalName, ext)
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
      .substring(0, 50)
    
    if (!baseName || /^_+$/.test(baseName)) {
      baseName = `home_${Date.now()}`
    }
    
    let filename = `${baseName}${ext}`
    let fullPath = path.join(UPLOAD_BASE, HOME_IMAGE_DIR, filename)
    
    let counter = 1
    while (fs.existsSync(fullPath)) {
      filename = `${baseName}_${counter}${ext}`
      fullPath = path.join(UPLOAD_BASE, HOME_IMAGE_DIR, filename)
      counter++
    }
    
    cb(null, filename)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件类型，仅支持 JPG、PNG、GIF、WebP 格式'))
    }
  }
})

// 获取所有图片
router.get('/list', (_req: Request, res: Response) => {
  try {
    const images = homeImageService.getAll()
    res.json({ success: true, data: images })
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message })
  }
})

// 上传单张图片
router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: '没有上传文件' })
      return
    }
    
    const image = homeImageService.add(req.file.filename, req.file.originalname)
    res.json({ success: true, data: image })
  } catch (e) {
    if (req.file) {
      const filePath = path.join(UPLOAD_BASE, HOME_IMAGE_DIR, req.file.filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }
    res.status(500).json({ success: false, error: (e as Error).message })
  }
})

// 批量上传图片
router.post('/batch-upload', upload.array('files', 20), (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: '没有上传文件' })
      return
    }
    
    const results: any[] = []
    const errors: string[] = []
    
    for (const file of files) {
      try {
        const image = homeImageService.add(file.filename, file.originalname)
        results.push(image)
      } catch (e) {
        errors.push(`${file.originalname}: ${(e as Error).message}`)
        const filePath = path.join(UPLOAD_BASE, HOME_IMAGE_DIR, file.filename)
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

// 删除图片
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: '无效的图片ID' })
      return
    }
    
    const result = homeImageService.delete(id)
    if (result.success) {
      res.json({ success: true })
    } else {
      res.status(400).json({ success: false, error: result.error })
    }
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message })
  }
})

// 同步文件系统
router.post('/sync', (_req: Request, res: Response) => {
  try {
    const result = homeImageService.syncFromFileSystem()
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message })
  }
})

export default router
