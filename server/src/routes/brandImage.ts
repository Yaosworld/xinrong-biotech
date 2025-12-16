/**
 * 品牌图片路由
 * 
 * 使用路由工厂创建标准化的图片管理 API
 */
import { createImageRouter } from './factories/imageRouteFactory'
import { brandImageService } from '../services/brandImageService'

// 使用工厂创建标准路由
const router = createImageRouter(brandImageService, {
  imageDir: 'images/brands',
  hasImageType: true,
  imageTypes: ['logo', 'certificate'],
  defaultImageType: 'logo',
  filenamePrefix: 'brand'
})

export default router
