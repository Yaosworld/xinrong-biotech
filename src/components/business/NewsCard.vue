<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePromotionStore } from '@/stores/promotionStore'
import type { Promotion } from '@/types'

interface Props {
  promotion: Promotion
  highlightKeyword?: string
}

const props = withDefaults(defineProps<Props>(), {
  highlightKeyword: ''
})

const router = useRouter()
const promotionStore = usePromotionStore()
const imageError = ref(false)

// 获取促销活动图片路径（仿照商品中心）
const promotionImagePath = computed(() => {
  return promotionStore.getPromotionImagePath(props.promotion)
})

// 高亮关键词
const highlightText = (text: string) => {
  if (!props.highlightKeyword || !text) return text
  
  const keywords = props.highlightKeyword
    .trim()
    .split(/\s+/)
    .filter(k => k.length > 0)
    .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  
  if (keywords.length === 0) return text
  
  let result = text
  keywords.forEach(keyword => {
    const regex = new RegExp(`(${keyword})`, 'gi')
    result = result.replace(regex, '<mark class="search-highlight">$1</mark>')
  })
  
  return result
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-')
}

// 格式化日期范围
const formatDateRange = (start: string, end: string) => {
  const s = new Date(start)
  const e = new Date(end)
  const format = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  return `${format(s)} - ${format(e)}`
}

// 状态类
const statusClass = computed(() => {
  switch (props.promotion.status) {
    case 'active': return 'status-badge-active'
    case 'coming': return 'status-badge-coming'
    case 'ended': return 'status-badge-ended'
    default: return ''
  }
})

// 导航到详情页
const goToDetail = () => {
  router.push(`/news/promotion/${props.promotion.id}`)
}
</script>

<template>
  <article class="news-card-horizontal cursor-pointer" @click="goToDetail">
    <!-- 左侧图片 -->
    <div class="news-card-image">
      <div class="image-wrapper">
        <img
          v-if="!imageError && promotionImagePath"
          :src="promotionImagePath"
          :alt="promotion.title"
          @error="imageError = true"
        />
        <div v-else class="news-card-fallback flex items-center justify-center">
          <i :class="promotion.icon_class || 'fas fa-bullhorn'" class="text-4xl text-primary-300"></i>
        </div>

        <!-- 高级蒙版层 -->
        <div v-if="!imageError" class="image-overlay"></div>
      </div>
      
      <!-- 状态标签 -->
      <div class="absolute top-3 left-3 flex flex-col gap-2 z-10">
        <span v-if="promotion.is_featured" class="status-badge status-badge-top">置顶</span>
        <span v-if="promotion.priority && promotion.priority <= 3" class="status-badge status-badge-hot">热门</span>
      </div>
      
      <!-- 结束标签 -->
      <div v-if="promotion.status === 'ended'" class="absolute top-3 right-3 z-10">
        <span class="status-badge status-badge-ended">活动已结束</span>
      </div>
    </div>
    
    <!-- 右侧内容 -->
    <div class="news-card-content">
      <div>
        <!-- 发布日期 -->
        <div class="flex items-center justify-end text-sm text-dark-400 mb-2">
          <i class="fas fa-calendar-alt mr-1.5"></i>
          发布：{{ promotion.start_date ? formatDate(promotion.start_date) : '-' }}
        </div>
        
        <!-- 标题 -->
        <h3
          class="text-lg font-semibold text-dark-800 mb-2 line-clamp-1"
          v-html="highlightText(promotion.title)"
        ></h3>
        
        <!-- 描述 -->
        <p
          class="text-dark-500 text-sm line-clamp-2 mb-4"
          v-html="highlightText(promotion.summary)"
        ></p>
        
        <!-- 标签 -->
        <div class="flex flex-wrap gap-2 mb-4">
          <span
            v-for="tag in (promotion.tags || []).slice(0, 3)"
            :key="tag"
            class="tag-pill"
          >
            {{ tag }}
          </span>
        </div>
      </div>
      
      <!-- 底部信息 -->
      <div class="flex items-center justify-end text-sm">
        <span class="text-primary-600">
          活动时间：{{ promotion.start_date && promotion.end_date ? formatDateRange(promotion.start_date, promotion.end_date) : '-' }}
        </span>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* 资讯卡片容器 - 固定高度 */
.news-card-horizontal {
  @apply w-full bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden;
  display: flex;
  height: 200px; /* 固定高度确保所有卡片一致 */

  /* 整个卡片的黑色边框 - 参考商品卡片 */
  border: 1px solid rgba(0, 0, 0, 0.15);
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1), /* 原有阴影 */
    0 1px 2px 0 rgba(0, 0, 0, 0.06); /* 原有阴影 */
}

/* 图片区域 - 固定宽度和高度 */
.news-card-image {
  @apply relative flex-shrink-0;
  width: 280px; /* 固定宽度 */
  height: 200px; /* 与卡片总高度一致 */
  background-color: #fff; /* 确保白色背景与内容区一致 */
}

.image-wrapper {
  @apply w-full h-full overflow-hidden;
  position: relative;
}

/* 图片填满容器并保持比例 */
.image-wrapper img {
  @apply w-full h-full;
  object-fit: cover; /* 关键：图片填满容器，保持比例，可能裁剪 */
  object-position: center; /* 图片居中显示 */
}

/* 备用显示区域 */
.news-card-fallback {
  @apply w-full h-full bg-gradient-to-br from-primary-50 to-primary-100;
}

/* 高级蒙版层 - 毛玻璃效果 */
.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  /* 黑色透明蒙版 */
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.1) 0%,    /* 右上角最透明 */
    rgba(0, 0, 0, 0.2) 25%,   /* 右侧 */
    rgba(0, 0, 0, 0.25) 50%,  /* 底部 */
    rgba(0, 0, 0, 0.2) 75%,   /* 左侧 */
    rgba(0, 0, 0, 0.15) 100%  /* 左上角 */
  );

  /* 磨玻璃效果 */
  backdrop-filter: blur(2px) saturate(1.2);
  -webkit-backdrop-filter: blur(2px) saturate(1.2);

  /* 微妙的渐变叠加效果 */
  background-blend-mode: multiply;

  /* 边框光晕效果 */
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 0 20px rgba(0, 0, 0, 0.1);

  /* 平滑过渡 */
  transition: all 0.3s ease;

  /* 确保覆盖在图片上方 */
  z-index: 1;
}

/* 内容区域 - 占据剩余空间 */
.news-card-content {
  @apply flex flex-col flex-1 p-6 min-w-0;
  height: 200px; /* 与图片区域高度一致 */
}

/* 确保内容区域适配 */
.news-card-content > div:first-child {
  @apply flex-1 overflow-hidden;
}

/* 标签样式 */
.tag-pill {
  @apply inline-block px-3 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full;
}

/* 状态标签 */
.status-badge {
  @apply inline-block px-2 py-1 text-xs font-semibold rounded-full;
}

/* 资讯卡片悬停效果 */
.news-card-horizontal:hover {
  /* 增强边框和阴影 - 参考商品卡片的subtle风格 */
  border-color: rgba(0, 0, 0, 0.2);
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1), /* 增强阴影 */
    0 2px 4px -1px rgba(0, 0, 0, 0.06), /* 增强阴影 */
    0 0 0 1px rgba(139, 92, 246, 0.08); /* 主色光晕 - 类似商品卡片 */
}

/* 悬停效果 - 蒙版层变化 */
.news-card-horizontal:hover .image-overlay {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.05) 0%,
    rgba(0, 0, 0, 0.15) 25%,
    rgba(0, 0, 0, 0.2) 50%,
    rgba(0, 0, 0, 0.15) 75%,
    rgba(0, 0, 0, 0.1) 100%
  );

  /* 增强磨玻璃效果 */
  backdrop-filter: blur(3px) saturate(1.3);
  -webkit-backdrop-filter: blur(3px) saturate(1.3);

  /* 添加光晕效果 */
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.15),
    inset 0 0 30px rgba(0, 0, 0, 0.15),
    0 0 20px rgba(0, 0, 0, 0.1);
}

.status-badge-top {
  @apply bg-yellow-100 text-yellow-800;
  backdrop-filter: blur(1px);
  box-shadow: 0 2px 8px rgba(250, 204, 21, 0.3);
}

.status-badge-hot {
  @apply bg-red-100 text-red-800;
  backdrop-filter: blur(1px);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.status-badge-ended {
  @apply bg-gray-100 text-gray-800;
  backdrop-filter: blur(1px);
  box-shadow: 0 2px 8px rgba(156, 163, 175, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .news-card-horizontal {
    height: auto;
    flex-direction: column;
  }

  .news-card-image {
    width: 100%;
    height: 180px; /* 移动端稍小的图片高度 */
  }

  .news-card-content {
    height: auto;
    min-height: 200px; /* 确保内容区有足够高度 */
  }
}

@media (max-width: 640px) {
  .news-card-image {
    height: 160px;
  }

  .news-card-content {
    min-height: 180px;
    padding: 1rem;
  }
}
</style>
