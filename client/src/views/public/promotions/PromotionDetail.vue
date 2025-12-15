<script setup lang="ts">
/**
 * 促销活动详情页
 * 
 * 使用 DetailPageLayout 通用布局组件
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { usePromotionStore } from '@/stores/promotionStore'
import DetailPageLayout from '@/components/common/DetailPageLayout.vue'

const route = useRoute()
const promotionStore = usePromotionStore()

const promotionId = computed(() => route.params.id as string)
const loading = ref(true)
const posterError = ref(false)

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

// 描述内容分段
const descriptionParagraphs = computed(() => {
  if (!promotion.value?.description) return []
  return promotion.value.description.split(/\n\n+/).filter(p => p.trim())
})

// 当前状态
const currentStatus = computed(() => promotion.value?.timeStatus || promotion.value?.status)
const currentStatusText = computed(() => promotion.value?.timeStatusText || promotion.value?.statusText)

// 状态颜色
const statusColorClass = computed(() => {
  const status = currentStatus.value
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700'
    case 'endingSoon': return 'bg-orange-100 text-orange-700'
    case 'coming': return 'bg-blue-100 text-blue-700'
    case 'ended': return 'bg-gray-100 text-gray-500'
    default: return 'bg-gray-100 text-gray-700'
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

// 海报加载错误处理
const handlePosterError = () => {
  posterError.value = true
}

onMounted(async () => {
  loading.value = true
  try {
    await promotionStore.loadPromotions()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <DetailPageLayout
    title="活动详情"
    back-text="返回资讯中心"
    back-path="/news"
    :loading="loading"
    loading-text="加载活动详情..."
    :not-found="!loading && !promotion"
    not-found-icon="fas fa-exclamation-triangle"
    not-found-title="活动未找到"
    not-found-description="抱歉，您查找的活动不存在或已被移除"
  >
    <!-- 纯海报展示模式 -->
    <div v-if="posterOnly" class="poster-only-layout">
      <div class="poster-full glass-card">
        <div class="promotion-header">
          <div class="flex items-center gap-4 flex-wrap">
            <span class="status-badge" :class="statusColorClass">
              {{ currentStatusText }}
            </span>
            <span v-if="promotion?.start_date && promotion?.end_date" class="date-range">
              <i class="fas fa-calendar-alt mr-2"></i>
              {{ formatDate(promotion.start_date) }} - {{ formatDate(promotion.end_date) }}
            </span>
          </div>
          <h1 class="promotion-title">{{ promotion?.title }}</h1>
          <p class="promotion-summary">{{ promotion?.summary }}</p>
        </div>
        <div class="poster-image-container">
          <img :src="promotion?.poster_url" :alt="promotion?.title" class="poster-image" />
        </div>
      </div>
    </div>

    <!-- 双栏布局 -->
    <div v-else-if="hasBothContent" class="detail-layout">
      <!-- 左侧文字内容面板 -->
      <div class="left-panel glass-card">
        <div class="promotion-header">
          <div class="flex items-center gap-4 flex-wrap mb-4">
            <span class="status-badge" :class="statusColorClass">
              {{ currentStatusText }}
            </span>
            <span v-if="promotion?.start_date && promotion?.end_date" class="date-range">
              <i class="fas fa-calendar-alt mr-2"></i>
              {{ formatDate(promotion.start_date) }} - {{ formatDate(promotion.end_date) }}
            </span>
          </div>
          <h1 class="promotion-title">{{ promotion?.title }}</h1>
          <p class="promotion-summary">{{ promotion?.summary }}</p>
        </div>

        <div v-if="descriptionParagraphs.length > 0" class="promotion-description">
          <h3 class="section-title-inner">
            <i class="fas fa-file-alt text-gradient-600"></i>
            活动详情
          </h3>
          <div class="description-content">
            <p
              v-for="(paragraph, index) in descriptionParagraphs"
              :key="index"
              class="paragraph"
              v-html="paragraph.replace(/\n/g, '<br>')"
            ></p>
          </div>
        </div>

        <div v-if="promotion?.tags?.length" class="promotion-tags">
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in promotion.tags" :key="tag" class="tag-item">
              #{{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- 右侧海报面板 -->
      <div class="right-panel glass-card">
        <h3 class="section-title-inner">
          <i class="fas fa-image text-gradient-600"></i>
          活动海报
        </h3>
        <div class="poster-container">
          <img
            :src="promotion?.poster_url"
            :alt="promotion?.title"
            class="poster-image"
            @error="handlePosterError"
          />
        </div>
      </div>
    </div>

    <!-- 纯文字展示模式 -->
    <div v-else-if="textOnly" class="text-only-layout">
      <div class="text-full glass-card">
        <div class="promotion-header">
          <div class="flex items-center gap-4 flex-wrap mb-4">
            <span class="status-badge" :class="statusColorClass">
              {{ currentStatusText }}
            </span>
            <span v-if="promotion?.start_date && promotion?.end_date" class="date-range">
              <i class="fas fa-calendar-alt mr-2"></i>
              {{ formatDate(promotion.start_date) }} - {{ formatDate(promotion.end_date) }}
            </span>
          </div>
          <h1 class="promotion-title">{{ promotion?.title }}</h1>
          <p class="promotion-summary">{{ promotion?.summary }}</p>
        </div>

        <div v-if="descriptionParagraphs.length > 0" class="promotion-description">
          <h3 class="section-title-inner">
            <i class="fas fa-file-alt text-gradient-600"></i>
            活动详情
          </h3>
          <div class="description-content">
            <p
              v-for="(paragraph, index) in descriptionParagraphs"
              :key="index"
              class="paragraph"
              v-html="paragraph.replace(/\n/g, '<br>')"
            ></p>
          </div>
        </div>

        <div v-if="promotion?.tags?.length" class="promotion-tags">
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in promotion.tags" :key="tag" class="tag-item">
              #{{ tag }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </DetailPageLayout>
</template>

<style scoped>
@import '@/styles/detail-page.css';

/* 促销特有样式 */
.promotion-header {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
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

.promotion-tags {
  padding-top: 1rem;
  border-top: 1px solid rgba(102, 126, 234, 0.1);
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
  object-fit: contain;
  border-radius: 12px;
}

/* 纯海报布局 */
.poster-only-layout {
  max-width: 800px;
  margin: 0 auto;
}

.poster-full {
  padding: 2rem;
}

.poster-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
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

/* 纯文字布局 */
.text-only-layout {
  display: flex;
  justify-content: center;
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

/* 响应式 */
@media (max-width: 768px) {
  .promotion-title {
    font-size: 1.25rem;
  }
}
</style>
