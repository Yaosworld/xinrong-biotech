<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 修改密码弹窗
const pwdDialogVisible = ref(false)
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdLoading = ref(false)

// 侧边栏折叠状态
const sidebarCollapsed = ref(false)

// 菜单配置 - 支持子菜单
interface MenuItem {
  id: string
  title: string
  icon: string
  path?: string
  requiresSuperAdmin?: boolean
  children?: { id: string; title: string; path: string }[]
}

const allMenuItems: MenuItem[] = [
  { 
    id: 'products', 
    title: '产品管理', 
    icon: 'fas fa-box',
    children: [
      { id: 'products-list', title: '产品列表', path: '/admin/products/list' },
      { id: 'products-categories', title: '分类管理', path: '/admin/products/categories' },
      { id: 'products-images', title: '分类图片库', path: '/admin/products/category-images' }
    ]
  },
  { 
    id: 'promotions', 
    title: '活动管理', 
    icon: 'fas fa-bullhorn',
    children: [
      { id: 'promotions-list', title: '活动列表', path: '/admin/promotions/list' },
      { id: 'promotions-images', title: '活动图片库', path: '/admin/promotions/images' }
    ]
  },
  { id: 'brands', title: '品牌管理', icon: 'fas fa-award', path: '/admin/brands/list' },
  { id: 'about', title: '关于我们', icon: 'fas fa-info-circle', path: '/admin/about/content' },
  { id: 'banners', title: '横幅设置', icon: 'fas fa-image', path: '/admin/banners' },
  { id: 'site', title: '网站设置', icon: 'fas fa-cog', path: '/admin/site/settings' },
  { id: 'users', title: '账号管理', icon: 'fas fa-users-cog', path: '/admin/users', requiresSuperAdmin: true }
]

// 根据权限过滤菜单
const menuItems = computed(() => {
  return allMenuItems.filter(item => {
    if (item.requiresSuperAdmin) return authStore.isSuperAdmin
    return true
  })
})

// 展开的子菜单
const expandedMenus = ref<string[]>(['products', 'promotions'])

// 判断路由是否激活
const isActive = (path: string) => route.path === path

// 判断菜单组是否激活
const isGroupActive = (item: MenuItem) => {
  if (item.children) {
    return item.children.some(child => route.path === child.path)
  }
  return route.path === item.path
}

// 切换子菜单展开状态，并导航到第一个子菜单
const toggleSubmenu = (id: string) => {
  const index = expandedMenus.value.indexOf(id)
  if (index > -1) {
    expandedMenus.value.splice(index, 1)
  } else {
    expandedMenus.value.push(id)
    // 展开时自动导航到第一个子菜单
    const menuItem = menuItems.value.find(item => item.id === id)
    if (menuItem?.children && menuItem.children.length > 0) {
      router.push(menuItem.children[0].path)
    }
  }
}

// 判断子菜单是否展开
const isExpanded = (id: string) => expandedMenus.value.includes(id)

// 导航到指定路由
const navigateTo = (path: string) => {
  router.push(path)
}

// 返回前台
const goToFrontend = () => {
  router.push('/')
}

// 切换侧边栏
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 当前页面标题
const currentPageTitle = computed(() => {
  for (const item of menuItems.value) {
    if (item.path === route.path) {
      return item.title
    }
    if (item.children) {
      const child = item.children.find(c => c.path === route.path)
      if (child) {
        return `${item.title} - ${child.title}`
      }
    }
  }
  return '后台管理'
})

// 用户下拉菜单命令
async function handleUserCommand(command: string) {
  if (command === 'password') {
    pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    pwdDialogVisible.value = true
  } else if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
      await authStore.logout()
      router.push('/admin/login')
      ElMessage.success('已退出登录')
    } catch {}
  }
}

// 修改密码
async function handleChangePwd() {
  if (!pwdForm.value.oldPassword) {
    ElMessage.warning('请输入当前密码')
    return
  }
  if (!pwdForm.value.newPassword || pwdForm.value.newPassword.length < 8) {
    ElMessage.warning('新密码需要8位以上')
    return
  }
  if (pwdForm.value.newPassword !== pwdForm.value.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  
  pwdLoading.value = true
  try {
    const res = await authStore.changePassword(pwdForm.value.oldPassword, pwdForm.value.newPassword)
    if (res.success) {
      ElMessage.success('密码修改成功')
      pwdDialogVisible.value = false
    } else {
      ElMessage.error(res.error?.message || '修改失败')
    }
  } finally {
    pwdLoading.value = false
  }
}
</script>

<template>
  <div class="admin-layout">
    <!-- 顶部导航 -->
    <header class="admin-header">
      <div class="header-left">
        <button class="toggle-btn" @click="toggleSidebar">
          <i :class="sidebarCollapsed ? 'fas fa-indent' : 'fas fa-outdent'"></i>
        </button>
        <h1 class="header-title">{{ currentPageTitle }}</h1>
      </div>
      <div class="header-right">
        <button class="frontend-btn" @click="goToFrontend">
          <i class="fas fa-external-link-alt"></i>
          <span>访问前台</span>
        </button>
        
        <!-- 用户信息下拉 -->
        <el-dropdown trigger="click" @command="handleUserCommand">
          <div class="user-info">
            <div class="user-avatar">
              <i class="fas fa-user"></i>
            </div>
            <span class="user-name">{{ authStore.displayName }}</span>
            <i class="fas fa-chevron-down user-arrow"></i>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>
                <i class="fas fa-id-badge"></i>
                <span>{{ authStore.isSuperAdmin ? '超级管理员' : '普通管理员' }}</span>
              </el-dropdown-item>
              <el-dropdown-item divided command="password">
                <i class="fas fa-key"></i>
                <span>修改密码</span>
              </el-dropdown-item>
              <el-dropdown-item command="logout">
                <i class="fas fa-sign-out-alt"></i>
                <span>退出登录</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- 主体区域 -->
    <div class="admin-body">
      <!-- 侧边栏 -->
      <aside class="admin-sidebar" :class="{ collapsed: sidebarCollapsed }">
        <div class="sidebar-header">
          <div class="logo">
            <i class="fas fa-flask"></i>
            <span v-if="!sidebarCollapsed">后台管理</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <template v-for="item in menuItems" :key="item.id + '-' + authStore.isSuperAdmin">
            <!-- 有子菜单的项 -->
            <template v-if="item.children">
              <div
                class="nav-item has-children"
                :class="{ active: isGroupActive(item), expanded: isExpanded(item.id) }"
                @click="toggleSubmenu(item.id)"
              >
                <i :class="item.icon"></i>
                <span v-if="!sidebarCollapsed">{{ item.title }}</span>
                <i v-if="!sidebarCollapsed" class="fas fa-chevron-down arrow"></i>
              </div>
              <div v-if="!sidebarCollapsed && isExpanded(item.id)" class="submenu">
                <div
                  v-for="child in item.children"
                  :key="child.id"
                  class="nav-item submenu-item"
                  :class="{ active: isActive(child.path) }"
                  @click.stop="navigateTo(child.path)"
                >
                  <span>{{ child.title }}</span>
                </div>
              </div>
            </template>
            <!-- 无子菜单的项 -->
            <div
              v-else
              class="nav-item"
              :class="{ active: isActive(item.path!) }"
              @click="navigateTo(item.path!)"
            >
              <i :class="item.icon"></i>
              <span v-if="!sidebarCollapsed">{{ item.title }}</span>
            </div>
          </template>
        </nav>
      </aside>

      <!-- 内容区域 -->
      <main class="admin-content">
        <RouterView />
      </main>
    </div>
    
    <!-- 修改密码弹窗 -->
    <el-dialog v-model="pwdDialogVisible" title="修改密码" width="400px">
      <el-form :model="pwdForm" label-width="90px">
        <el-form-item label="当前密码" required>
          <el-input v-model="pwdForm.oldPassword" type="password" placeholder="请输入当前密码" show-password />
        </el-form-item>
        <el-form-item label="新密码" required>
          <el-input v-model="pwdForm.newPassword" type="password" placeholder="8位以上，包含字母和数字" show-password />
        </el-form-item>
        <el-form-item label="确认密码" required>
          <el-input v-model="pwdForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleChangePwd" :loading="pwdLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background: #f0f2f5;
}

/* 顶部导航 */
.admin-header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toggle-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: #e8e8e8;
  color: #333;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.frontend-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.frontend-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* 用户信息 */
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-info:hover {
  background: #f5f5f5;
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
}

.user-name {
  font-size: 14px;
  color: #333;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-arrow {
  font-size: 12px;
  color: #999;
}

/* 主体区域 */
.admin-body {
  display: flex;
  padding-top: 60px;
  min-height: 100vh;
}

/* 侧边栏 */
.admin-sidebar {
  width: 240px;
  background: #001529;
  position: fixed;
  top: 60px;
  left: 0;
  bottom: 0;
  overflow-y: auto;
  overflow-x: hidden;
  transition: width 0.3s ease;
  z-index: 99;
}

.admin-sidebar.collapsed {
  width: 64px;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: padding 0.3s ease;
}

.admin-sidebar.collapsed .sidebar-header {
  padding: 20px;
  display: flex;
  justify-content: center;
}

.logo {
  display: flex;
  align-items: center;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
}

.logo i {
  width: 24px;
  font-size: 24px;
  color: #667eea;
  flex-shrink: 0;
  text-align: center;
}

.logo span {
  margin-left: 12px;
  opacity: 1;
  transition: opacity 0.2s ease, margin 0.3s ease;
}

.admin-sidebar.collapsed .logo span {
  opacity: 0;
  margin-left: 0;
}

/* 导航菜单 */
.sidebar-nav {
  padding: 8px 0;
}

/* 一级菜单项 */
.nav-item {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  white-space: nowrap;
  overflow: hidden;
  margin: 4px 8px;
  border-radius: 8px;
}

.nav-item i:first-child {
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  font-size: 15px;
}

.nav-item span {
  margin-left: 12px;
  font-size: 14px;
  font-weight: 500;
  opacity: 1;
  transition: opacity 0.2s ease, margin 0.3s ease;
}

.admin-sidebar.collapsed .nav-item {
  padding: 14px;
  margin: 4px 8px;
  justify-content: center;
}

.admin-sidebar.collapsed .nav-item span {
  opacity: 0;
  margin-left: 0;
  width: 0;
}

.nav-item:hover {
  color: #fff;
  background: rgba(102, 126, 234, 0.15);
}

/* 一级菜单激活状态 - 统一样式 */
.nav-item.active {
  color: #fff;
  background: rgba(102, 126, 234, 0.2);
}

/* 有子菜单的一级项 */
.nav-item.has-children {
  position: relative;
}

.nav-item.has-children .arrow {
  margin-left: auto;
  font-size: 10px;
  transition: transform 0.3s;
  opacity: 0.6;
}

.nav-item.has-children.expanded .arrow {
  transform: rotate(180deg);
}

/* 子菜单容器 */
.submenu {
  background: rgba(0, 0, 0, 0.15);
  margin: 0 8px 4px 8px;
  border-radius: 8px;
  padding: 4px 0;
  overflow: hidden;
}

/* 二级菜单项 */
.submenu-item {
  padding: 10px 16px 10px 44px !important;
  font-size: 13px;
  margin: 2px 4px;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.6);
}

.submenu-item:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.05);
}

.submenu-item.active {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  font-weight: 500;
}

.submenu-item::before {
  content: '';
  width: 6px;
  height: 6px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  position: absolute;
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
  transition: all 0.2s;
}

.submenu-item:hover::before {
  background: rgba(255, 255, 255, 0.5);
}

.submenu-item.active::before {
  background: #667eea;
  box-shadow: 0 0 6px rgba(102, 126, 234, 0.6);
}

/* 内容区域 */
.admin-content {
  flex: 1;
  margin-left: 240px;
  padding: 24px;
  transition: margin-left 0.3s;
  min-height: calc(100vh - 60px);
}

.admin-sidebar.collapsed + .admin-content,
.admin-sidebar.collapsed ~ .admin-content {
  margin-left: 64px;
}

/* 响应式 */
@media (max-width: 768px) {
  .admin-sidebar {
    transform: translateX(-100%);
  }

  .admin-sidebar.collapsed {
    transform: translateX(0);
    width: 240px;
  }

  .admin-content {
    margin-left: 0;
  }
}
</style>
