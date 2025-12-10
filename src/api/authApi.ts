const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// Token 管理
function getToken(): string | null {
  return localStorage.getItem('admin_token')
}

function setToken(token: string): void {
  localStorage.setItem('admin_token', token)
}

function clearToken(): void {
  localStorage.removeItem('admin_token')
}

// 带认证的请求
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers = new Headers(options.headers)
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  
  const response = await fetch(url, { ...options, headers })
  
  if (response.status === 401) {
    clearToken()
    window.location.href = '/admin/login'
  }
  
  return response
}

export const authApi = {
  // 登录
  async login(username: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    const data = await res.json()
    
    if (data.success && data.data?.token) {
      setToken(data.data.token)
    }
    
    return data
  },

  // 退出登录
  async logout() {
    try {
      await authFetch(`${API_BASE}/auth/logout`, { method: 'POST' })
    } finally {
      clearToken()
    }
  },
  
  // 获取当前用户
  async getCurrentUser() {
    const res = await authFetch(`${API_BASE}/auth/me`)
    return res.json()
  },
  
  // 修改密码
  async changePassword(oldPassword: string, newPassword: string) {
    const res = await authFetch(`${API_BASE}/auth/password`, {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword })
    })
    return res.json()
  },
  
  isLoggedIn: () => !!getToken(),
  getToken,
  setToken,
  clearToken
}

// 管理员管理 API
export const adminUserApi = {
  async getList(params?: { page?: number; pageSize?: number; status?: string }) {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) query.set(k, String(v))
      })
    }
    const res = await authFetch(`${API_BASE}/admin/users?${query}`)
    return res.json()
  },
  
  async create(data: { username: string; password: string; role: string; displayName?: string; email?: string; phone?: string }) {
    const res = await authFetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    return res.json()
  },
  
  async update(id: number, data: { displayName?: string; email?: string; phone?: string; role?: string }) {
    const res = await authFetch(`${API_BASE}/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
    return res.json()
  },
  
  async updateStatus(id: number, status: 'active' | 'disabled') {
    const res = await authFetch(`${API_BASE}/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    })
    return res.json()
  },
  
  async resetPassword(id: number, newPassword: string) {
    const res = await authFetch(`${API_BASE}/admin/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword })
    })
    return res.json()
  },
  
  async delete(id: number) {
    const res = await authFetch(`${API_BASE}/admin/users/${id}`, { method: 'DELETE' })
    return res.json()
  }
}

export { authFetch }
