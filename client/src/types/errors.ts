/**
 * 自定义错误类型定义
 * 用于替代特殊错误字符串，提供更好的错误处理机制
 */

/**
 * 待处理分类错误
 * 当Excel导入检测到未定义分类时抛出
 */
export class PendingCategoryError extends Error {
  public readonly categories: string[]
  public readonly code = 'PENDING_CATEGORY_DEFINITION'

  constructor(categories: string[]) {
    super(`检测到 ${categories.length} 个未定义分类`)
    this.name = 'PendingCategoryError'
    this.categories = categories
  }
}

/**
 * 验证错误
 * 数据验证失败时抛出
 */
export class ValidationError extends Error {
  public readonly errors: string[]
  public readonly warnings: string[]
  public readonly code = 'VALIDATION_ERROR'

  constructor(errors: string[], warnings: string[] = []) {
    super(errors.length > 0 ? errors[0] : '数据验证失败')
    this.name = 'ValidationError'
    this.errors = errors
    this.warnings = warnings
  }
}

/**
 * API错误
 * API调用失败时抛出
 */
export class ApiError extends Error {
  public readonly statusCode: number
  public readonly code: string

  constructor(message: string, statusCode: number = 500, code: string = 'API_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
  }
}

/**
 * 业务错误
 * 业务逻辑错误时抛出
 */
export class BusinessError extends Error {
  public readonly code: string
  public readonly detail?: Record<string, any>

  constructor(message: string, code: string = 'BUSINESS_ERROR', detail?: Record<string, any>) {
    super(message)
    this.name = 'BusinessError'
    this.code = code
    this.detail = detail
  }
}

/**
 * 用户友好的错误消息映射
 */
export const ERROR_MESSAGES: Record<string, string> = {
  'UNIQUE constraint failed': '数据已存在，请检查是否重复',
  'Network Error': '网络连接失败，请检查网络后重试',
  'Failed to fetch': '网络请求失败，请检查网络连接',
  'Unauthorized': '登录已过期，请重新登录',
  'Forbidden': '没有权限执行此操作',
  'Not Found': '请求的资源不存在',
  'Internal Server Error': '服务器内部错误，请稍后重试',
  'PENDING_CATEGORY_DEFINITION': '检测到未定义的分类，请先创建分类',
  'VALIDATION_ERROR': '数据验证失败，请检查输入',
}

/**
 * 获取用户友好的错误消息
 */
export function getFriendlyErrorMessage(error: Error | string): string {
  const message = typeof error === 'string' ? error : error.message
  
  // 检查是否有匹配的友好消息
  for (const [key, friendlyMessage] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(key)) {
      return friendlyMessage
    }
  }
  
  // 如果是自定义错误类型，返回其消息
  if (error instanceof PendingCategoryError) {
    return `检测到 ${error.categories.length} 个未定义分类: ${error.categories.join(', ')}`
  }
  
  if (error instanceof ValidationError) {
    return error.errors.length > 0 ? error.errors[0] : '数据验证失败'
  }
  
  if (error instanceof BusinessError) {
    return error.message
  }
  
  // 默认返回原始消息
  return message
}

/**
 * 判断是否是待处理分类错误
 */
export function isPendingCategoryError(error: unknown): error is PendingCategoryError {
  return error instanceof PendingCategoryError
}
