import db from '../db'
import fs from 'fs'
import path from 'path'
const { batchOperation, runNoSave } = db

// 图片目录配置
const UPLOAD_BASE = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads')

export interface QueryOptions {
  page?: number
  pageSize?: number
  search?: string
  categoryId?: string
  brand?: string
  sortBy?: string
  status?: string
}

export const contentService = {
  // ========================================
  // 查询
  // ========================================
  
  // 获取已发布列表（支持分页和筛选）
  getPublishedList(contentType: string, options: QueryOptions = {}) {
    const { page = 1, pageSize = 20, search, categoryId, brand, sortBy } = options
    
    // 获取所有已发布数据
    const rows = db.queryAll(`
      SELECT published_data, sort_order FROM contents 
      WHERE content_type = ? AND status = 'published' AND published_data IS NOT NULL
      ORDER BY sort_order ASC, id ASC
    `, [contentType])
    
    // 解析 JSON
    let data = rows.map(row => ({
      ...JSON.parse(row.published_data),
      _sortOrder: row.sort_order
    }))
    
    // 如果是分类数据，自动添加 imageUrl
    if (contentType === 'category') {
      data = this.enrichCategoryData(data)
    }
    
    // 如果是促销活动数据，自动添加图片 URL
    if (contentType === 'promotion') {
      data = this.enrichPromotionData(data)
    }
    
    // 筛选
    if (search) {
      const query = search.toLowerCase()
      data = data.filter(item => 
        Object.values(item).some(val => 
          val && String(val).toLowerCase().includes(query)
        )
      )
    }
    
    if (categoryId) {
      data = data.filter(item => item.categoryId === categoryId)
    }
    
    if (brand) {
      data = data.filter(item => item.brand === brand)
    }
    
    // 排序
    if (sortBy) {
      const [field, order] = sortBy.split('-')
      data.sort((a, b) => {
        const aVal = a[field] || ''
        const bVal = b[field] || ''
        const cmp = String(aVal).localeCompare(String(bVal), 'zh-CN')
        return order === 'desc' ? -cmp : cmp
      })
    }
    
    // 分页
    const total = data.length
    const totalPages = Math.ceil(total / pageSize)
    const start = (page - 1) * pageSize
    const paginatedData = data.slice(start, start + pageSize)
    
    // 移除内部字段
    paginatedData.forEach(item => delete item._sortOrder)
    
    return {
      data: paginatedData,
      pagination: { page, pageSize, total, totalPages }
    }
  },
  
  // 获取后台列表（包含草稿）
  getAdminList(contentType: string, options: QueryOptions = {}) {
    const { page = 1, pageSize = 20 } = options
    
    const rows = db.queryAll(`
      SELECT * FROM contents 
      WHERE content_type = ? AND status != 'deleted'
      ORDER BY sort_order ASC, id ASC
    `, [contentType])
    
    const data = rows.map(row => ({
      id: row.id,
      contentType: row.content_type,
      contentKey: row.content_key,
      draftData: row.draft_data ? JSON.parse(row.draft_data) : null,
      publishedData: row.published_data ? JSON.parse(row.published_data) : null,
      status: row.status,
      version: row.version,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
      hasUnpublishedChanges: row.draft_data !== row.published_data
    }))
    
    const total = data.length
    const totalPages = Math.ceil(total / pageSize)
    const start = (page - 1) * pageSize
    
    return {
      data: data.slice(start, start + pageSize),
      pagination: { page, pageSize, total, totalPages }
    }
  },
  
  // 获取单条
  getOne(contentType: string, contentKey: string) {
    const row = db.queryOne(`
      SELECT * FROM contents WHERE content_type = ? AND content_key = ?
    `, [contentType, contentKey])
    
    if (!row) return null
    
    return {
      id: row.id,
      contentType: row.content_type,
      contentKey: row.content_key,
      draftData: row.draft_data ? JSON.parse(row.draft_data) : null,
      publishedData: row.published_data ? JSON.parse(row.published_data) : null,
      status: row.status,
      version: row.version,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at
    }
  },
  
  // 获取筛选选项（品牌列表等）
  getFilterOptions(contentType: string) {
    const rows = db.queryAll(`
      SELECT published_data FROM contents 
      WHERE content_type = ? AND status = 'published' AND published_data IS NOT NULL
    `, [contentType])
    
    const brands = new Set<string>()
    const categories = new Set<string>()
    
    rows.forEach(row => {
      const data = JSON.parse(row.published_data)
      if (data.brand) brands.add(data.brand)
      if (data.categoryId) categories.add(data.categoryId)
    })
    
    return {
      brands: Array.from(brands).sort((a, b) => a.localeCompare(b, 'zh-CN')),
      categories: Array.from(categories).sort(),
      total: rows.length
    }
  },

  // 获取版本历史
  getVersions(contentType: string, contentKey: string) {
    const content = db.queryOne(`
      SELECT id FROM contents WHERE content_type = ? AND content_key = ?
    `, [contentType, contentKey])
    
    if (!content) return []
    
    const versions = db.queryAll(`
      SELECT version, data, change_summary, created_at 
      FROM content_versions 
      WHERE content_id = ? 
      ORDER BY version DESC
    `, [content.id])
    
    return versions.map(v => ({
      version: v.version,
      data: JSON.parse(v.data),
      changeSummary: v.change_summary,
      createdAt: v.created_at
    }))
  },

  // ========================================
  // 写入
  // ========================================
  
  // 保存草稿
  saveDraft(contentType: string, contentKey: string, data: any) {
    const draftData = JSON.stringify(data)
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    
    // 检查是否存在
    const existing = db.queryOne(`
      SELECT id FROM contents WHERE content_type = ? AND content_key = ?
    `, [contentType, contentKey])
    
    if (existing) {
      db.run(`
        UPDATE contents SET draft_data = ?, updated_at = ?
        WHERE content_type = ? AND content_key = ?
      `, [draftData, now, contentType, contentKey])
    } else {
      // 计算排序值
      const maxOrder = db.queryOne(`
        SELECT MAX(sort_order) as max FROM contents WHERE content_type = ?
      `, [contentType])
      const sortOrder = (maxOrder?.max || 0) + 1
      
      db.run(`
        INSERT INTO contents (content_type, content_key, draft_data, status, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, 'draft', ?, ?, ?)
      `, [contentType, contentKey, draftData, sortOrder, now, now])
    }
  },
  
  // 批量保存草稿（优化版：减少磁盘写入次数）
  batchSaveDraft(contentType: string, items: { key: string; data: any }[]) {
    if (items.length === 0) return
    
    batchOperation(() => {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
      
      // 一次性查询所有已存在的记录（包括已删除的，用于恢复）
      const existingRows = db.queryAll(`
        SELECT content_key, id, status FROM contents 
        WHERE content_type = ? AND content_key IN (${items.map(() => '?').join(',')})
      `, [contentType, ...items.map(i => i.key)])
      
      // 区分活跃记录和已删除记录
      const activeKeys = new Set<string>()
      const deletedKeys = new Set<string>()
      existingRows.forEach(r => {
        if (r.status === 'deleted') {
          deletedKeys.add(r.content_key)
        } else {
          activeKeys.add(r.content_key)
        }
      })
      
      // 获取当前最大排序值
      const maxOrderResult = db.queryOne(`
        SELECT MAX(sort_order) as max FROM contents WHERE content_type = ?
      `, [contentType])
      let sortOrder = (maxOrderResult?.max || 0) + 1
      
      // 分离新增、更新和恢复
      const toInsert: { key: string; data: string; sortOrder: number }[] = []
      const toUpdate: { key: string; data: string }[] = []
      const toRestore: { key: string; data: string }[] = []
      
      for (const item of items) {
        const draftData = JSON.stringify(item.data)
        if (activeKeys.has(item.key)) {
          // 活跃记录：只更新数据
          toUpdate.push({ key: item.key, data: draftData })
        } else if (deletedKeys.has(item.key)) {
          // 已删除记录：恢复并更新数据
          toRestore.push({ key: item.key, data: draftData })
        } else {
          // 新记录：插入
          toInsert.push({ key: item.key, data: draftData, sortOrder: sortOrder++ })
        }
      }
      
      // 批量更新活跃记录
      for (const item of toUpdate) {
        runNoSave(`
          UPDATE contents SET draft_data = ?, updated_at = ?
          WHERE content_type = ? AND content_key = ?
        `, [item.data, now, contentType, item.key])
      }
      
      // 批量恢复已删除记录（更新数据并恢复状态）
      for (const item of toRestore) {
        runNoSave(`
          UPDATE contents SET draft_data = ?, status = 'draft', updated_at = ?
          WHERE content_type = ? AND content_key = ?
        `, [item.data, now, contentType, item.key])
      }
      
      // 批量插入新记录
      for (const item of toInsert) {
        runNoSave(`
          INSERT INTO contents (content_type, content_key, draft_data, status, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, 'draft', ?, ?, ?)
        `, [contentType, item.key, item.data, item.sortOrder, now, now])
      }
    })
  },
  
  // 删除（软删除）
  delete(contentType: string, contentKey: string) {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    
    db.run(`
      UPDATE contents SET status = 'deleted', updated_at = ?
      WHERE content_type = ? AND content_key = ?
    `, [now, contentType, contentKey])
  },
  
  // 批量删除（软删除，优化版：减少磁盘写入次数）
  batchDelete(contentType: string, contentKeys: string[]) {
    if (contentKeys.length === 0) return 0
    
    return batchOperation(() => {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
      
      // 使用 IN 子句一次性更新所有记录
      const placeholders = contentKeys.map(() => '?').join(',')
      runNoSave(`
        UPDATE contents SET status = 'deleted', updated_at = ?
        WHERE content_type = ? AND content_key IN (${placeholders})
      `, [now, contentType, ...contentKeys])
      
      return contentKeys.length
    })
  },

  // ========================================
  // 发布
  // ========================================
  
  // 发布单条
  publish(contentType: string, contentKey: string, changeSummary?: string) {
    const content = db.queryOne(`
      SELECT * FROM contents WHERE content_type = ? AND content_key = ?
    `, [contentType, contentKey])
    
    if (!content) throw new Error('Content not found')
    if (!content.draft_data) throw new Error('No draft data to publish')
    
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    const newVersion = content.version + 1
    
    return db.transaction(() => {
      // 创建版本快照（包含变更说明）
      db.run(`
        INSERT INTO content_versions (content_id, version, data, change_summary, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [content.id, newVersion, content.draft_data, changeSummary || null, now])
      
      // 发布
      db.run(`
        UPDATE contents SET 
          published_data = ?,
          status = 'published',
          version = ?,
          published_at = ?,
          updated_at = ?
        WHERE id = ?
      `, [content.draft_data, newVersion, now, now, content.id])
      
      return newVersion
    })
  },
  
  // 批量发布（优化版：减少查询和磁盘写入次数）
  batchPublish(contentType: string, contentKeys: string[], changeSummary?: string) {
    if (contentKeys.length === 0) return 0
    
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    let publishedCount = 0
    // 自动生成变更说明（如果未提供）
    const summary = changeSummary || `批量发布 ${contentKeys.length} 条 ${contentType} 数据`
    
    return batchOperation(() => {
      // 一次性查询所有需要发布的内容
      const contents = db.queryAll(`
        SELECT id, content_key, draft_data, version FROM contents 
        WHERE content_type = ? AND content_key IN (${contentKeys.map(() => '?').join(',')})
          AND draft_data IS NOT NULL
      `, [contentType, ...contentKeys])
      
      // 批量处理
      for (const content of contents) {
        const newVersion = content.version + 1
        
        // 创建版本快照
        runNoSave(`
          INSERT INTO content_versions (content_id, version, data, change_summary, created_at)
          VALUES (?, ?, ?, ?, ?)
        `, [content.id, newVersion, content.draft_data, summary, now])
        
        // 发布
        runNoSave(`
          UPDATE contents SET 
            published_data = ?,
            status = 'published',
            version = ?,
            published_at = ?,
            updated_at = ?
          WHERE id = ?
        `, [content.draft_data, newVersion, now, now, content.id])
        
        publishedCount++
      }
      
      return publishedCount
    })
  },
  
  // 回滚
  rollback(contentType: string, contentKey: string, version: number) {
    const content = db.queryOne(`
      SELECT id FROM contents WHERE content_type = ? AND content_key = ?
    `, [contentType, contentKey])
    
    if (!content) throw new Error('Content not found')
    
    const versionData = db.queryOne(`
      SELECT data FROM content_versions WHERE content_id = ? AND version = ?
    `, [content.id, version])
    
    if (!versionData) throw new Error('Version not found')
    
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    
    db.run(`
      UPDATE contents SET draft_data = ?, updated_at = ?
      WHERE id = ?
    `, [versionData.data, now, content.id])
  },

  // ========================================
  // 辅助方法
  // ========================================
  
  // 为分类数据添加 imageUrl 和 imageName
  enrichCategoryData(categories: any[]): any[] {
    // 获取所有图片
    const imageRows = db.queryAll('SELECT id, filename FROM category_images')
    const imageMap = new Map<number, string>()
    imageRows.forEach(row => imageMap.set(row.id, row.filename))
    
    return categories.map(cat => {
      let imageUrl = '/images/common/placeholder.png'
      let imageName = ''
      
      if (cat.imageId) {
        imageName = imageMap.get(cat.imageId) || ''
        if (imageName) {
          // 检查图片是否在 uploads 目录
          const uploadPath = path.join(UPLOAD_BASE, 'images/products', imageName)
          if (fs.existsSync(uploadPath)) {
            imageUrl = `/uploads/images/products/${imageName}`
          } else {
            imageUrl = `/images/products/${imageName}`
          }
        }
      }
      
      return {
        ...cat,
        imageName,
        imageUrl
      }
    })
  },

  // 为促销活动数据添加图片 URL
  enrichPromotionData(promotions: any[]): any[] {
    // 获取所有促销图片
    const imageRows = db.queryAll('SELECT id, filename, image_type FROM promotion_images')
    const imageMap = new Map<number, { filename: string; imageType: string }>()
    imageRows.forEach(row => imageMap.set(row.id, { filename: row.filename, imageType: row.image_type }))
    
    return promotions.map(promo => {
      let cover_url = promo.cover_url || ''
      let poster_url = promo.poster_url || ''
      
      // 如果有 coverId，计算 cover_url
      if (promo.coverId) {
        const coverInfo = imageMap.get(promo.coverId)
        if (coverInfo) {
          const uploadPath = path.join(UPLOAD_BASE, 'images/promotions/covers', coverInfo.filename)
          if (fs.existsSync(uploadPath)) {
            cover_url = `/uploads/images/promotions/covers/${coverInfo.filename}`
          } else {
            cover_url = `/images/promotions/covers/${coverInfo.filename}`
          }
        }
      }
      
      // 如果有 posterId，计算 poster_url
      if (promo.posterId) {
        const posterInfo = imageMap.get(promo.posterId)
        if (posterInfo) {
          const uploadPath = path.join(UPLOAD_BASE, 'images/promotions/posters', posterInfo.filename)
          if (fs.existsSync(uploadPath)) {
            poster_url = `/uploads/images/promotions/posters/${posterInfo.filename}`
          } else {
            poster_url = `/images/promotions/posters/${posterInfo.filename}`
          }
        }
      }
      
      return {
        ...promo,
        cover_url,
        poster_url
      }
    })
  }
}
