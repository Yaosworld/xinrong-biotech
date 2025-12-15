/**
 * 图片上传 API
 */

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// 获取认证 token
const getAuthToken = () => localStorage.getItem('admin_token') || ''

// 上传分类
export type UploadCategory = 
  | 'brand-logo'      // 品牌 Logo
  | 'brand-cert'      // 品牌授权证书
  | 'promotion-cover' // 活动封面
  | 'promotion-poster'// 活动海报
  | 'product-category'// 产品分类图
  | 'home-banner'     // 首页 Banner
  | 'site-config'     // 网站配置图片（Logo、二维码等）
  | 'common'          // 通用图片

export interface UploadResult {
  success: boolean
  filename?: string
  path?: string
  url?: string
  size?: number
  error?: string
}

export interface FileListItem {
  filename: string
  url: string
}

export const uploadApi = {
  /**
   * 上传图片
   */
  async upload(file: File, category: UploadCategory): Promise<UploadResult> {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${API_BASE}/admin/upload/${category}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: formData
    })

    const data = await res.json()
    return data
  },

  /**
   * 获取已上传的文件列表
   */
  async listFiles(category: UploadCategory): Promise<FileListItem[]> {
    const res = await fetch(`${API_BASE}/admin/upload/${category}/list`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    })

    const data = await res.json()
    return data.success ? data.files : []
  },

  /**
   * 删除文件
   */
  async deleteFile(filePath: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/admin/upload`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: filePath })
    })

    const data = await res.json()
    return data.success
  },

  /**
   * 从 URL 中提取文件名
   */
  getFilenameFromUrl(url: string): string {
    if (!url) return ''
    const parts = url.split('/')
    return parts[parts.length - 1] || ''
  }
}
