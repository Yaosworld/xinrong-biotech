<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Brand } from '@/types'

interface Props {
  brand: Brand
  showDescription?: boolean
  highlightKeyword?: string
}

const props = withDefaults(defineProps<Props>(), {
  showDescription: false,
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

// 点击处理
const handleClick = () => {
  if (props.brand.route) {
    router.push(props.brand.route)
  } else if (props.brand.website_url) {
    window.open(props.brand.website_url, '_blank')
  }
}
</script>

<template>
  <article
    class="card-base p-6 cursor-pointer group text-center"
    @click="handleClick"
  >
    <!-- Logo -->
    <div class="relative w-24 h-24 mx-auto mb-4 rounded-xl bg-dark-50 flex items-center justify-center overflow-hidden">
      <img
        v-if="!imageError && brand.logo_url"
        :src="brand.logo_url"
        :alt="brand.show_name"
        class="max-w-full max-h-full object-contain p-2 transition-transform duration-300 group-hover:scale-110"
        loading="lazy"
        @error="handleImageError"
      />
      <div v-else class="text-3xl font-bold text-dark-300">
        {{ brand.show_name.charAt(0) }}
      </div>
      
      <!-- 自主品牌标识 -->
      <div
        v-if="brand.is_own"
        class="absolute -top-1 -right-1 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center"
      >
        <i class="fas fa-check text-white text-xs"></i>
      </div>
      
      <!-- 推荐标识 -->
      <div
        v-else-if="brand.is_featured"
        class="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center"
      >
        <i class="fas fa-star text-white text-xs"></i>
      </div>
    </div>
    
    <!-- 品牌名称 -->
    <h3
      class="text-lg font-semibold text-dark-800 mb-1 group-hover:text-primary-600 transition-colors"
      v-html="highlightText(brand.show_name)"
    ></h3>
    
    <!-- 品牌分类 -->
    <p v-if="brand.category" class="text-sm text-dark-500 mb-2">
      {{ brand.category }}
    </p>
    
    <!-- 国家/地区 -->
    <p v-if="brand.country" class="text-xs text-dark-400">
      <i class="fas fa-globe mr-1"></i>
      {{ brand.country }}
    </p>
    
    <!-- 品牌描述 -->
    <p
      v-if="showDescription && brand.description"
      class="mt-3 text-sm text-dark-500 line-clamp-2"
      v-html="highlightText(brand.description)"
    ></p>
    
    <!-- 产品数量 -->
    <div
      v-if="brand.product_count"
      class="mt-3 text-xs text-primary-600"
    >
      <i class="fas fa-box mr-1"></i>
      {{ brand.product_count }} 个产品
    </div>
  </article>
</template>

