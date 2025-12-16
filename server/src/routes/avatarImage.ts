/**
 * 头像图片管理路由
 */
import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { avatarImageService } from '../services/avatarImageService'

const router = Router()

// 配置上传目录
const uploadDir = process.env.UPLOAD_PATH 
  ? path.join(process.env.UPLOAD_PATH, 'images/avatars')
  : path.join(__dirname, '../../uploads/images/avatars')

// 确保目录存在
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 配置 multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const uniqueId = crypto.randomBytes(8).toString('hex')
    cb(null, `avatar_${Date.now()}_${uniqueId}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (avatarImageService.isAllowedType(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件类型'))
    }
  }
})

// 获取头像列表
router.get('/list', (_req, res) => {
  try {
    const images = avatarImageService.getAll()
    res.json({ success: true, data: images })
  } catch (error) {
    console.error('获取头像列表失败:', error)
    res.status(500).json({ success: false, error: '获取列表失败' })
  }
})

// 批量上传头像
router.post('/batch-upload', upload.array('files', 20), (req, res) => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: '没有上传文件' })
    }
    
    const results: any[] = []
    const errors: string[] = []
    
    for (const file of files) {
      try {
        const image = avatarImageService.add(file.filename, file.originalname)
        results.push(image)
      } catch (e) {
        errors.push(file.originalname)
        // 删除上传失败的文件
        fs.unlinkSync(file.path)
      }
    }
    
    res.json({
      success: true,
      successCount: results.length,
      errorCount: errors.length,
      data: results,
      errors
    })
  } catch (error) {
    console.error('批量上传失败:', error)
    res.status(500).json({ success: false, error: '上传失败' })
  }
})

// 删除头像
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const result = avatarImageService.delete(id)
    
    if (result.success) {
      res.json({ success: true })
    } else {
      res.status(400).json({ success: false, error: result.error })
    }
  } catch (error) {
    console.error('删除头像失败:', error)
    res.status(500).json({ success: false, error: '删除失败' })
  }
})

// 同步文件系统
router.post('/sync', (_req, res) => {
  try {
    const result = avatarImageService.syncFromFileSystem()
    res.json({ success: true, ...result })
  } catch (error) {
    console.error('同步失败:', error)
    res.status(500).json({ success: false, error: '同步失败' })
  }
})

export default router
