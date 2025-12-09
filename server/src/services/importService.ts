import db from '../db'
import * as XLSX from 'xlsx'

export type ImportMode = 'replace' | 'merge' | 'append'

export interface ImportPreview {
  toAdd: any[]
  toUpdate: any[]
  toDelete: any[]
  unchanged: any[]
  errors: string[]
  warnings: string[]
}

export const importService = {
  // 解析 Excel 文件
  parseExcel(buffer: Buffer): any[] {
    const workbook = XLSX.read(buffer)
    const sheetName = workbook.SheetNames[0]
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
  },
  
  // 验证产品数据
  validateProducts(data: any[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []
    const requiredFields = ['name', 'categoryId', 'specs', 'desc']
    
    data.forEach((row, index) => {
      const rowNum = index + 2  // Excel 行号（从2开始，1是表头）
      
      // 必填字段检查
      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push(`第${rowNum}行: 缺少必填字段 "${field}"`)
        }
      })
      
      // ID 格式检查
      if (row.id && !/^P\d+$/.test(row.id)) {
        warnings.push(`第${rowNum}行: 产品ID格式建议为 "P" + 数字`)
      }
    })
    
    return { errors, warnings }
  },
  
  // 验证品牌数据
  validateBrands(data: any[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []
    const requiredFields = ['name', 'type']
    
    data.forEach((row, index) => {
      const rowNum = index + 2
      
      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push(`第${rowNum}行: 缺少必填字段 "${field}"`)
        }
      })
      
      if (row.type && !['self', 'agent'].includes(row.type)) {
        errors.push(`第${rowNum}行: type 必须是 "self" 或 "agent"`)
      }
    })
    
    return { errors, warnings }
  },
  
  // 验证活动数据
  validatePromotions(data: any[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []
    const requiredFields = ['title', 'startDate', 'endDate']
    
    data.forEach((row, index) => {
      const rowNum = index + 2
      
      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push(`第${rowNum}行: 缺少必填字段 "${field}"`)
        }
      })
      
      // 日期格式检查
      if (row.startDate && isNaN(Date.parse(row.startDate))) {
        errors.push(`第${rowNum}行: startDate 日期格式无效`)
      }
      if (row.endDate && isNaN(Date.parse(row.endDate))) {
        errors.push(`第${rowNum}行: endDate 日期格式无效`)
      }
    })
    
    return { errors, warnings }
  },
  
  // 预览导入
  previewImport(
    contentType: string,
    newData: any[],
    mode: ImportMode,
    idField: string = 'id'
  ): ImportPreview {
    // 获取现有数据
    const existingRows = db.queryAll(`
      SELECT content_key, draft_data FROM contents 
      WHERE content_type = ? AND status != 'deleted'
    `, [contentType])
    
    const existingMap = new Map(
      existingRows.map(row => [row.content_key, JSON.parse(row.draft_data || '{}')])
    )
    
    const newMap = new Map(newData.map(item => [item[idField], item]))
    
    const preview: ImportPreview = {
      toAdd: [],
      toUpdate: [],
      toDelete: [],
      unchanged: [],
      errors: [],
      warnings: []
    }
    
    // 验证数据
    let validation = { errors: [] as string[], warnings: [] as string[] }
    if (contentType === 'product') {
      validation = this.validateProducts(newData)
    } else if (contentType === 'brand') {
      validation = this.validateBrands(newData)
    } else if (contentType === 'promotion') {
      validation = this.validatePromotions(newData)
    }
    preview.errors = validation.errors
    preview.warnings = validation.warnings
    
    // 分析新数据
    for (const item of newData) {
      const id = item[idField]
      if (existingMap.has(id)) {
        if (mode === 'append') {
          preview.unchanged.push(item)
          preview.warnings.push(`ID "${id}" 已存在，将跳过`)
        } else {
          const existing = existingMap.get(id)
          if (JSON.stringify(existing) !== JSON.stringify(item)) {
            preview.toUpdate.push(item)
          } else {
            preview.unchanged.push(item)
          }
        }
      } else {
        preview.toAdd.push(item)
      }
    }
    
    // 覆盖模式：标记要删除的
    if (mode === 'replace') {
      for (const [key] of existingMap) {
        if (!newMap.has(key)) {
          preview.toDelete.push({ [idField]: key })
        }
      }
    }
    
    return preview
  },
  
  // 执行导入
  executeImport(
    contentType: string,
    data: any[],
    mode: ImportMode,
    autoPublish: boolean = false,
    idField: string = 'id',
    fileName?: string
  ) {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    let addedCount = 0
    let updatedCount = 0
    let deletedCount = 0
    
    db.transaction(() => {
      // 覆盖模式：先删除不在新数据中的
      if (mode === 'replace') {
        const newIds = data.map(item => item[idField])
        const existingRows = db.queryAll(`
          SELECT content_key FROM contents 
          WHERE content_type = ? AND status != 'deleted'
        `, [contentType])
        
        for (const row of existingRows) {
          if (!newIds.includes(row.content_key)) {
            db.run(`
              UPDATE contents SET status = 'deleted', updated_at = ?
              WHERE content_type = ? AND content_key = ?
            `, [now, contentType, row.content_key])
            deletedCount++
          }
        }
      }
      
      // 插入/更新数据
      for (const item of data) {
        const key = item[idField]
        const jsonData = JSON.stringify(item)
        
        const existing = db.queryOne(`
          SELECT id FROM contents WHERE content_type = ? AND content_key = ?
        `, [contentType, key])
        
        if (existing) {
          if (mode !== 'append') {
            db.run(`
              UPDATE contents SET draft_data = ?, updated_at = ?
              WHERE content_type = ? AND content_key = ?
            `, [jsonData, now, contentType, key])
            updatedCount++
          }
        } else {
          // 计算排序值
          const maxOrder = db.queryOne(`
            SELECT MAX(sort_order) as max FROM contents WHERE content_type = ?
          `, [contentType])
          const sortOrder = (maxOrder?.max || 0) + 1
          
          db.run(`
            INSERT INTO contents (content_type, content_key, draft_data, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [contentType, key, jsonData, sortOrder, now, now])
          addedCount++
        }
      }
      
      // 自动发布
      if (autoPublish) {
        const keys = data.map(item => item[idField])
        for (const key of keys) {
          const content = db.queryOne(`
            SELECT * FROM contents WHERE content_type = ? AND content_key = ?
          `, [contentType, key])
          
          if (content && content.draft_data) {
            db.run(`
              INSERT INTO content_versions (content_id, version, data, created_at)
              VALUES (?, ?, ?, ?)
            `, [content.id, content.version, content.draft_data, now])
            
            db.run(`
              UPDATE contents SET 
                published_data = ?,
                status = 'published',
                version = ?,
                published_at = ?,
                updated_at = ?
              WHERE id = ?
            `, [content.draft_data, content.version + 1, now, now, content.id])
          }
        }
      }
      
      // 记录导入日志
      db.run(`
        INSERT INTO import_logs (content_type, import_mode, file_name, total_count, added_count, updated_count, deleted_count, error_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [contentType, mode, fileName || '', data.length, addedCount, updatedCount, deletedCount, 0, now])
    })
    
    // 获取日志ID
    const importLogId = db.lastInsertRowId()
    
    return {
      success: true,
      addedCount,
      updatedCount,
      deletedCount,
      importLogId
    }
  },
  
  // 获取导入历史
  getImportLogs(contentType: string, limit: number = 20) {
    return db.queryAll(`
      SELECT * FROM import_logs 
      WHERE content_type = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [contentType, limit])
  }
}
