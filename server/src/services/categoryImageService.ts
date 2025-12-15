/**
 * 分类图片服务
 * 
 * 继承 BaseImageService，实现分类图片的特定逻辑
 * 
 * 特点：
 * 1. exclusive 使用模式（一对一关系）
 * 2. 不允许删除被使用的图片
 * 3. 通过 usedByCategoryId 标识使用状态
 */
import db from '../db'
import {
  BaseImageService,
  BaseImage,
  UsageInfo,
  PaginatedResult,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_EXTENSIONS
} from './base'

// 导出常量（保持向后兼容）
export { ALLOWED_IMAGE_TYPES, ALLOWED_IMAGE_EXTENSIONS }

/** 分类图片接口 */
export interface CategoryImage extends BaseImage {
  usedByCategoryId: string | null  // 被哪个分类使用（null表示未使用）
}

/** 分页结果（保持向后兼容） */
export interface PaginatedImages extends PaginatedResult<CategoryImage> {}

/**
 * 分类图片服务类
 */
class CategoryImageServiceImpl extends BaseImageService<CategoryImage> {
  constructor() {
    super({
      tableName: 'category_images',
      imageDir: 'images/products',
      contentType: 'category',
      usageMode: 'exclusive',
      allowDeleteWhenUsed: false,
      hasImageType: false
    })
  }
  
  /**
   * 获取图片使用映射（imageId -> categoryId）
   * 仅通过 imageId 关联
   */
  getUsageMap(): Map<number, string> {
    const categoryRows = db.queryAll(`
      SELECT draft_data, published_data FROM contents 
      WHERE content_type = 'category' AND status != 'deleted'
    `)
    
    const map = new Map<number, string>()
    categoryRows.forEach(row => {
      const data = row.draft_data || row.published_data
      if (data) {
        try {
          const cat = JSON.parse(data)
          if (cat.imageId) {
            map.set(cat.imageId, cat.id)
          }
        } catch {
          // 忽略解析错误
        }
      }
    })
    
    return map
  }
  
  /**
   * 获取图片使用信息
   */
  getUsageInfo(imageId: number): UsageInfo {
    const usageMap = this.getUsageMap()
    const usedBy = usageMap.get(imageId)
    return {
      isUsed: !!usedBy,
      usedBy
    }
  }
  
  /**
   * 获取可用图片列表（未被使用的）
   */
  getAvailable(): CategoryImage[] {
    const all = this.getAll()
    return all.filter(img => !img.usedByCategoryId)
  }
}

// 创建单例实例
const categoryImageServiceInstance = new CategoryImageServiceImpl()

// 导出服务对象（保持向后兼容的 API）
export const categoryImageService = {
  initTable: () => categoryImageServiceInstance.initTable(),
  getAll: () => categoryImageServiceInstance.getAll(),
  getPaginated: (page?: number, pageSize?: number) => 
    categoryImageServiceInstance.getPaginated(page, pageSize) as PaginatedImages,
  getById: (id: number) => categoryImageServiceInstance.getById(id),
  getByFilename: (filename: string) => categoryImageServiceInstance.getByFilename(filename),
  add: (filename: string, originalName: string) => 
    categoryImageServiceInstance.add(filename, originalName),
  addPreset: (filename: string) => categoryImageServiceInstance.addPreset(filename),
  delete: (id: number) => categoryImageServiceInstance.delete(id),
  syncFromFileSystem: () => categoryImageServiceInstance.syncFromFileSystem(),
  getAvailable: () => categoryImageServiceInstance.getAvailable(),
  getUsageMap: () => categoryImageServiceInstance.getUsageMap(),
  isAllowedType: (mimetype: string) => categoryImageServiceInstance.isAllowedType(mimetype),
  isAllowedExtension: (filename: string) => categoryImageServiceInstance.isAllowedExtension(filename),
  isFilenameAvailable: (filename: string) => categoryImageServiceInstance.isFilenameAvailable(filename)
}
