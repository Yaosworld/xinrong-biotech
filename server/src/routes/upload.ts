/**
 * 文件上传路由
 */
import { Router, Request, Response } from 'express'
import multer from 'multer'
import { uploadService } from '../services/uploadService'

const router = Router()

// 配置 multer（内存存储）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
})

/**
 * 上传单个文件
 * POST /api/admin/upload/:category
 */
router.post('/:category', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { category } = req.params
    const file = req.file

    if (!file) {
      res.status(400).json({ success: false, error: '请选择要上传的文件' })
      return
    }

    const result = await uploadService.upload(
      {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        buffer: file.buffer
      },
      category
    )

    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

/**
 * 获取文件列表
 * GET /api/admin/upload/:category/list
 */
router.get('/:category/list', (req: Request, res: Response) => {
  try {
    const { category } = req.params
    const files = uploadService.listFiles(category)
    const dirs = uploadService.getUploadDirs()
    const baseUrl = dirs[category] || ''
    
    res.json({
      success: true,
      files: files.map(filename => ({
        filename,
        url: `/uploads/${baseUrl}/${filename}`
      }))
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

/**
 * 删除文件
 * DELETE /api/admin/upload
 */
router.delete('/', (req: Request, res: Response) => {
  try {
    const { path: filePath } = req.body
    
    if (!filePath) {
      res.status(400).json({ success: false, error: '请提供文件路径' })
      return
    }

    const deleted = uploadService.delete(filePath)
    res.json({ success: deleted })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

/**
 * 获取上传配置
 * GET /api/admin/upload/config
 */
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    categories: uploadService.getUploadDirs(),
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  })
})

export default router
