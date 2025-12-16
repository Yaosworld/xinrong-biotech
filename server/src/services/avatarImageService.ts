/**
 * 头像图片服务
 * 
 * 继承 BaseImageService，实现管理员头像的特定逻辑
 * 
 * 特点：
 * 1. shared 使用模式（多个管理员可以使用同一头像）
 * 2. 允许删除被使用的图片
 * 3. 通过 usageCount 标识使用次数
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

/** 头像图片接口 */
export interface AvatarImage extends BaseImage {
  usageCount: number
}

/**
 * 头像图片服务类
 */
class AvatarImageServiceImpl extends BaseImageService<AvatarImage> {
  constructor() {
    super({
      tableName: 'avatar_images',
      imageDir: 'images/avatars',
      contentType: 'avatar',
      usageMode: 'shared',
      allowDeleteWhenUsed: true,
      hasImageType: false
    })
  }
  
  /**
   * 初始化表结构（重写以添加特定字段）
   */
  initTable(): void {
    db.run(`
      CREATE TABLE IF NOT EXISTS avatar_images (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        filename      TEXT NOT NULL UNIQUE,
        original_name TEXT,
        path          TEXT NOT NULL,
        is_uploaded   INTEGER DEFAULT 0,
        created_at    TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `)
    db.run(`CREATE INDEX IF NOT EXISTS idx_avatar_images_filename ON avatar_images(filename)`)
  }

  /**
   * 删除图片（重写父类方法）
   * 删除时同时清理管理员中的引用
   */
  delete(id: number): { success: boolean; error?: string } {
    // 先调用父类删除图片文件和数据库记录
    const result = super.delete(id)
    
    if (result.success) {
      // 清理管理员中对该图片的引用
      this.cleanupImageReferences(id)
    }
    
    return result
  }
  
  /**
   * 清理管理员中对指定图片的引用
   */
  private cleanupImageReferences(imageId: number): void {
    try {
      db.run(`UPDATE admins SET avatar_id = NULL WHERE avatar_id = ?`, [imageId])
      console.log(`[AvatarImageService] 已清理头像 ${imageId} 在管理员中的引用`)
    } catch (error) {
      console.error('[AvatarImageService] 清理头像引用失败:', error)
    }
  }
  
  getUsageMap(): Map<number, number> {
    const adminRows = db.queryAll(`SELECT avatar_id FROM admins WHERE avatar_id IS NOT NULL`)
    
    const usageMap = new Map<number, number>()
    
    adminRows.forEach(row => {
      if (row.avatar_id) {
        usageMap.set(row.avatar_id, (usageMap.get(row.avatar_id) || 0) + 1)
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
const avatarImageServiceInstance = new AvatarImageServiceImpl()

// 导出服务对象（保持向后兼容的 API）
export const avatarImageService = {
  initTable: () => avatarImageServiceInstance.initTable(),
  getAll: () => avatarImageServiceInstance.getAll(),
  getById: (id: number) => avatarImageServiceInstance.getById(id),
  add: (filename: string, originalName: string) => 
    avatarImageServiceInstance.add(filename, originalName),
  addPreset: (filename: string) => 
    avatarImageServiceInstance.addPreset(filename),
  delete: (id: number) => avatarImageServiceInstance.delete(id),
  syncFromFileSystem: () => avatarImageServiceInstance.syncFromFileSystem(),
  getUsageStats: () => avatarImageServiceInstance.getUsageMap(),
  getImageUrl: (imageId: number | null) => avatarImageServiceInstance.getImageUrl(imageId),
  isAllowedType: (mimetype: string) => avatarImageServiceInstance.isAllowedType(mimetype),
  isAllowedExtension: (filename: string) => avatarImageServiceInstance.isAllowedExtension(filename)
}
