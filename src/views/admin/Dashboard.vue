<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/productStore'
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
    icon: 'fas fa-box',
    color: '#667eea',
    path: '/admin/products/list'
  },
  {
    title: '品牌总数',
    value: brandStore.brands.length,
    icon: 'fas fa-award',
    color: '#f59e0b',
    path: '/admin/brands/list'
  },
  {
    title: '活动总数',
    value: promotionStore.promotions.length,
    icon: 'fas fa-bullhorn',
    color: '#10b981',
    path: '/admin/promotions/list'
  },
  {
    title: '进行中活动',
    value: promotionStore.activePromotions.length,
    icon: 'fas fa-fire',
    color: '#ef4444',
    path: '/admin/promotions/list'
  }
])

// 快捷操作
const quickActions = [
  { title: '产品管理', icon: 'fas fa-box', path: '/admin/products/list', color: '#667eea' },
  { title: '品牌管理', icon: 'fas fa-award', path: '/admin/brands/list', color: '#f59e0b' },
  { title: '活动管理', icon: 'fas fa-bullhorn', path: '/admin/promotions/list', color: '#10b981' },
  { title: '网站设置', icon: 'fas fa-cog', path: '/admin/site/info', color: '#8b5cf6' }
]

// 最近活动
const recentActivities = computed(() => adminStore.activities.slice(0, 10))

// 格式化时间
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return date.toLocaleDateString('zh-CN')
}

// 获取活动图标
const getActivityIcon = (type: string) => {
  const icons: Record<string, string> = {
    upload: 'fas fa-upload',
    config: 'fas fa-cog',
    modify: 'fas fa-edit',
    download: 'fas fa-download'
  }
  return icons[type] || 'fas fa-info'
}

// 导航
const navigateTo = (path: string) => {
  router.push(path)
}

onMounted(async () => {
  adminStore.init()
  await Promise.all([
    productStore.loadProducts(),
    brandStore.loadBrands(),
    promotionStore.loadPromotions()
  ])
})
</script>

<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div
        v-for="stat in stats"
        :key="stat.title"
        class="stat-card"
        @click="navigateTo(stat.path)"
      >
        <div class="stat-icon" :style="{ background: stat.color }">
          <i :class="stat.icon"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-title">{{ stat.title }}</div>
        </div>
      </div>
    </div>

    <!-- 主要内容区 -->
    <div class="dashboard-content">
      <!-- 快捷操作 -->
      <div class="panel quick-actions-panel">
        <div class="panel-header">
          <h3>快捷操作</h3>
        </div>
        <div class="panel-body">
          <div class="quick-actions">
            <div
              v-for="action in quickActions"
              :key="action.title"
              class="quick-action"
              @click="navigateTo(action.path)"
            >
              <div class="action-icon" :style="{ background: action.color }">
                <i :class="action.icon"></i>
              </div>
              <span>{{ action.title }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近活动 -->
      <div class="panel activities-panel">
        <div class="panel-header">
          <h3>最近活动</h3>
          <button v-if="recentActivities.length > 0" class="clear-btn" @click="adminStore.clearActivities">
            清空
          </button>
        </div>
        <div class="panel-body">
          <div v-if="recentActivities.length === 0" class="empty-state">
            <i class="fas fa-history"></i>
            <p>暂无活动记录</p>
          </div>
          <div v-else class="activity-list">
            <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
              <div class="activity-icon">
                <i :class="getActivityIcon(activity.type)"></i>
              </div>
              <div class="activity-info">
                <div class="activity-desc">{{ activity.description }}</div>
                <div class="activity-time">{{ formatTime(activity.timestamp) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 系统信息 -->
    <div class="panel system-info-panel">
      <div class="panel-header">
        <h3>系统信息</h3>
      </div>
      <div class="panel-body">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">数据存储</span>
            <span class="info-value">public/data/</span>
          </div>
          <div class="info-item">
            <span class="info-label">产品数据</span>
            <span class="info-value">products.json</span>
          </div>
          <div class="info-item">
            <span class="info-label">品牌数据</span>
            <span class="info-value">brands.json</span>
          </div>
          <div class="info-item">
            <span class="info-label">活动数据</span>
            <span class="info-value">promotions.json</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.stat-title {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

/* 面板通用样式 */
.panel {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.panel-body {
  padding: 20px;
}

.clear-btn {
  padding: 4px 12px;
  background: #f5f5f5;
  border: none;
  border-radius: 4px;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: #e8e8e8;
  color: #333;
}

/* 主要内容区 */
.dashboard-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* 快捷操作 */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.quick-action {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-action:hover {
  background: #f0f0f0;
  transform: translateX(4px);
}

.action-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
}

.quick-action span {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

/* 活动列表 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 12px;
}

.activity-list {
  max-height: 300px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 32px;
  height: 32px;
  background: #f0f0f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 14px;
  flex-shrink: 0;
}

.activity-info {
  flex: 1;
  min-width: 0;
}

.activity-desc {
  font-size: 14px;
  color: #333;
  line-height: 1.4;
}

.activity-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* 系统信息 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #999;
}

.info-value {
  font-size: 14px;
  color: #333;
  font-family: monospace;
}

/* 响应式 */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-content {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
