<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-dark-50 px-4">
    <div class="text-center max-w-md">
      <!-- 404 图标 -->
      <div class="relative mb-8">
        <div class="text-[180px] font-bold text-dark-200 leading-none select-none">
          404
        </div>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center">
            <i class="fas fa-search text-4xl text-primary-500"></i>
          </div>
        </div>
      </div>
      
      <!-- 标题 -->
      <h1 class="text-3xl font-bold text-dark-800 mb-4">
        页面未找到
      </h1>
      
      <!-- 描述 -->
      <p class="text-dark-500 mb-8">
        抱歉，您访问的页面不存在或已被移动。请检查网址是否正确，或返回首页浏览其他内容。
      </p>
      
      <!-- 按钮组 -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          class="btn-primary w-full sm:w-auto"
          @click="goHome"
        >
          <i class="fas fa-home mr-2"></i>
          返回首页
        </button>
        <button
          class="btn-secondary w-full sm:w-auto"
          @click="goBack"
        >
          <i class="fas fa-arrow-left mr-2"></i>
          返回上页
        </button>
      </div>
    </div>
  </div>
</template>

