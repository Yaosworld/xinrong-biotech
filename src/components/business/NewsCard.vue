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

// 图片加载状态
const imageError = ref(false)

// 图片加载失败处理
const handleImageError = () => {
  imageError.value = true
}

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

// 状态颜色
const statusColorClass = computed(() => {
  switch (props.promotion.status) {
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
    month: '2-digit',
    day: '2-digit'
  })
}

// 计算折扣
const discountPercentage = computed(() => {
  if (props.promotion.original_price && props.promotion.current_price) {
    const discount = (1 - props.promotion.current_price / props.promotion.original_price) * 100
    return Math.round(discount)
  }
  return 0
})

// 导航到详情页
const goToDetail = () => {
  router.push(`/news/promotion/${props.promotion.id}`)
}
</script>

<template>
  <article
    class="card-base cursor-pointer group overflow-hidden"
    @click="goToDetail"
  >
    <!-- 活动图片 -->
    <div class="relative aspect-[16/9] bg-dark-100 overflow-hidden">
      <img
        v-if="!imageError && promotion.image_url"
        :src="promotion.image_url"
        :alt="promotion.title"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
        @error="handleImageError"
      />
      <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-tech-100">
        <i :class="promotion.icon_class || 'fas fa-bullhorn'" class="text-5xl text-primary-400"></i>
      </div>
      
      <!-- 折扣标签 -->
      <div
        v-if="promotion.discount_badge"
        class="absolute top-3 left-3 px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full"
      >
        {{ promotion.discount_badge }}
      </div>
      
      <!-- 状态标签 -->
      <div
        v-if="promotion.statusText"
        class="absolute top-3 right-3 px-3 py-1 text-sm font-medium rounded-full"
        :class="statusColorClass"
      >
        {{ promotion.statusText }}
      </div>
    </div>
    
    <!-- 活动内容 -->
    <div class="p-5">
      <!-- 日期 -->
      <div
        v-if="promotion.start_date && promotion.end_date"
        class="flex items-center text-xs text-dark-400 mb-2"
      >
        <i class="fas fa-calendar-alt mr-2"></i>
        <span>{{ formatDate(promotion.start_date) }} - {{ formatDate(promotion.end_date) }}</span>
      </div>
      
      <!-- 标题 -->
      <h3
        class="text-lg font-semibold text-dark-800 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors"
        v-html="highlightText(promotion.title)"
      ></h3>
      
      <!-- 摘要 -->
      <p
        class="text-sm text-dark-500 line-clamp-2 mb-4"
        v-html="highlightText(promotion.summary)"
      ></p>
      
      <!-- 价格信息 -->
      <div v-if="promotion.current_price || promotion.original_price" class="flex items-baseline space-x-3 mb-4">
        <span
          v-if="promotion.current_price"
          class="text-xl font-bold text-primary-600"
        >
          ¥{{ promotion.current_price.toLocaleString() }}
        </span>
        <span
          v-if="promotion.original_price && promotion.current_price && promotion.current_price < promotion.original_price"
          class="text-sm text-dark-400 line-through"
        >
          ¥{{ promotion.original_price.toLocaleString() }}
        </span>
        <span
          v-if="discountPercentage > 0"
          class="text-xs text-red-500 font-medium"
        >
          省{{ discountPercentage }}%
        </span>
      </div>
      
      <!-- 标签 -->
      <div v-if="promotion.tags?.length" class="flex flex-wrap gap-2 mb-4">
        <span
          v-for="tag in promotion.tags.slice(0, 3)"
          :key="tag"
          class="px-2 py-1 text-xs bg-dark-100 text-dark-600 rounded"
        >
          {{ tag }}
        </span>
      </div>
      
      <!-- 查看详情 -->
      <div class="flex items-center text-sm text-primary-600 font-medium">
        <span>查看详情</span>
        <i class="fas fa-arrow-right ml-2 transform group-hover:translate-x-1 transition-transform"></i>
      </div>
    </div>
  </article>
</template>

