/**
 * 首页图片管理 API
 * 
 * 使用路由工厂创建，减少重复代码
 */
import { homeImageService } from '../services/homeImageService'
import { createImageRouter } from './factories'

const router = createImageRouter(homeImageService, {
  imageDir: 'images/home',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  hasImageType: false,
  filenamePrefix: 'home',
  hasAvailable: false
})

export default router
