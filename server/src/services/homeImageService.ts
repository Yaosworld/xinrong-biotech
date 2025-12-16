/**
 * 首页图片服务
 * 
 * 继承 BaseImageService，实现首页横幅图片的特定逻辑
 * 
 * 特点：
 * 1. shared 使用模式（多对多关系）
 * 2. 允许删除被使用的图片
 * 3. 通过 usageCount 标识使用次数
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

/** 首页图片接口 */
export interface HomeImage extends BaseImage {
  usageCount: number
}

/**
 * 首页图片服务类
 */
class HomeImageServiceImpl extends BaseImageService<HomeImage> {
  constructor() {
    super({
      tableName: 'home_images',
      imageDir: 'images/home',
      contentType: 'home_config',
      usageMode: 'shared',
      allowDeleteWhenUsed: true,
      hasImageType: false
    })
  }
  
  /**
   * 删除图片（重写父类方法）
   * 删除时同时清理首页配置中的引用
   */
  delete(id: number): { success: boolean; error?: string } {
    // 先调用父类删除图片文件和数据库记录
    const result = super.delete(id)
    
    if (result.success) {
      // 清理首页配置中对该图片的引用
      this.cleanupImageReferences(id)
    }
    
    return result
  }
  
  /**
   * 清理首页配置中对指定图片的引用
   */
  private cleanupImageReferences(imageId: number): void {
    try {
      const configRow = db.queryOne(`
        SELECT draft_data, published_data FROM contents 
        WHERE content_type = 'home_config' AND content_key = 'main'
      `)
      
      if (!configRow) return
      
      let updated = false
      
      // 清理草稿数据
      if (configRow.draft_data) {
        const draftConfig = JSON.parse(configRow.draft_data)
        if (draftConfig.images && Array.isArray(draftConfig.images)) {
          const originalLength = draftConfig.images.length
          draftConfig.images = draftConfig.images.filter(
            (img: { imageId?: number }) => img.imageId !== imageId
          )
          if (draftConfig.images.length !== originalLength) {
            db.run(`
              UPDATE contents SET draft_data = ? 
              WHERE content_type = 'home_config' AND content_key = 'main'
            `, [JSON.stringify(draftConfig)])
            updated = true
          }
        }
      }
      
      // 清理已发布数据
      if (configRow.published_data) {
        const publishedConfig = JSON.parse(configRow.published_data)
        if (publishedConfig.images && Array.isArray(publishedConfig.images)) {
          const originalLength = publishedConfig.images.length
          publishedConfig.images = publishedConfig.images.filter(
            (img: { imageId?: number }) => img.imageId !== imageId
          )
          if (publishedConfig.images.length !== originalLength) {
            db.run(`
              UPDATE contents SET published_data = ? 
              WHERE content_type = 'home_config' AND content_key = 'main'
            `, [JSON.stringify(publishedConfig)])
            updated = true
          }
        }
      }
      
      if (updated) {
        console.log(`[HomeImageService] 已清理图片 ${imageId} 在首页配置中的引用`)
      }
    } catch (error) {
      console.error('[HomeImageService] 清理图片引用失败:', error)
    }
  }
  
  /**
   * 获取图片使用次数映射（通过 imageId）
   */
  getUsageMap(): Map<number, number> {
    const map = new Map<number, number>()
    
    // 从首页配置中获取使用的图片
    const configRow = db.queryOne(`
      SELECT draft_data, published_data FROM contents 
      WHERE content_type = 'home_config' AND content_key = 'main'
    `)
    
    if (configRow) {
      const data = configRow.draft_data || configRow.published_data
      if (data) {
        try {
          const config = JSON.parse(data)
          if (config.images && Array.isArray(config.images)) {
            config.images.forEach((img: { imageId?: number }) => {
              if (img.imageId) {
                map.set(img.imageId, (map.get(img.imageId) || 0) + 1)
              }
            })
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
    
    return map
  }
  
  /**
   * 获取图片使用信息
   */
  getUsageInfo(imageId: number): UsageInfo {
    const usageMap = this.getUsageMap()
    const usageCount = usageMap.get(imageId) || 0
    return {
      isUsed: usageCount > 0,
      usageCount
    }
  }
}

// 创建单例实例
const homeImageServiceInstance = new HomeImageServiceImpl()

// 导出服务对象（保持向后兼容的 API）
export const homeImageService = {
  initTable: () => homeImageServiceInstance.initTable(),
  getAll: () => homeImageServiceInstance.getAll(),
  getById: (id: number) => homeImageServiceInstance.getById(id),
  add: (filename: string, originalName: string) => 
    homeImageServiceInstance.add(filename, originalName),
  addPreset: (filename: string) => homeImageServiceInstance.addPreset(filename),
  delete: (id: number) => homeImageServiceInstance.delete(id),
  syncFromFileSystem: () => homeImageServiceInstance.syncFromFileSystem(),
  getUsageMap: () => homeImageServiceInstance.getUsageMap(),
  isAllowedType: (mimetype: string) => homeImageServiceInstance.isAllowedType(mimetype),
  isAllowedExtension: (filename: string) => homeImageServiceInstance.isAllowedExtension(filename)
}
