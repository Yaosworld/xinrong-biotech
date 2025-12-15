/**
 * 促销活动图片管理 API
 * 
 * 使用路由工厂创建，减少重复代码
 */
import { promotionImageService } from '../services/promotionImageService'
import { createImageRouter } from './factories'

const router = createImageRouter(promotionImageService, {
  imageDir: 'images/promotions',
  maxFileSize: 10 * 1024 * 1024, // 10MB（海报可能较大）
  hasImageType: true,
  imageTypes: ['cover', 'poster'],
  defaultImageType: 'cover',
  filenamePrefix: 'promotion',
  hasAvailable: false
})

export default router
