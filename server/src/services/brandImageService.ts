/**
 * 品牌图片服务
 * 
 * 继承 BaseImageService，实现品牌图片的特定逻辑
 * 
 * 特点：
 * 1. shared 使用模式（多对多关系）
 * 2. 允许删除被使用的图片
 * 3. 支持图片类型（logo/certificate）
 * 4. 通过 usageCount 标识使用次数
 */
import db from '../db'
import path from 'path'
import fs from 'fs'
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
export type BrandImageType = 'logo' | 'certificate'

/** 品牌图片接口 */
export interface BrandImage extends BaseImage {
  imageType: BrandImageType
  usageCount: number
}

// 品牌图片类型到目录名的映射
const TYPE_TO_DIR: Record<BrandImageType, string> = {
  'logo': 'logos',
  'certificate': 'certs'
}

/**
 * 品牌图片服务类
 */
class BrandImageServiceImpl extends BaseImageService<BrandImage> {
  constructor() {
    super({
      tableName: 'brand_images',
      imageDir: 'images/brands',
      contentType: 'brand',
      usageMode: 'shared',
      allowDeleteWhenUsed: true,
      hasImageType: true,
      imageTypes: ['logo', 'certificate'],
      imageTypeField: 'image_type'
    })
  }
  
  /**
   * 重写 URL 构建方法，处理品牌图片的特殊目录结构
   */
  protected buildImageUrl(filename: string, imageType?: string): string {
    const subDir = imageType ? TYPE_TO_DIR[imageType as BrandImageType] : 'logos'
    return `/images/brands/${subDir}/${filename}`
  }
  
  /**
   * 重写同步方法，处理品牌图片的特殊目录结构
   * logos/ 和 certs/ 而不是 logos/ 和 certificates/
   */
  syncFromFileSystem(): { added: number; existing: number; skipped: number } {
    let added = 0
    let existing = 0
    let skipped = 0
    
    const uploadBase = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads')
    const publicBase = path.join(__dirname, '../../../public')
    
    // 扫描每种类型的目录
    for (const imageType of ['logo', 'certificate'] as BrandImageType[]) {
      const subDir = TYPE_TO_DIR[imageType]
      
      // 扫描 uploads 目录
      const uploadDir = path.join(uploadBase, 'images/brands', subDir)
      if (fs.existsSync(uploadDir)) {
        const result = this.syncDirectory(uploadDir, imageType, false)
        added += result.added
        existing += result.existing
        skipped += result.skipped
      }
      
      // 扫描 public 目录
      const publicDir = path.join(publicBase, 'images/brands', subDir)
      if (fs.existsSync(publicDir)) {
        const result = this.syncDirectory(publicDir, imageType, true)
        added += result.added
        existing += result.existing
        skipped += result.skipped
      }
    }
    
    return { added, existing, skipped }
  }
  
  /**
   * 同步单个目录
   */
  private syncDirectory(dir: string, imageType: BrandImageType, isPublic: boolean): { added: number; existing: number; skipped: number } {
    let added = 0
    let existing = 0
    let skipped = 0
    
    const files = fs.readdirSync(dir)
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    
    for (const file of files) {
      const ext = path.extname(file).toLowerCase()
      if (!imageExtensions.includes(ext)) {
        skipped++
        continue
      }
      
      // 检查是否已存在
      const existingImage = db.queryOne(
        `SELECT id FROM brand_images WHERE filename = ? AND image_type = ?`,
        [file, imageType]
      )
      
      if (existingImage) {
        existing++
        continue
      }
      
      // 构建路径
      const subDir = TYPE_TO_DIR[imageType]
      const filePath = `images/brands/${subDir}/${file}`
      
      // 插入记录
      db.run(`
        INSERT INTO brand_images (filename, original_name, path, image_type)
        VALUES (?, ?, ?, ?)
      `, [file, file, filePath, imageType])
      
      added++
    }
    
    return { added, existing, skipped }
  }

  /**
   * 删除图片（重写父类方法）
   * 删除时同时清理品牌中的引用
   */
  delete(id: number): { success: boolean; error?: string } {
    // 先调用父类删除图片文件和数据库记录
    const result = super.delete(id)
    
    if (result.success) {
      // 清理品牌中对该图片的引用
      this.cleanupImageReferences(id)
    }
    
    return result
  }
  
  /**
   * 清理品牌中对指定图片的引用
   */
  private cleanupImageReferences(imageId: number): void {
    try {
      const brandRows = db.queryAll(`
        SELECT id, draft_data, published_data FROM contents 
        WHERE content_type = 'brand' AND status != 'deleted'
      `)
      
      let updatedCount = 0
      
      for (const row of brandRows) {
        let needsUpdate = false
        
        // 清理草稿数据
        if (row.draft_data) {
          const draftBrand = JSON.parse(row.draft_data)
          if (draftBrand.logoId === imageId) {
            draftBrand.logoId = null
            draftBrand.logo_url = ''
            needsUpdate = true
          }
          if (draftBrand.certificateId === imageId) {
            draftBrand.certificateId = null
            draftBrand.certificate_url = ''
            needsUpdate = true
          }
          if (needsUpdate) {
            db.run(`UPDATE contents SET draft_data = ? WHERE id = ?`, [JSON.stringify(draftBrand), row.id])
          }
        }
        
        // 清理已发布数据
        if (row.published_data) {
          const publishedBrand = JSON.parse(row.published_data)
          let publishedNeedsUpdate = false
          if (publishedBrand.logoId === imageId) {
            publishedBrand.logoId = null
            publishedBrand.logo_url = ''
            publishedNeedsUpdate = true
          }
          if (publishedBrand.certificateId === imageId) {
            publishedBrand.certificateId = null
            publishedBrand.certificate_url = ''
            publishedNeedsUpdate = true
          }
          if (publishedNeedsUpdate) {
            db.run(`UPDATE contents SET published_data = ? WHERE id = ?`, [JSON.stringify(publishedBrand), row.id])
            needsUpdate = true
          }
        }
        
        if (needsUpdate) updatedCount++
      }
      
      if (updatedCount > 0) {
        console.log(`[BrandImageService] 已清理图片 ${imageId} 在 ${updatedCount} 个品牌中的引用`)
      }
    } catch (error) {
      console.error('[BrandImageService] 清理图片引用失败:', error)
    }
  }
  
  getUsageMap(): Map<number, number> {
    const brandRows = db.queryAll(`
      SELECT draft_data, published_data FROM contents 
      WHERE content_type = 'brand' AND status != 'deleted'
    `)
    
    const usageMap = new Map<number, number>()
    
    brandRows.forEach(row => {
      const data = row.draft_data || row.published_data
      if (data) {
        try {
          const brand = JSON.parse(data)
          if (brand.logoId) {
            usageMap.set(brand.logoId, (usageMap.get(brand.logoId) || 0) + 1)
          }
          if (brand.certificateId) {
            usageMap.set(brand.certificateId, (usageMap.get(brand.certificateId) || 0) + 1)
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
const brandImageServiceInstance = new BrandImageServiceImpl()

// 导出服务对象（保持向后兼容的 API）
export const brandImageService = {
  initTable: () => brandImageServiceInstance.initTable(),
  getAll: (imageType?: BrandImageType) => brandImageServiceInstance.getAll(imageType),
  getById: (id: number) => brandImageServiceInstance.getById(id),
  add: (filename: string, originalName: string, imageType: BrandImageType) => 
    brandImageServiceInstance.add(filename, originalName, imageType),
  addPreset: (filename: string, imageType: BrandImageType) => 
    brandImageServiceInstance.addPreset(filename, imageType),
  delete: (id: number) => brandImageServiceInstance.delete(id),
  syncFromFileSystem: () => brandImageServiceInstance.syncFromFileSystem(),
  getUsageStats: () => brandImageServiceInstance.getUsageMap(),
  getImageUrl: (imageId: number | null) => brandImageServiceInstance.getImageUrl(imageId),
  isAllowedType: (mimetype: string) => brandImageServiceInstance.isAllowedType(mimetype),
  isAllowedExtension: (filename: string) => brandImageServiceInstance.isAllowedExtension(filename)
}
