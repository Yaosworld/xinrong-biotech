/**
 * 分类图片管理 API
 * 
 * 使用路由工厂创建，减少重复代码
 */
import { categoryImageService } from '../services/categoryImageService'
import { createImageRouter } from './factories'

const router = createImageRouter(categoryImageService, {
  imageDir: 'images/products',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  hasImageType: false,
  filenamePrefix: 'category',
  hasAvailable: true
})

export default router
