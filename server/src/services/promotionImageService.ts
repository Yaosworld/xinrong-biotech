/**
 * 促销活动图片服务
 * 
 * 继承 BaseImageService，实现促销图片的特定逻辑
 * 
 * 特点：
 * 1. shared 使用模式（多对多关系）
 * 2. 允许删除被使用的图片
 * 3. 支持图片类型（cover/poster）
 * 4. 通过 usageCount 标识使用次数
 */
import db from '../db'
import {
  BaseImageService,
  BaseImage,
  UsageInfo,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_EXTENSIONS
} from './base'

// 导出常量（保持向后兼容）
export { ALLOWED_IMAGE_TYPES, ALLOWED_IMAGE_EXTENSIONS }

/** 图片类型 */
export type PromotionImageType = 'cover' | 'poster'

/** 促销图片接口 */
export interface PromotionImage extends BaseImage {
  imageType: PromotionImageType
  usageCount: number
}

/**
 * 促销图片服务类
 */
class PromotionImageServiceImpl extends BaseImageService<PromotionImage> {
  constructor() {
    super({
      tableName: 'promotion_images',
      imageDir: 'images/promotions',
      contentType: 'promotion',
      usageMode: 'shared',
      allowDeleteWhenUsed: true,
      hasImageType: true,
      imageTypes: ['cover', 'poster'],
      imageTypeField: 'image_type'
    })
  }

  
  /**
   * 初始化表（覆盖基类方法，处理表结构迁移）
   */
  initTable(): void {
    const tableExists = db.queryOne(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='promotion_images'"
    )
    
    if (tableExists) {
      const needsMigration = this.checkNeedsMigration()
      
      if (needsMigration) {
        console.log('📦 迁移促销图片表结构...')
        const existingData = db.queryAll('SELECT * FROM promotion_images')
        db.getDb().run('DROP TABLE promotion_images')
        super.initTable()
        
        for (const row of existingData) {
          try {
            db.run(`
              INSERT INTO promotion_images (filename, original_name, path, image_type, created_at)
              VALUES (?, ?, ?, ?, ?)
            `, [row.filename, row.original_name, row.path, row.image_type || 'cover', row.created_at])
          } catch {
            // 忽略重复数据
          }
        }
        db.saveDb()
        console.log('✅ 促销图片表迁移完成')
      }
    } else {
      super.initTable()
    }
  }
  
  private checkNeedsMigration(): boolean {
    try {
      const tableInfo = db.queryOne(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='promotion_images'"
      )
      if (tableInfo && tableInfo.sql) {
        const sql = tableInfo.sql as string
        return sql.includes('filename TEXT NOT NULL UNIQUE') || 
               !sql.includes('UNIQUE(filename, image_type)')
      }
    } catch {
      // 忽略错误
    }
    return false
  }
  
  /**
   * 删除图片（重写父类方法）
   * 删除时同时清理促销活动中的引用
   */
  delete(id: number): { success: boolean; error?: string } {
    // 先调用父类删除图片文件和数据库记录
    const result = super.delete(id)
    
    if (result.success) {
      // 清理促销活动中对该图片的引用
      this.cleanupImageReferences(id)
    }
    
    return result
  }
  
  /**
   * 清理促销活动中对指定图片的引用
   */
  private cleanupImageReferences(imageId: number): void {
    try {
      const promotionRows = db.queryAll(`
        SELECT id, draft_data, published_data FROM contents 
        WHERE content_type = 'promotion' AND status != 'deleted'
      `)
      
      let updatedCount = 0
      
      for (const row of promotionRows) {
        let needsUpdate = false
        
        // 清理草稿数据
        if (row.draft_data) {
          const draftPromo = JSON.parse(row.draft_data)
          if (draftPromo.coverId === imageId) {
            draftPromo.coverId = null
            draftPromo.cover_url = ''
            needsUpdate = true
          }
          if (draftPromo.posterId === imageId) {
            draftPromo.posterId = null
            draftPromo.poster_url = ''
            needsUpdate = true
          }
          if (needsUpdate) {
            db.run(`UPDATE contents SET draft_data = ? WHERE id = ?`, [JSON.stringify(draftPromo), row.id])
          }
        }
        
        // 清理已发布数据
        if (row.published_data) {
          const publishedPromo = JSON.parse(row.published_data)
          let publishedNeedsUpdate = false
          if (publishedPromo.coverId === imageId) {
            publishedPromo.coverId = null
            publishedPromo.cover_url = ''
            publishedNeedsUpdate = true
          }
          if (publishedPromo.posterId === imageId) {
            publishedPromo.posterId = null
            publishedPromo.poster_url = ''
            publishedNeedsUpdate = true
          }
          if (publishedNeedsUpdate) {
            db.run(`UPDATE contents SET published_data = ? WHERE id = ?`, [JSON.stringify(publishedPromo), row.id])
            needsUpdate = true
          }
        }
        
        if (needsUpdate) updatedCount++
      }
      
      if (updatedCount > 0) {
        console.log(`[PromotionImageService] 已清理图片 ${imageId} 在 ${updatedCount} 个促销活动中的引用`)
      }
    } catch (error) {
      console.error('[PromotionImageService] 清理图片引用失败:', error)
    }
  }
  
  getUsageMap(): Map<number, number> {
    const promotionRows = db.queryAll(`
      SELECT draft_data, published_data FROM contents 
      WHERE content_type = 'promotion' AND status != 'deleted'
    `)
    
    const usageMap = new Map<number, number>()
    
    promotionRows.forEach(row => {
      const data = row.draft_data || row.published_data
      if (data) {
        try {
          const promo = JSON.parse(data)
          if (promo.coverId) {
            usageMap.set(promo.coverId, (usageMap.get(promo.coverId) || 0) + 1)
          }
          if (promo.posterId) {
            usageMap.set(promo.posterId, (usageMap.get(promo.posterId) || 0) + 1)
          }
        } catch {
          // 忽略解析错误
        }
      }
    })
    
    return usageMap
  }
  
  getUsageInfo(imageId: number): UsageInfo {
    const usageMap = this.getUsageMap()
    const usageCount = usageMap.get(imageId) || 0
    return {
      isUsed: usageCount > 0,
      usageCount
    }
  }
  
  getImageUrl(imageId: number | null): string {
    if (!imageId) return ''
    const image = this.getById(imageId)
    return image?.url || ''
  }
}

// 创建单例实例
const promotionImageServiceInstance = new PromotionImageServiceImpl()

// 导出服务对象（保持向后兼容的 API）
export const promotionImageService = {
  initTable: () => promotionImageServiceInstance.initTable(),
  getAll: (imageType?: PromotionImageType) => promotionImageServiceInstance.getAll(imageType),
  getById: (id: number) => promotionImageServiceInstance.getById(id),
  add: (filename: string, originalName: string, imageType: PromotionImageType) => 
    promotionImageServiceInstance.add(filename, originalName, imageType),
  addPreset: (filename: string, imageType: PromotionImageType) => 
    promotionImageServiceInstance.addPreset(filename, imageType),
  delete: (id: number) => promotionImageServiceInstance.delete(id),
  syncFromFileSystem: () => promotionImageServiceInstance.syncFromFileSystem(),
  getUsageStats: () => promotionImageServiceInstance.getUsageMap(),
  getImageUrl: (imageId: number | null) => promotionImageServiceInstance.getImageUrl(imageId),
  isAllowedType: (mimetype: string) => promotionImageServiceInstance.isAllowedType(mimetype),
  isAllowedExtension: (filename: string) => promotionImageServiceInstance.isAllowedExtension(filename)
}
