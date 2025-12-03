<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/productStore'
import { CATEGORIES } from '@/hooks/useCategoryImage'
import { useBrandStore } from '@/stores/brandStore'
import { usePromotionStore } from '@/stores/promotionStore'
import { useAdminStore } from '@/stores/adminStore'

const router = useRouter()
const productStore = useProductStore()
const brandStore = useBrandStore()
const promotionStore = usePromotionStore()
const adminStore = useAdminStore()

// 统计数据
const stats = computed(() => [
  {
    title: '产品总数',
    value: productStore.products.length,
    icon: 'Box',
    color: 'bg-blue-500'
  },
  {
    title: '产品分类',
    value: CATEGORIES.length,
    icon: 'Folder',
    color: 'bg-green-500'
  },
  {
    title: '合作品牌',
    value: brandStore.brands.length,
    icon: 'Star',
    color: 'bg-yellow-500'
  },
  {
    title: '促销活动',
    value: promotionStore.promotions.length,
    icon: 'Bell',
    color: 'bg-red-500'
  }
])

// 快速操作
const quickActions = [
  {
    title: 'Excel数据管理',
    description: '上传Excel文件，更新产品、分类、品牌等数据',
    icon: 'Document',
    path: '/admin/excel'
  },
  {
    title: '配置管理',
    description: '修改网站配置、页面内容、SEO设置等',
    icon: 'Setting',
    path: '/admin/config'
  }
]

// 最近活动
const recentActivities = computed(() => {
  return adminStore.activities.slice(0, 5)
})

// 格式化时间
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 加载数据
onMounted(async () => {
  await Promise.all([
    productStore.loadProducts(),
    brandStore.loadBrands(),
    promotionStore.loadPromotions()
  ])
})
</script>

<template>
  <div class="dashboard">
    <!-- 欢迎信息 -->
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">欢迎回来 👋</h2>
      <p class="text-gray-500">以下是您网站的数据概览</p>
    </div>
    
    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div
        v-for="stat in stats"
        :key="stat.title"
        class="bg-white rounded-xl p-6 shadow-sm"
      >
        <div class="flex items-center justify-between">
          <div>
            <div class="text-3xl font-bold text-gray-800 mb-1">{{ stat.value }}</div>
            <div class="text-gray-500">{{ stat.title }}</div>
          </div>
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center"
            :class="stat.color"
          >
            <el-icon class="text-white text-xl"><component :is="stat.icon" /></el-icon>
          </div>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 快速操作 -->
      <div class="lg:col-span-2">
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">快速操作</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="action in quickActions"
              :key="action.path"
              class="border border-gray-200 rounded-lg p-4 hover:border-primary-500 hover:bg-primary-50 cursor-pointer transition-all"
              @click="router.push(action.path)"
            >
              <div class="flex items-start space-x-4">
                <div class="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                  <el-icon class="text-primary-600"><component :is="action.icon" /></el-icon>
                </div>
                <div class="flex-1">
                  <h4 class="font-semibold text-gray-800 mb-1">{{ action.title }}</h4>
                  <p class="text-sm text-gray-500">{{ action.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 最近活动 -->
      <div>
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">最近活动</h3>
          <div v-if="recentActivities.length === 0" class="text-center py-8 text-gray-400">
            <el-icon class="text-4xl mb-2"><Clock /></el-icon>
            <p>暂无活动记录</p>
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="activity in recentActivities"
              :key="activity.id"
              class="flex items-start space-x-3"
            >
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                :class="{
                  'bg-blue-100 text-blue-600': activity.type === 'upload',
                  'bg-green-100 text-green-600': activity.type === 'config',
                  'bg-yellow-100 text-yellow-600': activity.type === 'modify',
                  'bg-purple-100 text-purple-600': activity.type === 'download'
                }"
              >
                <el-icon>
                  <Upload v-if="activity.type === 'upload'" />
                  <Setting v-else-if="activity.type === 'config'" />
                  <Edit v-else-if="activity.type === 'modify'" />
                  <Download v-else />
                </el-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-800 truncate">{{ activity.description }}</p>
                <p class="text-xs text-gray-400">{{ formatTime(activity.timestamp) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

