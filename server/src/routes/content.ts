import { Router, Request, Response } from 'express'
import { contentService } from '../services/contentService'

const router = Router()

// ========================================
// 前台 API
// ========================================

// 获取筛选选项（品牌列表等）
router.get('/:type/filter-options', (req: Request, res: Response) => {
  try {
    const { type } = req.params
    const options = contentService.getFilterOptions(type)
    res.json(options)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 获取已发布列表
router.get('/:type/published', (req: Request, res: Response) => {
  try {
    const { type } = req.params
    const result = contentService.getPublishedList(type, {
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20,
      search: req.query.search as string,
      categoryId: req.query.categoryId as string,
      brand: req.query.brand as string,
      sortBy: req.query.sortBy as string
    })
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 获取单条已发布数据
router.get('/:type/:key/published', (req: Request, res: Response) => {
  try {
    const { type, key } = req.params
    const content = contentService.getOne(type, key)
    if (!content || !content.publishedData) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.json(content.publishedData)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
