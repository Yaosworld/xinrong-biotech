import { Router, Request, Response } from 'express'
import multer from 'multer'
import { contentService } from '../services/contentService'
import { importService, ImportMode } from '../services/importService'
import { categoryService } from '../services/categoryService'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// ========================================
// 内容管理
// ========================================

// 获取后台列表
router.get('/content/:type', (req: Request, res: Response) => {
  try {
    const { type } = req.params
    const result = contentService.getAdminList(type, {
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20
    })
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 获取单条详情
router.get('/content/:type/:key', (req: Request, res: Response) => {
  try {
    const { type, key } = req.params
    const content = contentService.getOne(type, key)
    if (!content) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.json(content)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 获取版本历史
router.get('/content/:type/:key/versions', (req: Request, res: Response) => {
  try {
    const { type, key } = req.params
    const versions = contentService.getVersions(type, key)
    res.json(versions)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 保存草稿
router.put('/content/:type/:key/draft', (req: Request, res: Response) => {
  try {
    const { type, key } = req.params
    contentService.saveDraft(type, key, req.body)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 批量保存草稿
router.put('/content/:type/batch-draft', (req: Request, res: Response) => {
  try {
    const { type } = req.params
    const { items } = req.body
    console.log(`[batch-draft] 类型: ${type}, 数量: ${items?.length || 0}`)
    contentService.batchSaveDraft(type, items)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 发布
router.post('/content/:type/:key/publish', (req: Request, res: Response) => {
  try {
    const { type, key } = req.params
    const { changeSummary } = req.body || {}
    const version = contentService.publish(type, key, changeSummary)
    res.json({ success: true, version })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 批量发布（支持变更说明）
router.post('/content/:type/batch-publish', (req: Request, res: Response) => {
  try {
    const { type } = req.params
    const { keys, changeSummary } = req.body
    const count = contentService.batchPublish(type, keys, changeSummary)
    res.json({ success: true, publishedCount: count })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 回滚
router.post('/content/:type/:key/rollback', (req: Request, res: Response) => {
  try {
    const { type, key } = req.params
    const { version } = req.body
    contentService.rollback(type, key, version)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 删除
router.delete('/content/:type/:key', (req: Request, res: Response) => {
  try {
    const { type, key } = req.params
    
    // 分类删除需要检查是否有关联产品
    if (type === 'category') {
      const { canDelete, productCount } = categoryService.canDelete(key)
      if (!canDelete) {
        res.status(400).json({ 
          error: `无法删除该分类，该分类下有 ${productCount} 个产品`,
          productCount 
        })
        return
      }
    }
    
    contentService.delete(type, key)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 批量删除
router.post('/content/:type/batch-delete', (req: Request, res: Response) => {
  try {
    const { type } = req.params
    const { keys } = req.body
    
    // 添加日志追踪
    console.log(`[batch-delete] 类型: ${type}, 数量: ${keys?.length || 0}`)
    if (keys?.length > 0) {
      console.log(`[batch-delete] 前5个key: ${keys.slice(0, 5).join(', ')}`)
    }
    
    if (!Array.isArray(keys) || keys.length === 0) {
      res.status(400).json({ error: 'keys must be a non-empty array' })
      return
    }
    
    const count = contentService.batchDelete(type, keys)
    console.log(`[batch-delete] 已删除 ${count} 条`)
    res.json({ success: true, deletedCount: count })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// ========================================
// 分类管理
// ========================================

// 获取分类列表（含产品数量）
router.get('/category/with-count', (req: Request, res: Response) => {
  try {
    const categories = categoryService.getCategoriesWithCount()
    res.json({ data: categories })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 检测未定义的分类
router.post('/category/detect-undefined', (req: Request, res: Response) => {
  try {
    const { categoryValues } = req.body
    if (!Array.isArray(categoryValues)) {
      res.status(400).json({ error: 'categoryValues must be an array' })
      return
    }
    const undefinedCategories = categoryService.detectUndefinedCategories(categoryValues)
    res.json({ undefinedCategories })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 批量创建分类
router.post('/category/batch-create', (req: Request, res: Response) => {
  try {
    const { categories } = req.body
    if (!Array.isArray(categories)) {
      res.status(400).json({ error: 'categories must be an array' })
      return
    }
    const created = categoryService.batchCreateCategories(categories)
    res.json({ success: true, data: created })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 生成新的分类ID
router.get('/category/generate-id', (req: Request, res: Response) => {
  try {
    const id = categoryService.generateCategoryId()
    res.json({ id })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 直接保存所有分类（不使用发布机制）
router.put('/category/save-all', (req: Request, res: Response) => {
  try {
    const { categories } = req.body
    console.log('[save-all] 收到分类数据:', JSON.stringify(categories).substring(0, 200))
    if (!Array.isArray(categories)) {
      res.status(400).json({ error: 'categories must be an array' })
      return
    }
    console.log('[save-all] 分类数量:', categories.length)
    categoryService.saveAllCategories(categories)
    res.json({ success: true })
  } catch (e) {
    console.error('[save-all] 错误:', e)
    res.status(500).json({ error: (e as Error).message })
  }
})

// 检查分类是否可以删除
router.get('/category/:id/can-delete', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = categoryService.canDelete(id)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 删除单个分类（同时删除图片）
router.delete('/category/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = categoryService.deleteCategory(id)
    if (result.success) {
      res.json({ success: true })
    } else {
      res.status(400).json({ success: false, error: result.error })
    }
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 重置为默认分类
router.post('/category/reset-default', (_req: Request, res: Response) => {
  try {
    categoryService.resetToDefaultCategories()
    const categories = categoryService.getCategoriesWithCount()
    res.json({ success: true, data: categories })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// ========================================
// 导入管理
// ========================================

// 预览导入
router.post('/import/:type/preview', upload.single('file'), (req: Request, res: Response) => {
  try {
    const { type } = req.params
    const mode = req.body.mode as ImportMode
    
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' })
      return
    }
    
    const data = importService.parseExcel(req.file.buffer)
    const preview = importService.previewImport(type, data, mode)
    
    res.json(preview)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 执行导入
router.post('/import/:type/execute', (req: Request, res: Response) => {
  try {
    const { type } = req.params
    const { data, mode, autoPublish } = req.body
    
    const result = importService.executeImport(type, data, mode, autoPublish)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 获取导入历史
router.get('/import/:type/logs', (req: Request, res: Response) => {
  try {
    const { type } = req.params
    const logs = importService.getImportLogs(type)
    res.json(logs)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
