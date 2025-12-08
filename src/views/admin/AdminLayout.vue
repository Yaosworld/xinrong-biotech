<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 侧边栏折叠状态
const sidebarCollapsed = ref(false)

// 菜单配置 - 简化结构，所有页面统一管理
const menuItems = [
  { id: 'banners', title: '横幅设置', icon: 'fas fa-image', path: '/admin/banners' },
  { id: 'products', title: '产品管理', icon: 'fas fa-box', path: '/admin/products/list' },
  { id: 'brands', title: '品牌管理', icon: 'fas fa-award', path: '/admin/brands/list' },
  { id: 'promotions', title: '活动管理', icon: 'fas fa-bullhorn', path: '/admin/promotions/list' },
  { id: 'about', title: '关于我们', icon: 'fas fa-info-circle', path: '/admin/about/content' },
  { id: 'site', title: '网站信息', icon: 'fas fa-cog', path: '/admin/site/settings' }
]

// 判断路由是否激活
const isActive = (path: string) => route.path === path

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
  const item = menuItems.find(m => m.path === route.path)
  return item?.title || '后台管理'
})
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
          <div
            v-for="item in menuItems"
            :key="item.id"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
            @click="navigateTo(item.path)"
          >
            <i :class="item.icon"></i>
            <span v-if="!sidebarCollapsed">{{ item.title }}</span>
          </div>
        </nav>
      </aside>

      <!-- 内容区域 -->
      <main class="admin-content">
        <RouterView />
      </main>
    </div>
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
  padding: 12px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  white-space: nowrap;
  overflow: hidden;
}

.nav-item i {
  width: 24px;
  text-align: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.nav-item span {
  margin-left: 12px;
  opacity: 1;
  transition: opacity 0.2s ease, margin 0.3s ease;
}

.admin-sidebar.collapsed .nav-item {
  padding: 12px 20px;
  justify-content: center;
}

.admin-sidebar.collapsed .nav-item span {
  opacity: 0;
  margin-left: 0;
  width: 0;
}

.nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.nav-item.active {
  color: #fff;
  background: #667eea;
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
