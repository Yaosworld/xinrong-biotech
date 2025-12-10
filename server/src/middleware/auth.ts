import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'biotech-cms-secret-key-2025'

// 扩展 Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number
        username: string
        role: 'super_admin' | 'admin'
      }
    }
  }
}

// 验证 Token
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'NO_TOKEN', message: '未提供认证令牌' }
    })
  }
  
  const token = authHeader.substring(7)
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    }
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: '认证令牌无效或已过期' }
    })
  }
}

// 验证超级管理员权限
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: '需要超级管理员权限' }
    })
  }
  next()
}

export { JWT_SECRET }
