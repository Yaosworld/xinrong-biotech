import bcrypt from 'bcryptjs'
import { queryOne, queryAll, run, lastInsertRowId } from '../db'
import { authService } from './authService'

export const adminUserService = {
  // 获取管理员列表
  getList(params: { page?: number; pageSize?: number; status?: string }) {
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const offset = (page - 1) * pageSize
    
    let whereClause = '1=1'
    const queryParams: any[] = []
    
    if (params.status) {
      whereClause += ' AND status = ?'
      queryParams.push(params.status)
    }
    
    const countResult = queryOne(
      `SELECT COUNT(*) as total FROM admins WHERE ${whereClause}`,
      queryParams
    )
    const total = countResult?.total || 0
    
    const list = queryAll(
      `SELECT id, username, role, display_name, email, phone, status, 
              last_login_at, created_at
       FROM admins 
       WHERE ${whereClause}
       ORDER BY id ASC
       LIMIT ? OFFSET ?`,
      [...queryParams, pageSize, offset]
    )
    
    return {
      data: list.map(item => ({
        id: item.id,
        username: item.username,
        role: item.role,
        displayName: item.display_name,
        email: item.email,
        phone: item.phone,
        status: item.status,
        lastLoginAt: item.last_login_at,
        createdAt: item.created_at
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    }
  },

  // 获取单个管理员
  getById(id: number) {
    const user = queryOne(
      `SELECT id, username, role, display_name, email, phone, status, 
              last_login_at, last_login_ip, created_at, updated_at
       FROM admins WHERE id = ?`,
      [id]
    )
    if (!user) return null
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.display_name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      lastLoginAt: user.last_login_at,
      lastLoginIp: user.last_login_ip,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }
  },
  
  // 创建管理员
  async create(data: {
    username: string
    password: string
    role: 'super_admin' | 'admin'
    displayName?: string
    email?: string
    phone?: string
  }, createdBy: number) {
    const existing = queryOne('SELECT id FROM admins WHERE username = ?', [data.username])
    if (existing) {
      return { success: false, error: '用户名已存在' }
    }
    
    const passwordHash = await bcrypt.hash(data.password, 10)
    
    run(
      `INSERT INTO admins (username, password_hash, role, display_name, email, phone, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.username, passwordHash, data.role, data.displayName || null, data.email || null, data.phone || null, createdBy]
    )
    
    const id = lastInsertRowId()
    authService.logAction(createdBy, 'admin_create', 'admin', String(id), { username: data.username, role: data.role }, null)
    
    return { success: true, data: { id, username: data.username } }
  },

  // 更新管理员信息
  update(id: number, data: { displayName?: string; email?: string; phone?: string; role?: string }, operatorId: number) {
    const user = queryOne('SELECT id FROM admins WHERE id = ?', [id])
    if (!user) return { success: false, error: '用户不存在' }
    
    const updates: string[] = []
    const params: any[] = []
    
    if (data.displayName !== undefined) { updates.push('display_name = ?'); params.push(data.displayName) }
    if (data.email !== undefined) { updates.push('email = ?'); params.push(data.email) }
    if (data.phone !== undefined) { updates.push('phone = ?'); params.push(data.phone) }
    if (data.role !== undefined) { updates.push('role = ?'); params.push(data.role) }
    
    if (updates.length === 0) return { success: true }
    
    updates.push("updated_at = datetime('now', 'localtime')")
    params.push(id)
    
    run(`UPDATE admins SET ${updates.join(', ')} WHERE id = ?`, params)
    authService.logAction(operatorId, 'admin_update', 'admin', String(id), data, null)
    
    return { success: true }
  },
  
  // 修改状态
  updateStatus(id: number, status: 'active' | 'disabled', operatorId: number) {
    const user = queryOne('SELECT id, username FROM admins WHERE id = ?', [id])
    if (!user) return { success: false, error: '用户不存在' }
    if (id === operatorId) return { success: false, error: '不能禁用自己的账号' }
    
    run(`UPDATE admins SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`, [status, id])
    
    const action = status === 'disabled' ? 'admin_disable' : 'admin_enable'
    authService.logAction(operatorId, action, 'admin', String(id), { username: user.username }, null)
    
    return { success: true }
  },
  
  // 重置密码
  async resetPassword(id: number, newPassword: string, operatorId: number) {
    const user = queryOne('SELECT id, username FROM admins WHERE id = ?', [id])
    if (!user) return { success: false, error: '用户不存在' }
    
    const passwordHash = await bcrypt.hash(newPassword, 10)
    run(`UPDATE admins SET password_hash = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`, [passwordHash, id])
    
    authService.logAction(operatorId, 'password_reset', 'admin', String(id), { username: user.username }, null)
    return { success: true }
  },
  
  // 删除管理员
  delete(id: number, operatorId: number) {
    const user = queryOne('SELECT id, username FROM admins WHERE id = ?', [id])
    if (!user) return { success: false, error: '用户不存在' }
    if (id === operatorId) return { success: false, error: '不能删除自己的账号' }
    
    run('DELETE FROM admins WHERE id = ?', [id])
    authService.logAction(operatorId, 'admin_delete', 'admin', String(id), { username: user.username }, null)
    
    return { success: true }
  }
}
