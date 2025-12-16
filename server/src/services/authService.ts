import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { queryOne, run } from '../db'
import { JWT_SECRET } from '../middleware/auth'

const JWT_EXPIRES_IN = '24h'
const MAX_LOGIN_ATTEMPTS = 5
const LOCK_TIME_MINUTES = 15

export interface LoginResult {
  success: boolean
  data?: {
    token: string
    user: {
      id: number
      username: string
      role: string
      displayName: string
      avatarUrl: string | null
    }
    expiresIn: number
  }
  error?: {
    code: string
    message: string
    lockedUntil?: string
  }
}

export const authService = {
  // 登录
  async login(username: string, password: string, ip?: string | null): Promise<LoginResult> {
    // 查找用户
    const user = queryOne(
      'SELECT * FROM admins WHERE username = ?',
      [username]
    )
    
    if (!user) {
      return {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: '用户名或密码错误' }
      }
    }
    
    // 检查账号状态
    if (user.status === 'disabled') {
      return {
        success: false,
        error: { code: 'ACCOUNT_DISABLED', message: '账号已被禁用' }
      }
    }

    // 检查是否被锁定
    if (user.locked_until) {
      const lockedUntil = new Date(user.locked_until)
      if (lockedUntil > new Date()) {
        return {
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: `账号已锁定，请${LOCK_TIME_MINUTES}分钟后重试`,
            lockedUntil: user.locked_until
          }
        }
      } else {
        run('UPDATE admins SET login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id])
      }
    }
    
    // 验证密码
    const isValid = await bcrypt.compare(password, user.password_hash)
    
    if (!isValid) {
      const attempts = (user.login_attempts || 0) + 1
      
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000)
        run(
          'UPDATE admins SET login_attempts = ?, locked_until = ? WHERE id = ?',
          [attempts, lockUntil.toISOString(), user.id]
        )
        this.logAction(user.id, 'login_failed', null, null, { reason: 'account_locked' }, ip || null)
        
        return {
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: `登录失败次数过多，账号已锁定${LOCK_TIME_MINUTES}分钟`,
            lockedUntil: lockUntil.toISOString()
          }
        }
      }
      
      run('UPDATE admins SET login_attempts = ? WHERE id = ?', [attempts, user.id])
      this.logAction(user.id, 'login_failed', null, null, { attempts }, ip || null)
      
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: `用户名或密码错误，还剩${MAX_LOGIN_ATTEMPTS - attempts}次机会`
        }
      }
    }
    
    // 登录成功
    run(
      `UPDATE admins SET 
        login_attempts = 0, 
        locked_until = NULL, 
        last_login_at = datetime('now', 'localtime'),
        last_login_ip = ?
      WHERE id = ?`,
      [ip || null, user.id]
    )
    
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )
    
    this.logAction(user.id, 'login', null, null, null, ip || null)
    
    // 获取头像 URL
    let avatarUrl = null
    if (user.avatar_id) {
      const avatar = queryOne('SELECT filename FROM avatar_images WHERE id = ?', [user.avatar_id])
      if (avatar) {
        avatarUrl = `/uploads/images/avatars/${avatar.filename}`
      }
    }
    
    return {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          displayName: user.display_name || user.username,
          avatarUrl
        },
        expiresIn: 86400
      }
    }
  },

  // 修改密码
  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = queryOne('SELECT password_hash FROM admins WHERE id = ?', [userId])
    
    if (!user) {
      return { success: false, error: '用户不存在' }
    }
    
    const isValid = await bcrypt.compare(oldPassword, user.password_hash)
    if (!isValid) {
      return { success: false, error: '当前密码错误' }
    }
    
    const hash = await bcrypt.hash(newPassword, 10)
    run(
      `UPDATE admins SET password_hash = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
      [hash, userId]
    )
    
    this.logAction(userId, 'password_change', null, null, null, null)
    
    return { success: true }
  },
  
  // 记录操作日志
  logAction(
    adminId: number,
    action: string,
    targetType: string | null,
    targetId: string | null,
    detail: any,
    ip: string | null,
    userAgent?: string
  ) {
    run(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, action, targetType, targetId, detail ? JSON.stringify(detail) : null, ip, userAgent || null]
    )
  }
}
