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
 * 解码文件名（处理中文编码问题）
 * 浏览器发送的 multipart/form-data 中的文件名可能是 UTF-8 编码后以 latin1 方式读取的
 */
function decodeFilename(filename: string): string {
  try {
    // 检查是否已经是有效的 UTF-8（包含中文字符）
    if (/[\u4e00-\u9fa5]/.test(filename)) {
      return filename
    }
    // 尝试将 Latin1 编码的字符串转换为 UTF-8
    const decoded = Buffer.from(filename, 'latin1').toString('utf8')
    // 验证解码后是否是有效的 UTF-8 字符串
    if (decoded && !decoded.includes('\ufffd')) {
      return decoded
    }
    return filename
  } catch {
    return filename
  }
}

/**
 * 批量上传文件
 * POST /api/admin/upload/:category/batch
 */
router.post('/:category/batch', upload.array('files', 20), async (req: Request, res: Response) => {
  try {
    const { category } = req.params
    const files = req.files as Express.Multer.File[]

    console.log('[upload] 收到批量上传请求, category:', category, 'files:', files?.length || 0)

    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: '请选择要上传的文件' })
      return
    }

    const results = []
    const errors = []

    // 对于分类图片，拒绝重复文件名
    const rejectDuplicate = category === 'product-category'

    for (const file of files) {
      // 解码文件名（处理中文编码问题）
      const decodedName = decodeFilename(file.originalname)
      
      const result = await uploadService.upload(
        {
          originalName: decodedName,
          mimeType: file.mimetype,
          size: file.size,
          buffer: file.buffer
        },
        category,
        { rejectDuplicate }
      )

      if (result.success) {
        results.push(result)
      } else {
        errors.push({ filename: decodedName, error: result.error })
      }
    }

    res.json({
      success: errors.length === 0,
      uploaded: results,
      errors,
      total: files.length,
      successCount: results.length,
      errorCount: errors.length
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

/**
 * 检查文件名是否存在
 * POST /api/admin/upload/:category/check-names
 * 
 * 对于分类图片，检查数据库中是否有分类正在使用该图片名
 * 对于其他类型，检查文件系统中是否存在同名文件
 */
router.post('/:category/check-names', (req: Request, res: Response) => {
  try {
    const { category } = req.params
    const { filenames } = req.body

    if (!Array.isArray(filenames)) {
      res.status(400).json({ success: false, error: 'filenames 必须是数组' })
      return
    }

    const conflicts: string[] = []
    const available: string[] = []

    if (category === 'product-category') {
      // 对于分类图片，检查文件系统中是否已存在同名文件
      // 这样可以防止重复上传
      const existingFiles = uploadService.listFiles(category)
      const existingNames = new Set(existingFiles.map(f => f.replace(/\.[^.]+$/, '').toLowerCase()))

      for (const filename of filenames) {
        const nameWithoutExt = filename.replace(/\.[^.]+$/, '').toLowerCase()
        if (existingNames.has(nameWithoutExt)) {
          conflicts.push(filename)
        } else {
          available.push(filename)
        }
      }
    } else {
      // 对于其他类型，检查文件系统
      const existingFiles = uploadService.listFiles(category)
      const existingNames = new Set(existingFiles.map(f => f.replace(/\.[^.]+$/, '').toLowerCase()))

      for (const filename of filenames) {
        const nameWithoutExt = filename.replace(/\.[^.]+$/, '').toLowerCase()
        if (existingNames.has(nameWithoutExt)) {
          conflicts.push(filename)
        } else {
          available.push(filename)
        }
      }
    }

    res.json({
      success: true,
      conflicts,
      available,
      hasConflicts: conflicts.length > 0
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
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

    // 解码文件名（处理中文编码问题）
    const decodedName = decodeFilename(file.originalname)
    
    const result = await uploadService.upload(
      {
        originalName: decodedName,
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
 * 获取上传配置
 * GET /api/admin/upload/config
 * 注意：静态路由必须放在动态路由 /:category 之前
 */
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    categories: uploadService.getUploadDirs(),
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  })
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

export default router
