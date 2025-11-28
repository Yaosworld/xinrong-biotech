<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Promotion } from '@/types'

interface Props {
  promotion: Promotion
  highlightKeyword?: string
}

const props = withDefaults(defineProps<Props>(), {
  highlightKeyword: ''
})

const router = useRouter()
const imageError = ref(false)

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
      <img
        v-if="!imageError && promotion.image_url"
        :src="promotion.image_url"
        :alt="promotion.title"
        class="w-full h-full object-cover"
        @error="imageError = true"
      />
      <div v-else class="w-full h-full bg-gradient-card flex items-center justify-center">
        <i :class="promotion.icon_class || 'fas fa-bullhorn'" class="text-4xl text-primary-300"></i>
      </div>
      
      <!-- 状态标签 -->
      <div class="absolute top-3 left-3 flex flex-col gap-2">
        <span v-if="promotion.is_featured" class="status-badge status-badge-top">置顶</span>
        <span v-if="promotion.priority && promotion.priority <= 3" class="status-badge status-badge-hot">热门</span>
      </div>
      
      <!-- 结束标签 -->
      <div v-if="promotion.status === 'ended'" class="absolute top-3 right-3">
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
