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

// 获取促销活动封面图片路径（仿照商品中心）
const promotionCoverPath = computed(() => {
  return promotionStore.getPromotionCoverPath(props.promotion)
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

// 时间状态样式类
const timeStatusClass = computed(() => {
  switch (props.promotion.status) {
    case 'endingSoon': return 'time-status-ending-soon'  // 即将结束
    case 'active': return 'time-status-active'           // 正在进行
    case 'coming': return 'time-status-coming'           // 即将开始
    case 'ended': return 'time-status-ended'             // 已结束
    default: return ''
  }
})

// 时间状态图标
const timeStatusIcon = computed(() => {
  switch (props.promotion.status) {
    case 'endingSoon': return 'fas fa-hourglass-end'    // 即将结束
    case 'active': return 'fas fa-play-circle'          // 正在进行
    case 'coming': return 'fas fa-clock'                // 即将开始
    case 'ended': return 'fas fa-check-circle'          // 已结束
    default: return 'fas fa-info-circle'
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
          v-if="!imageError && promotionCoverPath"
          :src="promotionCoverPath"
          :alt="promotion.title"
          @error="imageError = true"
        />
        <div v-else class="news-card-fallback flex items-center justify-center">
          <i :class="promotion.icon_class || 'fas fa-bullhorn'" class="text-4xl text-gradient-300"></i>
        </div>

        <!-- 高级蒙版层 -->
        <div v-if="!imageError" class="image-overlay"></div>
      </div>
      
    </div>
    
    <!-- 右侧内容 -->
    <div class="news-card-content">
      <div>
        <!-- 发布日期和状态标签 -->
        <div class="flex items-center justify-between text-sm mb-2">
          <!-- 发布日期（左对齐） -->
          <span class="text-dark-400">
            <i class="fas fa-calendar-alt mr-1.5"></i>
            发布：{{ promotion.start_date ? formatDate(promotion.start_date) : '-' }}
          </span>
          <!-- 状态标签（右对齐） -->
          <span :class="['time-status-badge', timeStatusClass]">
            <i :class="timeStatusIcon" class="mr-1"></i>
            {{ promotion.statusText }}
          </span>
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
        <span class="text-gradient-600">
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
  @apply w-full h-full bg-gradient-to-br from-gradient-50 to-gradient-100;
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
  @apply inline-block px-3 py-1 text-xs font-medium bg-gradient-100 text-gradient-700 rounded-full;
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

/* 时间状态标签基础样式 */
.time-status-badge {
  @apply inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full;
}

/* 即将结束 - 红橙色系，表示紧迫 */
.time-status-ending-soon {
  @apply bg-orange-100 text-orange-700;
  box-shadow: 0 1px 4px rgba(234, 88, 12, 0.2);
}

/* 正在进行 - 绿色系，表示活跃 */
.time-status-active {
  @apply bg-green-100 text-green-700;
  box-shadow: 0 1px 4px rgba(22, 163, 74, 0.2);
}

/* 即将开始 - 蓝色系，表示等待 */
.time-status-coming {
  @apply bg-blue-100 text-blue-700;
  box-shadow: 0 1px 4px rgba(37, 99, 235, 0.2);
}

/* 已结束 - 灰色系，表示完成 */
.time-status-ended {
  @apply bg-gray-100 text-gray-500;
  box-shadow: 0 1px 4px rgba(156, 163, 175, 0.2);
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
