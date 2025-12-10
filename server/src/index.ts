import express from 'express'
import cors from 'cors'
import { initDb } from './db'
import contentRouter from './routes/content'
import adminRouter from './routes/admin'
import authRouter from './routes/auth'
import adminUsersRouter from './routes/adminUsers'
import { authenticate } from './middleware/auth'

const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// 公开路由（无需认证）
app.use('/api/auth', authRouter)
app.use('/api/content', contentRouter)

// 受保护路由（需要认证）
app.use('/api/admin/users', adminUsersRouter)
app.use('/api/admin', authenticate, adminRouter)

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
