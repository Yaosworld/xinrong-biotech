<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getCategoryName, getCategoryImagePath } from '@/hooks/useCategoryImage'
import DOMPurify from 'dompurify'
import type { Product } from '@/types'

interface Props {
  product: Product
  highlightKeyword?: string
}

const props = withDefaults(defineProps<Props>(), {
  highlightKeyword: ''
})

const router = useRouter()
const imageError = ref(false)

// 获取分类名称
const categoryName = computed(() => getCategoryName(props.product.categoryId))

// 获取分类图片路径
const categoryImagePath = computed(() => getCategoryImagePath(props.product.categoryId))

// 安全高亮关键词（使用DOMPurify防止XSS）
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

  // 使用DOMPurify清理HTML，只允许mark标签和class属性
  return DOMPurify.sanitize(result, {
    ALLOWED_TAGS: ['mark'],
    ALLOWED_ATTR: ['class']
  })
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
      <div class="image-wrapper">
        <img
          v-if="!imageError"
          :src="categoryImagePath"
          :alt="categoryName"
          @error="handleImageError"
        />
        <!-- 备用渐变背景 -->
        <div v-else class="product-card-fallback"></div>
      </div>
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
/* 主容器样式 */
.product-card {
  @apply bg-white rounded-2xl shadow-card overflow-hidden cursor-pointer;
  @apply transition-all duration-300 ease-out;
  @apply border border-gray-200 hover:border-gray-400;
}

.product-card:hover {
  @apply shadow-card-hover;
  transform: translateY(-6px);
}

/* 产品图片区域 */
.product-card-image {
  @apply w-full relative p-1;
  background: linear-gradient(135deg, #f4f5f7 0%, #ebedf0 50%, #f9fafc 100%);
  transition: background 0.3s ease-out;
}

.product-card:hover .product-card-image {
  background: linear-gradient(135deg, #f1f3f5 0%, #ebecf0 50%, #f7f8fa 100%);
}

.image-wrapper {
  @apply w-full rounded-md overflow-hidden bg-white p-1;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.3s ease-out;
}

.product-card:hover .image-wrapper {
  box-shadow:
    inset 0 0 0 1px rgba(139, 92, 246, 0.1),
    0 2px 8px rgba(139, 92, 246, 0.08);
}

.image-wrapper img {
  @apply w-full block transition-transform duration-300 ease-out;
  aspect-ratio: 4 / 3;
  object-fit: contain;
}

.product-card-fallback {
  @apply w-full h-full;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%);
  transition: background 0.3s ease-out;
}

.product-card:hover .product-card-fallback {
  background: linear-gradient(135deg, #e0e7ff 0%, #ede9fe 50%, #f3e8ff 100%);
}

/* 产品内容区域 */
.product-card-content {
  @apply p-4;
}

.product-card-title {
  @apply text-base font-semibold text-dark-800 mb-3 line-clamp-1;
  @apply transition-colors duration-200 ease-out;
}

.product-card:hover .product-card-title {
  @apply text-gradient-700;
}

/* 产品信息网格 */
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
  @apply text-gradient-600 font-medium flex-1 min-w-0;
}

/* 搜索高亮样式 */
:deep(.search-highlight) {
  background-color: #fef3c7;
  color: #92400e;
  padding: 0 2px;
  border-radius: 2px;
  font-weight: inherit;
}
</style>
