import express from 'express'
import cors from 'cors'
import path from 'path'
import { initDb } from './db'
import contentRouter from './routes/content'
import adminRouter from './routes/admin'
import authRouter from './routes/auth'
import adminUsersRouter from './routes/adminUsers'
import uploadRouter from './routes/upload'
import categoryImageRouter from './routes/categoryImage'
import promotionImageRouter from './routes/promotionImage'
import homeImageRouter from './routes/homeImage'
import brandImageRouter from './routes/brandImage'
import avatarImageRouter from './routes/avatarImage'
import siteImageRouter from './routes/siteImage'
import { authenticate } from './middleware/auth'
import { categoryService } from './services/categoryService'
import { categoryImageService } from './services/categoryImageService'
import { promotionImageService } from './services/promotionImageService'
import { homeImageService } from './services/homeImageService'
import { brandImageService } from './services/brandImageService'
import { avatarImageService } from './services/avatarImageService'
import { siteImageService } from './services/siteImageService'
import { contentBootstrapService } from './services/contentBootstrapService'
import { catalogStructuredStorageService } from './services/catalogStructuredStorageService'

const app = express()
const PORT = process.env.PORT || 3000
const autoSyncImages = !['false', '0', 'off'].includes(
  (process.env.CMS_AUTO_SYNC_IMAGES || 'true').toLowerCase()
)

// 中间件
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// 静态文件服务（上传的图片）
const uploadsPath = process.env.UPLOAD_PATH || path.join(__dirname, '../uploads')
app.use('/uploads', express.static(uploadsPath))

// 公开路由（无需认证）
app.use('/api/auth', authRouter)
app.use('/api/content', contentRouter)

// 受保护路由（需要认证）
app.use('/api/admin/users', adminUsersRouter)
app.use('/api/admin/upload', authenticate, uploadRouter)
app.use('/api/admin/category-images', authenticate, categoryImageRouter)
app.use('/api/admin/promotion-images', authenticate, promotionImageRouter)
app.use('/api/admin/home-images', authenticate, homeImageRouter)
app.use('/api/admin/brand-images', authenticate, brandImageRouter)
app.use('/api/admin/avatar-images', authenticate, avatarImageRouter)
app.use('/api/admin/site-images', authenticate, siteImageRouter)
app.use('/api/admin', authenticate, adminRouter)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// 初始化数据库并启动服务器
async function start() {
  try {
    await initDb()
    
    // 初始化默认分类数据
    categoryService.initDefaultCategories()
    
    // 初始化 CMS 发布内容（将旧静态 JSON 迁移为数据库发布数据）
    contentBootstrapService.initializePublishedContent()

    // 同步 Catalog 结构化镜像表
    catalogStructuredStorageService.syncAll()

    const runImageSync = (
      initTable: () => void,
      sync: () => { added: number },
      logMessage: string
    ) => {
      initTable()
      if (!autoSyncImages) {
        return
      }

      const syncResult = sync()
      if (syncResult.added > 0) {
        console.log(logMessage.replace('{count}', String(syncResult.added)))
      }
    }

    runImageSync(
      () => categoryImageService.initTable(),
      () => categoryImageService.syncFromFileSystem(),
      '📷 同步了 {count} 张分类图片到数据库'
    )
    runImageSync(
      () => promotionImageService.initTable(),
      () => promotionImageService.syncFromFileSystem(),
      '🎉 同步了 {count} 张促销图片到数据库'
    )
    runImageSync(
      () => homeImageService.initTable(),
      () => homeImageService.syncFromFileSystem(),
      '🏠 同步了 {count} 张首页图片到数据库'
    )
    runImageSync(
      () => brandImageService.initTable(),
      () => brandImageService.syncFromFileSystem(),
      '🏷️ 同步了 {count} 张品牌图片到数据库'
    )
    runImageSync(
      () => avatarImageService.initTable(),
      () => avatarImageService.syncFromFileSystem(),
      '👤 同步了 {count} 张头像图片到数据库'
    )
    runImageSync(
      () => siteImageService.initTable(),
      () => siteImageService.syncFromFileSystem(),
      '🌐 同步了 {count} 张网站图片到数据库'
    )

    if (!autoSyncImages) {
      console.log('🧊 已关闭启动时图片自动同步（CMS_AUTO_SYNC_IMAGES=false）')
    }
    
    app.listen(PORT, () => {
      console.log(`\n🚀 CMS API Server running on http://localhost:${PORT}`)
      console.log(`\n📋 API Endpoints:`)
      console.log(`   - POST /api/auth/login                   - 登录`)
      console.log(`   - POST /api/auth/logout                  - 退出登录`)
      console.log(`   - GET  /api/auth/me                      - 获取当前用户`)
      console.log(`   - PUT  /api/auth/password                - 修改密码`)
      console.log(`   - GET  /api/admin/users                  - 管理员列表（超管）`)
      console.log(`   - POST /api/admin/users                  - 创建管理员（超管）`)
      console.log(`   - GET  /api/content/:type/published      - 获取已发布列表`)
      console.log(`   - GET  /api/admin/content/:type          - 后台列表（需认证）`)
      console.log(`\n✨ Server is ready!`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()
