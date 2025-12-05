<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Brand } from '@/types'

interface Props {
  brand: Brand
}

const props = defineProps<Props>()

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
    'bg-gradient-600',
    'bg-purple-500',
    'bg-indigo-500',
    'bg-blue-500',
    'bg-cyan-500',
    'bg-teal-500'
  ]
  const index = brandName.value.charCodeAt(0) % colors.length
  return colors[index]
})


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
        class="brand-logo-img"
        @error="imageError = true"
      />
      <div
        v-else
        class="brand-logo-placeholder"
        :class="bgColorClass"
      >
        {{ brandInitial }}
      </div>
    </div>

    <!-- 品牌名称 -->
    <h3 class="brand-card-name">
      {{ brandName }}
    </h3>
  </article>
</template>

<style scoped>
.brand-card {
  @apply flex flex-col items-center bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-gradient-200;
  width: 200px;
  height: 140px;
}

.brand-card-logo {
  @apply flex items-center justify-center;
  width: 100%;
  height: 100px;
}

.brand-logo-img {
  @apply w-full h-full object-contain;
  max-width: 100%;
  max-height: 100%;
}

.brand-logo-placeholder {
  @apply w-full h-full rounded-t-lg flex items-center justify-center text-white text-2xl font-bold;
}

.brand-card-name {
  @apply text-sm font-medium text-gray-800 text-center py-2 px-3 leading-tight;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
