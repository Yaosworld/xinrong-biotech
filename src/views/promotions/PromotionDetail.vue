<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePromotionStore } from '@/stores/promotionStore'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const promotionStore = usePromotionStore()

const promotionId = computed(() => Number(route.params.id))
const loading = ref(true)
const posterError = ref(false)

// 几何装饰形状
const geometricShapes = ref<any[]>([])

// 生成几何装饰
const generateGeometricShapes = () => {
  const shapes = []
  const shapeCount = 15
  
  for (let i = 0; i < shapeCount; i++) {
    const size = 15 + Math.random() * 35
    const isCircle = Math.random() > 0.5
    const opacity = 0.08 + Math.random() * 0.15
    
    shapes.push({
      id: i,
      style: {
        left: `${Math.random() * 95}%`,
        top: `${Math.random() * 90}%`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: `${opacity}`,
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        boxShadow: '0 0 20px rgba(118, 75, 162, 0.3)',
        animation: `geometricFloat${(i % 4) + 1} ${15 + Math.random() * 10}s ease-in-out infinite`,
        animationDelay: `${Math.random() * 5}s`,
        transform: `rotate(${Math.random() * 360}deg)`,
        borderRadius: isCircle ? '50%' : '8px',
        border: '1px solid rgba(255, 255, 255, 0.15)'
      }
    })
  }
  geometricShapes.value = shapes
}

// 当前促销活动
const promotion = computed(() => {
  return promotionStore.getPromotionById(promotionId.value)
})

// 是否有海报
const hasPoster = computed(() => {
  return promotion.value?.poster_url && !posterError.value
})

// 是否有文本内容
const hasTextContent = computed(() => {
  return promotion.value?.description && promotion.value.description.trim().length > 0
})

// 是否只有海报（无文本）
const posterOnly = computed(() => {
  return hasPoster.value && !hasTextContent.value
})

// 是否只有文本（无海报）
const textOnly = computed(() => {
  return hasTextContent.value && !hasPoster.value
})

// 是否双栏布局（既有文本又有海报）
const hasBothContent = computed(() => {
  return hasTextContent.value && hasPoster.value
})

// 描述内容分段（按双换行分段，与BrandDetail保持一致）
const descriptionParagraphs = computed(() => {
  if (!promotion.value?.description) return []
  // 按双换行分段（真正的段落分隔）
  return promotion.value.description.split(/\n\n+/).filter(p => p.trim())
})

// 状态颜色
const statusColorClass = computed(() => {
  switch (promotion.value?.status) {
    case 'active':
      return 'bg-green-100 text-green-700'
    case 'coming':
      return 'bg-yellow-100 text-yellow-700'
    case 'ended':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
})

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// 返回资讯中心
const goBack = () => {
  router.push('/news')
}

// 海报加载错误处理
const handlePosterError = () => {
  posterError.value = true
}

onMounted(async () => {
  generateGeometricShapes()
  loading.value = true
  try {
    await promotionStore.loadPromotions()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="promotion-detail-page pt-[72px]">
    <!-- 几何装饰背景 -->
    <div class="geometric-decorations">
      <div
        v-for="shape in geometricShapes"
        :key="shape.id"
        class="geometric-shape"
        :style="shape.style"
      ></div>
    </div>

    <!-- 返回按钮 -->
    <button class="back-button" @click="goBack">
      <i class="fas fa-arrow-left"></i>
      返回资讯中心
    </button>

    <!-- 加载状态 -->
    <div v-if="loading" class="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner size="lg" text="加载活动详情..." />
    </div>
    
    <!-- 活动未找到 -->
    <div v-else-if="!promotion" class="not-found-container">
      <div class="glass-card error-card">
        <i class="fas fa-exclamation-triangle text-5xl text-amber-500 mb-4"></i>
        <h2 class="text-xl font-bold text-dark-700 mb-2">活动未找到</h2>
        <p class="text-dark-500 mb-6">抱歉，您查找的活动不存在或已被移除</p>
        <button class="btn-primary" @click="goBack">
          <i class="fas fa-arrow-left mr-2"></i>
          返回资讯中心
        </button>
      </div>
    </div>
    
    <!-- 活动详情内容 -->
    <div v-else class="promotion-detail-content">
      <div class="container-base py-8">
        <h2 class="page-main-title">活动详情</h2>
        
        <!-- 纯海报展示模式 -->
        <div v-if="posterOnly" class="poster-only-layout">
          <div class="poster-full glass-card">
            <div class="poster-header">
              <div class="flex items-center gap-4 flex-wrap">
                <span class="status-badge" :class="statusColorClass">
                  {{ promotion.statusText }}
                </span>
                <span v-if="promotion.start_date && promotion.end_date" class="date-range">
                  <i class="fas fa-calendar-alt mr-2"></i>
                  {{ formatDate(promotion.start_date) }} - {{ formatDate(promotion.end_date) }}
                </span>
              </div>
              <h1 class="poster-title">{{ promotion.title }}</h1>
              <p class="poster-summary">{{ promotion.summary }}</p>
            </div>
            <div class="poster-image-container">
              <img
                :src="promotion.poster_url"
                :alt="promotion.title"
                class="poster-image"
              />
            </div>
          </div>
        </div>

        <!-- 双栏布局 - 既有文本又有海报 -->
        <div v-else-if="hasBothContent" class="detail-layout">
          <!-- 左侧文字内容面板 -->
          <div class="left-panel glass-card">
            <!-- 活动头部 -->
            <div class="promotion-header">
              <div class="flex items-center gap-4 flex-wrap mb-4">
                <span class="status-badge" :class="statusColorClass">
                  {{ promotion.statusText }}
                </span>
                <span v-if="promotion.start_date && promotion.end_date" class="date-range">
                  <i class="fas fa-calendar-alt mr-2"></i>
                  {{ formatDate(promotion.start_date) }} - {{ formatDate(promotion.end_date) }}
                </span>
              </div>
              <h1 class="promotion-title">{{ promotion.title }}</h1>
              <p class="promotion-summary">{{ promotion.summary }}</p>
            </div>

            <!-- 活动详情 -->
            <div v-if="descriptionParagraphs.length > 0" class="promotion-description">
              <h3 class="section-title-inner">
                <i class="fas fa-file-alt text-primary-500"></i>
                活动详情
              </h3>
              <div class="description-content">
                <p
                  v-for="(paragraph, index) in descriptionParagraphs"
                  :key="index"
                  class="paragraph"
                  v-html="paragraph.replace(/\n/g, '<br>')"
                >
                </p>
              </div>
            </div>

            <!-- 标签 -->
            <div v-if="promotion.tags?.length" class="promotion-tags">
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="tag in promotion.tags"
                  :key="tag"
                  class="tag-item"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>
          </div>

          <!-- 右侧海报面板 -->
          <div class="right-panel glass-card">
            <h3 class="section-title-inner">
              <i class="fas fa-image text-primary-500"></i>
              活动海报
            </h3>
            <div class="poster-container">
              <img
                :src="promotion.poster_url"
                :alt="promotion.title"
                class="poster-image"
                @error="handlePosterError"
              />
            </div>
          </div>
        </div>

        <!-- 纯文字展示模式 - 单列居中 -->
        <div v-else-if="textOnly" class="text-only-layout">
          <div class="text-full glass-card">
            <!-- 活动头部 -->
            <div class="promotion-header">
              <div class="flex items-center gap-4 flex-wrap mb-4">
                <span class="status-badge" :class="statusColorClass">
                  {{ promotion.statusText }}
                </span>
                <span v-if="promotion.start_date && promotion.end_date" class="date-range">
                  <i class="fas fa-calendar-alt mr-2"></i>
                  {{ formatDate(promotion.start_date) }} - {{ formatDate(promotion.end_date) }}
                </span>
              </div>
              <h1 class="promotion-title">{{ promotion.title }}</h1>
              <p class="promotion-summary">{{ promotion.summary }}</p>
            </div>

            <!-- 活动详情 -->
            <div v-if="descriptionParagraphs.length > 0" class="promotion-description">
              <h3 class="section-title-inner">
                <i class="fas fa-file-alt text-primary-500"></i>
                活动详情
              </h3>
              <div class="description-content">
                <p
                  v-for="(paragraph, index) in descriptionParagraphs"
                  :key="index"
                  class="paragraph"
                  v-html="paragraph.replace(/\n/g, '<br>')"
                >
                </p>
              </div>
            </div>

            <!-- 标签 -->
            <div v-if="promotion.tags?.length" class="promotion-tags">
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="tag in promotion.tags"
                  :key="tag"
                  class="tag-item"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.promotion-detail-page {
  min-height: 100vh;
  background: #f8fafc;
  position: relative;
  overflow: hidden;
}

/* 几何装饰背景 */
.geometric-decorations {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.geometric-shape {
  position: absolute;
  backdrop-filter: blur(2px);
  transition: all 0.3s ease;
}

@keyframes geometricFloat1 {
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  25% { transform: translate(30px, -25px) rotate(90deg) scale(1.08); }
  50% { transform: translate(-20px, 35px) rotate(180deg) scale(0.95); }
  75% { transform: translate(40px, 12px) rotate(270deg) scale(1.03); }
}

@keyframes geometricFloat2 {
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  33% { transform: translate(-40px, 28px) rotate(120deg) scale(1.12); }
  66% { transform: translate(28px, -38px) rotate(240deg) scale(0.88); }
}

@keyframes geometricFloat3 {
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  50% { transform: translate(-32px, -28px) rotate(180deg) scale(1.15); }
}

@keyframes geometricFloat4 {
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  20% { transform: translate(-25px, 42px) rotate(72deg) scale(0.92); }
  40% { transform: translate(38px, -18px) rotate(144deg) scale(1.08); }
  60% { transform: translate(-30px, -25px) rotate(216deg) scale(1.02); }
  80% { transform: translate(22px, 35px) rotate(288deg) scale(0.98); }
}

/* 返回按钮 */
.back-button {
  position: fixed;
  top: 100px;
  left: 2rem;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  color: #374151;
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 25px;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.back-button:hover {
  background: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.2);
}

/* 未找到内容 */
.not-found-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 2rem;
  position: relative;
  z-index: 2;
}

.error-card {
  text-align: center;
  padding: 3rem;
  max-width: 400px;
}

/* 玻璃态卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(102, 126, 234, 0.1);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

/* 详情内容 - 垂直居中 */
.promotion-detail-content {
  position: relative;
  z-index: 1;
  min-height: calc(100vh - 72px);
  display: flex;
  align-items: center;
}

.container-base {
  width: 100%;
}

.page-main-title {
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 2rem;
  position: relative;
  padding-bottom: 1rem;
}

.page-main-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 2px;
}

/* 双栏布局 - 左侧决定高度，右侧自适应 */
.detail-layout {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

/* 单列布局 - 当只有文本内容时水平居中 */
.text-only-layout {
  display: flex;
  justify-content: center;
}

/* 左侧面板 */
.left-panel {
  flex: 1.2;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.promotion-header {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 20px;
}

.date-range {
  font-size: 0.875rem;
  color: #64748b;
}

.promotion-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 1rem 0 0.5rem;
}

.promotion-summary {
  font-size: 1rem;
  color: #64748b;
  line-height: 1.6;
}

.section-title-inner {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.description-content {
  color: #475569;
  line-height: 1.8;
}

.paragraph {
  margin-bottom: 0.75rem;
  position: relative;
  padding-left: 16px;
}

.paragraph::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  width: 4px;
  height: 4px;
  background: #667eea;
  border-radius: 50%;
}

.paragraph:last-child {
  margin-bottom: 0;
}

.promotion-tags {
  padding-top: 1rem;
  border-top: 1px solid rgba(102, 126, 234, 0.1);
}

.tag-item {
  display: inline-flex;
  padding: 4px 12px;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 20px;
}

/* 右侧面板 - 跟随左侧高度 */
.right-panel {
  flex: 0.8;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-self: stretch; /* 跟随左侧高度 */
}

.poster-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(102, 126, 234, 0.03);
  border-radius: 16px;
  border: 2px dashed rgba(102, 126, 234, 0.15);
  overflow: hidden;
}

.poster-image {
  width: 100%;
  height: 100%;
  object-fit: contain; /* 保持图片比例 */
  border-radius: 12px;
}

.poster-placeholder {
  text-align: center;
  padding: 2rem;
}

/* 纯海报布局 */
.poster-only-layout {
  max-width: 800px;
  margin: 0 auto;
}

.poster-full {
  padding: 2rem;
}

/* 纯文字布局 */
.text-only-layout {
  max-width: 800px;
  margin: 0 auto;
}

.text-full {
  flex: none;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.poster-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
}

.poster-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin: 1rem 0 0.5rem;
}

.poster-summary {
  font-size: 1rem;
  color: #64748b;
  line-height: 1.6;
}

.poster-image-container {
  display: flex;
  justify-content: center;
  padding: 1rem;
  background: rgba(102, 126, 234, 0.03);
  border-radius: 16px;
}

.poster-image-container .poster-image {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .detail-layout {
    flex-direction: column;
  }

  .left-panel,
  .right-panel {
    flex: none;
    width: 100%;
  }

  .back-button {
    top: 90px;
    left: 1rem;
    padding: 10px 18px;
    font-size: 0.85rem;
  }
}

@media (max-width: 768px) {
  .promotion-title,
  .poster-title {
    font-size: 1.25rem;
  }

  .back-button {
    position: relative;
    top: 0;
    left: 0;
    margin: 1rem;
  }
}
</style>
