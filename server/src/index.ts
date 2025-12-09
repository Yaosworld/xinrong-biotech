import express from 'express'
import cors from 'cors'
import { initDb } from './db'
import contentRouter from './routes/content'
import adminRouter from './routes/admin'

const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// 路由
app.use('/api/content', contentRouter)
app.use('/api/admin', adminRouter)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// 初始化数据库并启动服务器
async function start() {
  try {
    await initDb()
    
    app.listen(PORT, () => {
      console.log(`\n🚀 CMS API Server running on http://localhost:${PORT}`)
      console.log(`\n📋 API Endpoints:`)
      console.log(`   - GET  /api/health                       - 健康检查`)
      console.log(`   - GET  /api/content/:type/published      - 获取已发布列表`)
      console.log(`   - GET  /api/content/:type/:key/published - 获取单条已发布数据`)
      console.log(`   - GET  /api/admin/content/:type          - 后台列表`)
      console.log(`   - PUT  /api/admin/content/:type/:key/draft - 保存草稿`)
      console.log(`   - POST /api/admin/content/:type/:key/publish - 发布`)
      console.log(`   - POST /api/admin/import/:type/preview   - 预览导入`)
      console.log(`   - POST /api/admin/import/:type/execute   - 执行导入`)
      console.log(`\n✨ Server is ready!`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()
