<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/adminStore'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()

// 侧边栏菜单
const menuItems = [
  {
    name: '仪表板',
    path: '/admin/dashboard',
    icon: 'el-icon-data-line'
  },
  {
    name: 'Excel管理',
    path: '/admin/excel',
    icon: 'el-icon-document'
  },
  {
    name: '配置管理',
    path: '/admin/config',
    icon: 'el-icon-setting'
  }
]

// 当前激活的菜单
const activeMenu = computed(() => route.path)

// 返回前台
const goToFrontend = () => {
  router.push('/')
}

onMounted(() => {
  adminStore.init()
})
</script>

<template>
  <div class="admin-layout flex h-screen bg-gray-100">
    <!-- 侧边栏 -->
    <aside class="w-64 bg-gray-900 text-white flex flex-col">
      <!-- Logo -->
      <div class="p-4 border-b border-gray-700">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-tech-600 flex items-center justify-center">
            <i class="fas fa-dna text-white text-xl"></i>
          </div>
          <div>
            <div class="font-bold">管理后台</div>
            <div class="text-xs text-gray-400">Admin Panel</div>
          </div>
        </div>
      </div>
      
      <!-- 菜单 -->
      <nav class="flex-1 py-4">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          :class="{ 'bg-gray-800 text-white border-r-4 border-primary-500': activeMenu === item.path }"
        >
          <el-icon class="mr-3"><component :is="item.icon" /></el-icon>
          <span>{{ item.name }}</span>
        </router-link>
      </nav>
      
      <!-- 底部 -->
      <div class="p-4 border-t border-gray-700">
        <button
          class="w-full flex items-center px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          @click="goToFrontend"
        >
          <el-icon class="mr-3"><Back /></el-icon>
          <span>返回前台</span>
        </button>
      </div>
    </aside>
    
    <!-- 主内容区 -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- 顶部栏 -->
      <header class="h-16 bg-white border-b flex items-center justify-between px-6">
        <h1 class="text-xl font-semibold text-gray-800">
          {{ route.meta.title || '管理后台' }}
        </h1>
        
        <div class="flex items-center space-x-4">
          <!-- 消息提示 -->
          <el-badge v-if="adminStore.success" type="success" is-dot>
            <el-button circle>
              <el-icon><Bell /></el-icon>
            </el-button>
          </el-badge>
        </div>
      </header>
      
      <!-- 内容区 -->
      <div class="flex-1 overflow-auto p-6">
        <RouterView />
      </div>
    </main>
    
    <!-- 全局消息提示 -->
    <el-message
      v-if="adminStore.error"
      type="error"
      :message="adminStore.error"
      show-close
    />
    <el-message
      v-if="adminStore.success"
      type="success"
      :message="adminStore.success"
      show-close
    />
  </div>
</template>

<style scoped>
.admin-layout {
  font-family: 'Inter', 'Noto Sans SC', system-ui, sans-serif;
}
</style>

