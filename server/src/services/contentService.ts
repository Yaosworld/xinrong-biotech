import db from '../db'

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
        INSERT INTO contents (content_type, content_key, draft_data, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [contentType, contentKey, draftData, sortOrder, now, now])
    }
  },
  
  // 批量保存草稿
  batchSaveDraft(contentType: string, items: { key: string; data: any }[]) {
    db.transaction(() => {
      for (const item of items) {
        this.saveDraft(contentType, item.key, item.data)
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
  
  // 批量发布（支持变更说明）
  batchPublish(contentType: string, contentKeys: string[], changeSummary?: string) {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    let publishedCount = 0
    // 自动生成变更说明（如果未提供）
    const summary = changeSummary || `批量发布 ${contentKeys.length} 条 ${contentType} 数据`
    
    db.transaction(() => {
      for (const key of contentKeys) {
        const content = db.queryOne(`
          SELECT * FROM contents WHERE content_type = ? AND content_key = ?
        `, [contentType, key])
        
        if (content && content.draft_data) {
          const newVersion = content.version + 1
          
          // 创建版本快照（包含变更说明）
          db.run(`
            INSERT INTO content_versions (content_id, version, data, change_summary, created_at)
            VALUES (?, ?, ?, ?, ?)
          `, [content.id, newVersion, content.draft_data, summary, now])
          
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
          
          publishedCount++
        }
      }
    })
    
    return publishedCount
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
  }
}
