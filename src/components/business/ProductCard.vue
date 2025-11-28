<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCategoryStore } from '@/stores/categoryStore'
import type { Product } from '@/types'

interface Props {
  product: Product
  showCategory?: boolean
  highlightKeyword?: string
}

const props = withDefaults(defineProps<Props>(), {
  showCategory: true,
  highlightKeyword: ''
})

const router = useRouter()
const categoryStore = useCategoryStore()

// 图片加载状态
const imageError = ref(false)

// 获取分类图片路径
const imagePath = computed(() => {
  return categoryStore.getCategoryImagePath(props.product.categoryId)
})

// 获取分类名称
const categoryName = computed(() => {
  return categoryStore.getCategoryName(props.product.categoryId)
})

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

// 导航到产品详情
const goToDetail = () => {
  router.push(`/products/${props.product.id}`)
}

// 计算折扣百分比
const discountPercentage = computed(() => {
  if (props.product.originalPrice && props.product.currentPrice) {
    const discount = (1 - props.product.currentPrice / props.product.originalPrice) * 100
    return Math.round(discount)
  }
  return 0
})
</script>

<template>
  <article
    class="card-base cursor-pointer group"
    @click="goToDetail"
  >
    <!-- 产品图片 -->
    <div class="relative aspect-[4/3] bg-dark-100 overflow-hidden">
      <img
        v-if="!imageError"
        :src="imagePath"
        :alt="product.name"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
        @error="handleImageError"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <i class="fas fa-image text-4xl text-dark-300"></i>
      </div>
      
      <!-- 促销标签 -->
      <div
        v-if="discountPercentage > 0"
        class="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded"
      >
        -{{ discountPercentage }}%
      </div>
      
      <!-- 分类标签 -->
      <div
        v-if="showCategory"
        class="absolute bottom-3 left-3 px-3 py-1 bg-dark-900/70 backdrop-blur-sm text-white text-xs rounded-full"
      >
        {{ categoryName }}
      </div>
    </div>
    
    <!-- 产品信息 -->
    <div class="p-4">
      <!-- 品牌 -->
      <div v-if="product.brand" class="text-xs text-primary-600 font-medium mb-1">
        {{ product.brand }}
      </div>
      
      <!-- 产品名称 -->
      <h3
        class="text-base font-semibold text-dark-800 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors"
        v-html="highlightText(product.name)"
      ></h3>
      
      <!-- 规格 -->
      <p
        class="text-sm text-dark-500 line-clamp-2 mb-3"
        v-html="highlightText(product.specs)"
      ></p>
      
      <!-- 价格 -->
      <div v-if="product.currentPrice || product.originalPrice" class="flex items-baseline space-x-2">
        <span
          v-if="product.currentPrice"
          class="text-lg font-bold text-primary-600"
        >
          ¥{{ product.currentPrice.toLocaleString() }}
        </span>
        <span
          v-if="product.originalPrice && product.currentPrice && product.currentPrice < product.originalPrice"
          class="text-sm text-dark-400 line-through"
        >
          ¥{{ product.originalPrice.toLocaleString() }}
        </span>
      </div>
      
      <!-- 查看详情按钮 -->
      <div class="mt-4 flex items-center text-sm text-primary-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        <span>查看详情</span>
        <i class="fas fa-arrow-right ml-2 transform group-hover:translate-x-1 transition-transform"></i>
      </div>
    </div>
  </article>
</template>

