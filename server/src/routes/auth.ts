import { Router } from 'express'
import { authService } from '../services/authService'
import { authenticate } from '../middleware/auth'
import { queryOne } from '../db'

const router = Router()

// 登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: '请输入用户名和密码' }
    })
  }
  
  const ip = req.ip || req.socket.remoteAddress
  const result = await authService.login(username, password, ip)
  
  if (result.success) {
    res.json(result)
  } else {
    const status = result.error?.code === 'ACCOUNT_LOCKED' ? 423 : 401
    res.status(status).json(result)
  }
})

// 退出登录
router.post('/logout', authenticate, (req, res) => {
  if (req.user) {
    authService.logAction(req.user.userId, 'logout', null, null, null, req.ip || null)
  }
  res.json({ success: true, message: '已退出登录' })
})

// 获取当前用户信息
router.get('/me', authenticate, (req, res) => {
  const user = queryOne(
    `SELECT id, username, role, display_name, email, avatar_id, last_login_at FROM admins WHERE id = ?`,
    [req.user!.userId]
  )
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: '用户不存在' }
    })
  }
  
  // 获取头像 URL
  let avatarUrl = null
  if (user.avatar_id) {
    const avatar = queryOne('SELECT filename FROM avatar_images WHERE id = ?', [user.avatar_id])
    if (avatar) {
      avatarUrl = `/uploads/images/avatars/${avatar.filename}`
    }
  }
  
  res.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.display_name || user.username,
      email: user.email,
      avatarUrl,
      lastLoginAt: user.last_login_at
    }
  })
})


// 修改密码
router.put('/password', authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: '请输入当前密码和新密码' }
    })
  }
  
  if (newPassword.length < 8 || newPassword.length > 20) {
    return res.status(400).json({
      success: false,
      error: { code: 'WEAK_PASSWORD', message: '密码长度需要8-20位' }
    })
  }
  
  if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return res.status(400).json({
      success: false,
      error: { code: 'WEAK_PASSWORD', message: '密码需要包含字母和数字' }
    })
  }
  
  const result = await authService.changePassword(req.user!.userId, oldPassword, newPassword)
  
  if (result.success) {
    res.json({ success: true, message: '密码修改成功' })
  } else {
    res.status(400).json({
      success: false,
      error: { code: 'CHANGE_FAILED', message: result.error }
    })
  }
})

export default router
