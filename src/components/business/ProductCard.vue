<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCategoryStore } from '@/stores/categoryStore'
import type { Product } from '@/types'

interface Props {
  product: Product
  highlightKeyword?: string
}

const props = withDefaults(defineProps<Props>(), {
  highlightKeyword: ''
})

const router = useRouter()
const categoryStore = useCategoryStore()
const imageError = ref(false)

// 获取分类名称
const categoryName = computed(() => categoryStore.getCategoryName(props.product.categoryId))

// 获取分类图片路径
const categoryImagePath = computed(() => categoryStore.getCategoryImagePath(props.product.categoryId))

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

// 图片加载错误处理
const handleImageError = () => {
  imageError.value = true
}

// 导航到产品详情
const goToDetail = () => {
  router.push(`/products/${props.product.id}`)
}
</script>

<template>
  <article class="product-card" @click="goToDetail">
    <!-- 产品图片区 -->
    <div class="product-card-image">
      <img
        v-if="!imageError"
        :src="categoryImagePath"
        :alt="categoryName"
        class="w-full h-full object-cover"
        @error="handleImageError"
      />
      <!-- 备用渐变背景 -->
      <div v-else class="w-full h-full product-card-fallback"></div>
    </div>
    
    <!-- 产品信息 -->
    <div class="product-card-content">
      <!-- 产品名称 -->
      <h3 
        class="product-card-title"
        v-html="highlightText(product.name)"
      ></h3>
      
      <!-- 产品信息网格 - 紧凑布局 -->
      <div class="product-card-info">
        <div class="info-row">
          <span class="info-label">品牌：</span>
          <span 
            class="info-value"
            v-html="product.brand ? highlightText(product.brand) : '-'"
          ></span>
        </div>
        
        <div class="info-row">
          <span class="info-label">货号：</span>
          <span 
            class="info-value"
            v-html="product.sku ? highlightText(product.sku) : '-'"
          ></span>
        </div>
        
        <div class="info-row">
          <span class="info-label">分类：</span>
          <span class="info-value">{{ categoryName }}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label">规格：</span>
          <span 
            class="info-value line-clamp-1"
            v-html="product.specs ? highlightText(product.specs) : '-'"
          ></span>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.product-card-image {
  @apply aspect-[4/3] w-full relative overflow-hidden;
}

.product-card-fallback {
  background: linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 50%, #f3e8ff 100%);
}

.product-card:hover .product-card-fallback {
  background: linear-gradient(135deg, #c7d2fe 0%, #c4b5fd 50%, #e9d5ff 100%);
}

.product-card-info {
  @apply space-y-1.5 text-sm;
}

.info-row {
  @apply flex items-baseline;
}

.info-label {
  @apply text-dark-400 flex-shrink-0;
  width: 3rem;
}

.info-value {
  @apply text-primary-600 font-medium flex-1 min-w-0;
}
</style>
