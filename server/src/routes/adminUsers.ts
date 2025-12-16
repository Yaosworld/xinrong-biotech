import { Router } from 'express'
import { authenticate, requireSuperAdmin } from '../middleware/auth'
import { adminUserService } from '../services/adminUserService'

const router = Router()

// 所有路由都需要超级管理员权限
router.use(authenticate, requireSuperAdmin)

// 获取管理员列表
router.get('/', (req, res) => {
  const { page, pageSize, status } = req.query
  const result = adminUserService.getList({
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
    status: status as string | undefined
  })
  res.json({ success: true, ...result })
})

// 获取单个管理员
router.get('/:id', (req, res) => {
  const id = Number(req.params.id)
  const user = adminUserService.getById(id)
  if (!user) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '用户不存在' } })
  }
  res.json({ success: true, data: user })
})

// 创建管理员
router.post('/', async (req, res) => {
  const { username, password, role, displayName, email, phone } = req.body
  
  if (!username || !password || !role) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: '请填写必填字段' } })
  }
  
  if (!/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(username)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_USERNAME', message: '用户名需要3-20位，以字母开头' } })
  }
  
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ success: false, error: { code: 'WEAK_PASSWORD', message: '密码需要8位以上，包含字母和数字' } })
  }
  
  if (!['super_admin', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_ROLE', message: '无效的角色' } })
  }
  
  const result = await adminUserService.create({ username, password, role, displayName, email, phone }, req.user!.userId)
  
  if (result.success) {
    res.json({ success: true, data: result.data, message: '管理员创建成功' })
  } else {
    res.status(400).json({ success: false, error: { code: 'CREATE_FAILED', message: result.error } })
  }
})


// 更新管理员信息
router.put('/:id', (req, res) => {
  const id = Number(req.params.id)
  const { displayName, email, phone, role, avatarId } = req.body
  
  const result = adminUserService.update(id, { displayName, email, phone, role, avatarId }, req.user!.userId)
  
  if (result.success) {
    res.json({ success: true, message: '更新成功' })
  } else {
    res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: result.error } })
  }
})

// 修改状态
router.put('/:id/status', (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body
  
  if (!['active', 'disabled'].includes(status)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: '无效的状态' } })
  }
  
  const result = adminUserService.updateStatus(id, status, req.user!.userId)
  
  if (result.success) {
    res.json({ success: true, message: status === 'disabled' ? '账号已禁用' : '账号已启用' })
  } else {
    res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: result.error } })
  }
})

// 重置密码
router.put('/:id/password', async (req, res) => {
  const id = Number(req.params.id)
  const { newPassword } = req.body
  
  if (!newPassword) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_PASSWORD', message: '请输入新密码' } })
  }
  
  if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return res.status(400).json({ success: false, error: { code: 'WEAK_PASSWORD', message: '密码需要8位以上，包含字母和数字' } })
  }
  
  const result = await adminUserService.resetPassword(id, newPassword, req.user!.userId)
  
  if (result.success) {
    res.json({ success: true, message: '密码已重置' })
  } else {
    res.status(400).json({ success: false, error: { code: 'RESET_FAILED', message: result.error } })
  }
})

// 删除管理员
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id)
  const result = adminUserService.delete(id, req.user!.userId)
  
  if (result.success) {
    res.json({ success: true, message: '管理员已删除' })
  } else {
    res.status(400).json({ success: false, error: { code: 'DELETE_FAILED', message: result.error } })
  }
})

export default router
