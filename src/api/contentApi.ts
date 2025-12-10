/**
 * CMS 内容 API 调用层
 */

// API 基础路径，开发环境使用代理，生产环境使用实际地址
const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// ========================================
// 类型定义
// ========================================

export type ImportMode = 'replace' | 'merge' | 'append'

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface ContentItem<T = any> {
  id: number
  contentType: string
  contentKey: string
  draftData: T | null
  publishedData: T | null
  status: 'draft' | 'published' | 'deleted'
  version: number
  sortOrder: number
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  hasUnpublishedChanges: boolean
}

export interface VersionInfo {
  version: number
  data: any
  changeSummary: string | null
  createdAt: string
}

export interface ImportPreview {
  toAdd: any[]
  toUpdate: any[]
  toDelete: any[]
  unchanged: any[]
  errors: string[]
  warnings: string[]
}

export interface ImportResult {
  success: boolean
  addedCount: number
  updatedCount: number
  deletedCount: number
  importLogId: number
}

// ========================================
// 前台内容 API
// ========================================

export const contentApi = {
  /**
   * 获取已发布列表（支持分页和筛选）
   */
  async getPublishedList<T>(
    contentType: string,
    params?: {
      page?: number
      pageSize?: number
      search?: string
      categoryId?: string
      brand?: string
      sortBy?: string
    }
  ): Promise<PaginatedResponse<T>> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          query.set(key, String(value))
        }
      })
    }
    const res = await fetch(`${API_BASE}/content/${contentType}/published?${query}`)
    if (!res.ok) throw new Error('获取数据失败')
    return res.json()
  },

  /**
   * 获取单条已发布数据
   */
  async getPublishedOne<T>(contentType: string, contentKey: string): Promise<T> {
    const res = await fetch(`${API_BASE}/content/${contentType}/${contentKey}/published`)
    if (!res.ok) throw new Error('获取数据失败')
    return res.json()
  },

  /**
   * 获取所有已发布数据（不分页）
   */
  async getAllPublished<T>(contentType: string): Promise<T[]> {
    const res = await this.getPublishedList<T>(contentType, { pageSize: 9999 })
    return res.data
  },

  /**
   * 获取筛选选项（品牌列表等）
   */
  async getFilterOptions(contentType: string): Promise<{ brands: string[]; categories: string[]; total: number }> {
    const res = await fetch(`${API_BASE}/content/${contentType}/filter-options`)
    if (!res.ok) throw new Error('获取筛选选项失败')
    return res.json()
  }
}

// ========================================
// 后台管理 API
// ========================================

// 获取认证 token（与 authApi 保持一致）
const getAuthToken = () => {
  return localStorage.getItem('admin_token') || ''
}

// 获取带认证的请求头
const getAuthHeaders = (contentType?: string): HeadersInit => {
  const headers: HeadersInit = {
    'Authorization': `Bearer ${getAuthToken()}`
  }
  if (contentType) {
    headers['Content-Type'] = contentType
  }
  return headers
}

export const adminApi = {
  /**
   * 获取后台列表
   */
  async getList<T>(
    contentType: string,
    params?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResponse<ContentItem<T>>> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.set(key, String(value))
      })
    }
    const res = await fetch(`${API_BASE}/admin/content/${contentType}?${query}`, {
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('获取数据失败')
    return res.json()
  },

  /**
   * 获取单条详情
   */
  async getOne<T>(contentType: string, contentKey: string): Promise<ContentItem<T>> {
    const res = await fetch(`${API_BASE}/admin/content/${contentType}/${contentKey}`, {
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('获取数据失败')
    return res.json()
  },

  /**
   * 保存草稿
   */
  async saveDraft<T>(contentType: string, contentKey: string, data: T): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/content/${contentType}/${contentKey}/draft`, {
      method: 'PUT',
      headers: getAuthHeaders('application/json'),
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error('保存草稿失败')
  },

  /**
   * 批量保存草稿
   */
  async batchSaveDraft<T>(
    contentType: string,
    items: { key: string; data: T }[]
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/content/${contentType}/batch-draft`, {
      method: 'PUT',
      headers: getAuthHeaders('application/json'),
      body: JSON.stringify({ items })
    })
    if (!res.ok) throw new Error('批量保存失败')
  },

  /**
   * 发布单条
   * @param changeSummary 变更说明（可选）
   */
  async publish(contentType: string, contentKey: string, changeSummary?: string): Promise<{ version: number }> {
    const res = await fetch(`${API_BASE}/admin/content/${contentType}/${contentKey}/publish`, {
      method: 'POST',
      headers: getAuthHeaders('application/json'),
      body: JSON.stringify({ changeSummary })
    })
    if (!res.ok) throw new Error('发布失败')
    return res.json()
  },

  /**
   * 批量发布（支持变更说明）
   */
  async batchPublish(
    contentType: string,
    contentKeys: string[],
    changeSummary?: string
  ): Promise<{ publishedCount: number }> {
    const res = await fetch(`${API_BASE}/admin/content/${contentType}/batch-publish`, {
      method: 'POST',
      headers: getAuthHeaders('application/json'),
      body: JSON.stringify({ keys: contentKeys, changeSummary })
    })
    if (!res.ok) throw new Error('批量发布失败')
    return res.json()
  },

  /**
   * 获取版本历史
   */
  async getVersions(contentType: string, contentKey: string): Promise<VersionInfo[]> {
    const res = await fetch(`${API_BASE}/admin/content/${contentType}/${contentKey}/versions`, {
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('获取版本历史失败')
    return res.json()
  },

  /**
   * 回滚到指定版本
   */
  async rollback(contentType: string, contentKey: string, version: number): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/content/${contentType}/${contentKey}/rollback`, {
      method: 'POST',
      headers: getAuthHeaders('application/json'),
      body: JSON.stringify({ version })
    })
    if (!res.ok) throw new Error('回滚失败')
  },

  /**
   * 删除（软删除）
   */
  async delete(contentType: string, contentKey: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/content/${contentType}/${contentKey}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('删除失败')
  }
}

// ========================================
// 导入 API
// ========================================

export const importApi = {
  /**
   * 预览导入
   */
  async preview(contentType: string, file: File, mode: ImportMode): Promise<ImportPreview> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mode', mode)

    const res = await fetch(`${API_BASE}/admin/import/${contentType}/preview`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      body: formData
    })
    if (!res.ok) throw new Error('预览失败')
    return res.json()
  },

  /**
   * 执行导入
   */
  async execute(
    contentType: string,
    data: any[],
    mode: ImportMode,
    autoPublish: boolean = false
  ): Promise<ImportResult> {
    const res = await fetch(`${API_BASE}/admin/import/${contentType}/execute`, {
      method: 'POST',
      headers: getAuthHeaders('application/json'),
      body: JSON.stringify({ data, mode, autoPublish })
    })
    if (!res.ok) throw new Error('导入失败')
    return res.json()
  },

  /**
   * 获取导入历史
   */
  async getLogs(contentType: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/admin/import/${contentType}/logs`, {
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('获取导入历史失败')
    return res.json()
  }
}
