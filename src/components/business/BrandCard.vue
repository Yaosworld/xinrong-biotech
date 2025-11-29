<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Brand } from '@/types'

interface Props {
  brand: Brand
  highlightKeyword?: string
}

const props = withDefaults(defineProps<Props>(), {
  highlightKeyword: ''
})

const router = useRouter()
const imageError = ref(false)

// 获取品牌名称
const brandName = computed(() => props.brand.name || props.brand.show_name || '')

// 获取品牌首字母或首字
const brandInitial = computed(() => {
  const name = brandName.value
  // 如果是中文，取第一个字
  if (/[\u4e00-\u9fa5]/.test(name.charAt(0))) {
    return name.charAt(0)
  }
  // 否则取首字母大写
  return name.charAt(0).toUpperCase()
})

// 随机背景颜色
const bgColorClass = computed(() => {
  const colors = [
    'bg-primary-500',
    'bg-purple-500',
    'bg-indigo-500',
    'bg-blue-500',
    'bg-cyan-500',
    'bg-teal-500'
  ]
  const index = brandName.value.charCodeAt(0) % colors.length
  return colors[index]
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

// 导航到品牌详情页
const goToBrand = () => {
  router.push(`/brands/${props.brand.id}`)
}
</script>

<template>
  <article class="brand-card" @click="goToBrand">
    <!-- 品牌Logo -->
    <div class="brand-card-logo">
      <img
        v-if="!imageError && brand.logo_url"
        :src="brand.logo_url"
        :alt="brand.name"
        class="w-full h-full object-contain"
        @error="imageError = true"
      />
      <div
        v-else
        class="w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-bold"
        :class="bgColorClass"
      >
        {{ brandInitial }}
      </div>
    </div>
    
    <!-- 品牌名称 -->
    <h3
      class="brand-card-name"
      v-html="highlightText(brandName)"
    ></h3>
  </article>
</template>
