<script setup lang="ts">
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

// 获取分类名称
const categoryName = categoryStore.getCategoryName(props.product.categoryId)

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
</script>

<template>
  <article class="product-card" @click="goToDetail">
    <!-- 产品图片区（渐变背景） -->
    <div class="product-card-image"></div>
    
    <!-- 产品信息 -->
    <div class="product-card-content">
      <!-- 产品名称 -->
      <h3 
        class="product-card-title"
        v-html="highlightText(product.name)"
      ></h3>
      
      <!-- 产品信息网格 -->
      <div class="product-card-info">
        <span class="product-card-label">品牌：</span>
        <span 
          class="product-card-value"
          v-html="product.brand ? highlightText(product.brand) : '-'"
        ></span>
        
        <span class="product-card-label">货号：</span>
        <span 
          class="product-card-value"
          v-html="product.sku ? highlightText(product.sku) : '-'"
        ></span>
        
        <span class="product-card-label">分类：</span>
        <span class="product-card-value">{{ categoryName }}</span>
        
        <span class="product-card-label">规格：</span>
        <span 
          class="product-card-value line-clamp-1"
          v-html="product.specs ? highlightText(product.specs) : '-'"
        ></span>
      </div>
    </div>
  </article>
</template>
