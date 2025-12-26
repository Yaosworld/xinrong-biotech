/**
 * 头像图片管理路由
 * 
 * 使用路由工厂创建，支持 WebP 转换和中文文件名
 */
import { createImageRouter } from './factories'
import { avatarImageService } from '../services/avatarImageService'

const router = createImageRouter(avatarImageService, {
  imageDir: 'images/avatars',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  filenamePrefix: 'avatar',
  hasImageType: false
})

export default router
