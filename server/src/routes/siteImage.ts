/**
 * 网站图片路由
 * 
 * 管理网站设置相关的图片（Logo、二维码等）
 */
import { createImageRouter } from './factories'
import { siteImageService } from '../services/siteImageService'

const router = createImageRouter(siteImageService, {
  imageDir: 'images/site',
  maxFileSize: 2 * 1024 * 1024, // 2MB
  filenamePrefix: 'site',
  hasImageType: false
})

export default router
