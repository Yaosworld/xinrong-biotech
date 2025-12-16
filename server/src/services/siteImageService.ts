/**
 * 网站图片服务
 * 
 * 管理网站设置相关的图片（Logo、二维码等）
 * 
 * 特点：
 * 1. shared 使用模式
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

export { ALLOWED_IMAGE_TYPES, ALLOWED_IMAGE_EXTENSIONS }

/** 网站图片接口 */
export interface SiteImage extends BaseImage {
  usageCount: number
}

/**
 * 网站图片服务类
 */
class SiteImageServiceImpl extends BaseImageService<SiteImage> {
  constructor() {
    super({
      tableName: 'site_images',
      imageDir: 'images/site',
      contentType: 'site',
      usageMode: 'shared',
      allowDeleteWhenUsed: true,
      hasImageType: false
    })
  }
  
  /**
   * 初始化表结构
   */
  initTable(): void {
    db.run(`
      CREATE TABLE IF NOT EXISTS site_images (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        filename      TEXT NOT NULL UNIQUE,
        original_name TEXT,
        path          TEXT NOT NULL,
        created_at    TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `)
    db.run(`CREATE INDEX IF NOT EXISTS idx_site_images_filename ON site_images(filename)`)
  }
  
  /**
   * 获取使用映射
   * 检查 site_config 内容中引用的图片
   */
  getUsageMap(): Map<number, number> {
    const usageMap = new Map<number, number>()
    
    // 获取网站配置内容
    const config = db.queryOne(
      `SELECT published_data, draft_data FROM contents WHERE content_type = 'site_config' AND content_key = 'main'`
    )
    
    if (!config) return usageMap
    
    // 获取所有图片的 filename -> id 映射
    const allImages = db.queryAll(`SELECT id, filename FROM site_images`)
    const filenameToId = new Map<string, number>()
    allImages.forEach((img: any) => filenameToId.set(img.filename, img.id))
    
    // 检查已发布和草稿数据中的图片引用
    const checkData = (dataStr: string | null) => {
      if (!dataStr) return
      try {
        const data = JSON.parse(dataStr)
        const imagePaths: string[] = []
        
        // 收集所有可能的图片路径
        if (data.company?.logo) imagePaths.push(data.company.logo)
        if (data.contact?.wechatQrcode) imagePaths.push(data.contact.wechatQrcode)
        if (data.contact?.gzhQrcode) imagePaths.push(data.contact.gzhQrcode)
        
        // 匹配图片
        for (const imgPath of imagePaths) {
          const filename = imgPath.split('/').pop()
          if (filename) {
            const imageId = filenameToId.get(filename)
            if (imageId) {
              usageMap.set(imageId, (usageMap.get(imageId) || 0) + 1)
            }
          }
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
    
    checkData(config.published_data)
    checkData(config.draft_data)
    
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
const siteImageServiceInstance = new SiteImageServiceImpl()

// 导出服务对象
export const siteImageService = {
  initTable: () => siteImageServiceInstance.initTable(),
  getAll: () => siteImageServiceInstance.getAll(),
  getById: (id: number) => siteImageServiceInstance.getById(id),
  add: (filename: string, originalName: string) => 
    siteImageServiceInstance.add(filename, originalName),
  addPreset: (filename: string) => 
    siteImageServiceInstance.addPreset(filename),
  delete: (id: number) => siteImageServiceInstance.delete(id),
  syncFromFileSystem: () => siteImageServiceInstance.syncFromFileSystem(),
  getUsageStats: () => siteImageServiceInstance.getUsageMap(),
  getImageUrl: (imageId: number | null) => siteImageServiceInstance.getImageUrl(imageId),
  isAllowedType: (mimetype: string) => siteImageServiceInstance.isAllowedType(mimetype),
  isAllowedExtension: (filename: string) => siteImageServiceInstance.isAllowedExtension(filename)
}
