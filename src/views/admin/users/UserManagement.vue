<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminUserApi } from '@/api/authApi'

interface AdminUser {
  id: number
  username: string
  role: 'super_admin' | 'admin'
  displayName: string | null
  email: string | null
  phone: string | null
  status: 'active' | 'disabled'
  lastLoginAt: string | null
  createdAt: string
}

const loading = ref(false)
const users = ref<AdminUser[]>([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })

// 弹窗
const dialogVisible = ref(false)
const dialogTitle = ref('新增管理员')
const isEdit = ref(false)
const editingId = ref<number | null>(null)

const form = reactive({
  username: '',
  password: '',
  displayName: '',
  role: 'admin' as 'super_admin' | 'admin',
  email: '',
  phone: ''
})

// 重置密码弹窗
const resetPwdVisible = ref(false)
const resetPwdId = ref<number | null>(null)
const newPassword = ref('')

async function loadUsers() {
  loading.value = true
  try {
    const res = await adminUserApi.getList({ page: pagination.value.page, pageSize: pagination.value.pageSize })
    if (res.success) {
      users.value = res.data
      pagination.value.total = res.pagination.total
    }
  } finally {
    loading.value = false
  }
}

function openCreate() {
  dialogTitle.value = '新增管理员'
  isEdit.value = false
  editingId.value = null
  Object.assign(form, { username: '', password: '', displayName: '', role: 'admin', email: '', phone: '' })
  dialogVisible.value = true
}

function openEdit(user: AdminUser) {
  dialogTitle.value = '编辑管理员'
  isEdit.value = true
  editingId.value = user.id
  Object.assign(form, {
    username: user.username,
    password: '',
    displayName: user.displayName || '',
    role: user.role,
    email: user.email || '',
    phone: user.phone || ''
  })
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.username.trim()) {
    ElMessage.warning('请输入用户名')
    return
  }
  
  if (!isEdit.value && !form.password) {
    ElMessage.warning('请输入密码')
    return
  }
  
  loading.value = true
  try {
    if (isEdit.value && editingId.value) {
      const res = await adminUserApi.update(editingId.value, {
        displayName: form.displayName,
        email: form.email,
        phone: form.phone,
        role: form.role
      })
      if (res.success) {
        ElMessage.success('更新成功')
        dialogVisible.value = false
        loadUsers()
      } else {
        ElMessage.error(res.error?.message || '更新失败')
      }
    } else {
      const res = await adminUserApi.create({
        username: form.username,
        password: form.password,
        role: form.role,
        displayName: form.displayName,
        email: form.email,
        phone: form.phone
      })
      if (res.success) {
        ElMessage.success('创建成功')
        dialogVisible.value = false
        loadUsers()
      } else {
        ElMessage.error(res.error?.message || '创建失败')
      }
    }
  } finally {
    loading.value = false
  }
}

async function handleToggleStatus(user: AdminUser) {
  const newStatus = user.status === 'active' ? 'disabled' : 'active'
  const action = newStatus === 'disabled' ? '禁用' : '启用'
  
  try {
    await ElMessageBox.confirm(`确定要${action}账号 "${user.username}" 吗？`, '提示', { type: 'warning' })
    const res = await adminUserApi.updateStatus(user.id, newStatus)
    if (res.success) {
      ElMessage.success(res.message)
      loadUsers()
    } else {
      ElMessage.error(res.error?.message || '操作失败')
    }
  } catch {}
}

async function handleDelete(user: AdminUser) {
  try {
    await ElMessageBox.confirm(`确定要删除账号 "${user.username}" 吗？此操作不可恢复！`, '警告', { type: 'error' })
    const res = await adminUserApi.delete(user.id)
    if (res.success) {
      ElMessage.success('删除成功')
      loadUsers()
    } else {
      ElMessage.error(res.error?.message || '删除失败')
    }
  } catch {}
}

function openResetPwd(user: AdminUser) {
  resetPwdId.value = user.id
  newPassword.value = ''
  resetPwdVisible.value = true
}

async function handleResetPwd() {
  if (!newPassword.value || newPassword.value.length < 8) {
    ElMessage.warning('密码需要8位以上')
    return
  }
  
  const res = await adminUserApi.resetPassword(resetPwdId.value!, newPassword.value)
  if (res.success) {
    ElMessage.success('密码已重置')
    resetPwdVisible.value = false
  } else {
    ElMessage.error(res.error?.message || '重置失败')
  }
}

function formatDate(date: string | null) {
  if (!date) return '-'
  return date.replace('T', ' ').substring(0, 16)
}

onMounted(() => loadUsers())
</script>

<template>
  <div class="user-management">
    <div class="page-header">
      <h2>账号管理</h2>
      <el-button type="primary" @click="openCreate">
        <i class="fas fa-plus"></i> 新增管理员
      </el-button>
    </div>
    
    <el-table :data="users" v-loading="loading" stripe>
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column prop="displayName" label="显示名称" width="140">
        <template #default="{ row }">{{ row.displayName || '-' }}</template>
      </el-table-column>
      <el-table-column prop="role" label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="row.role === 'super_admin' ? 'danger' : 'primary'" size="small">
            {{ row.role === 'super_admin' ? '超级管理员' : '普通管理员' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
            {{ row.status === 'active' ? '正常' : '已禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="lastLoginAt" label="最后登录" width="160">
        <template #default="{ row }">{{ formatDate(row.lastLoginAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" min-width="200">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" @click="openResetPwd(row)">重置密码</el-button>
          <el-button size="small" :type="row.status === 'active' ? 'warning' : 'success'" @click="handleToggleStatus(row)">
            {{ row.status === 'active' ? '禁用' : '启用' }}
          </el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="用户名" required>
          <el-input v-model="form.username" :disabled="isEdit" placeholder="3-20位，字母开头" />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="密码" required>
          <el-input v-model="form.password" type="password" placeholder="8位以上，包含字母和数字" show-password />
        </el-form-item>
        <el-form-item label="显示名称">
          <el-input v-model="form.displayName" placeholder="可选" />
        </el-form-item>
        <el-form-item label="角色" required>
          <el-radio-group v-model="form.role">
            <el-radio value="super_admin">超级管理员</el-radio>
            <el-radio value="admin">普通管理员</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="可选" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 重置密码弹窗 -->
    <el-dialog v-model="resetPwdVisible" title="重置密码" width="400px">
      <el-form label-width="80px">
        <el-form-item label="新密码" required>
          <el-input v-model="newPassword" type="password" placeholder="8位以上，包含字母和数字" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPwdVisible = false">取消</el-button>
        <el-button type="primary" @click="handleResetPwd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.user-management {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}
</style>
