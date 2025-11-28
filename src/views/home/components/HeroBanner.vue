<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goToProducts = () => {
  router.push('/products')
}

const goToAbout = () => {
  router.push('/about')
}
</script>

<template>
  <section class="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
    <!-- 背景装饰 -->
    <div class="absolute inset-0 overflow-hidden">
      <!-- 动态背景效果 -->
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-tech-500/10 rounded-full blur-3xl animate-pulse-slow" style="animation-delay: 1s;"></div>
      <div class="absolute top-1/2 left-1/2 w-64 h-64 bg-primary-400/5 rounded-full blur-2xl animate-float"></div>
      
      <!-- DNA 螺旋装饰线条 -->
      <svg class="absolute right-0 top-0 h-full w-1/3 opacity-10" viewBox="0 0 400 800" fill="none">
        <path d="M200 0 Q100 100 200 200 T200 400 T200 600 T200 800" stroke="url(#gradient1)" stroke-width="2" fill="none"/>
        <path d="M200 0 Q300 100 200 200 T200 400 T200 600 T200 800" stroke="url(#gradient2)" stroke-width="2" fill="none"/>
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#14b8a6"/>
            <stop offset="100%" stop-color="#3b82f6"/>
          </linearGradient>
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#3b82f6"/>
            <stop offset="100%" stop-color="#14b8a6"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
    
    <!-- 内容区 -->
    <div class="container-base relative z-10 py-20">
      <div class="max-w-3xl">
        <!-- 标签 -->
        <div class="inline-flex items-center px-4 py-2 rounded-full bg-primary-500/20 text-primary-400 text-sm font-medium mb-6 animate-fade-in">
          <i class="fas fa-dna mr-2"></i>
          <span>生物科技 · 创新未来</span>
        </div>
        
        <!-- 主标题 -->
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold font-display text-white leading-tight mb-6 animate-slide-up">
          探索生命科学的
          <span class="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-tech-400">
            无限可能
          </span>
        </h1>
        
        <!-- 副标题 -->
        <p class="text-lg md:text-xl text-dark-300 leading-relaxed mb-8 animate-slide-up" style="animation-delay: 0.1s;">
          我们致力于为科研机构和医疗企业提供高品质的科学仪器、实验耗材和生物试剂，
          以专业的服务和创新的技术，助力您的科研事业迈向新的高度。
        </p>
        
        <!-- 按钮组 -->
        <div class="flex flex-wrap gap-4 animate-slide-up" style="animation-delay: 0.2s;">
          <button
            class="btn-primary text-lg px-8 py-4"
            @click="goToProducts"
          >
            <i class="fas fa-flask mr-2"></i>
            探索产品
          </button>
          <button
            class="btn-outline border-white/30 text-white hover:bg-white hover:text-dark-900 text-lg px-8 py-4"
            @click="goToAbout"
          >
            <i class="fas fa-info-circle mr-2"></i>
            了解我们
          </button>
        </div>
        
        <!-- 统计数据 -->
        <div class="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-white/10 animate-fade-in" style="animation-delay: 0.3s;">
          <div>
            <div class="text-3xl md:text-4xl font-bold text-white mb-2">3000+</div>
            <div class="text-dark-400">产品种类</div>
          </div>
          <div>
            <div class="text-3xl md:text-4xl font-bold text-white mb-2">100+</div>
            <div class="text-dark-400">合作品牌</div>
          </div>
          <div>
            <div class="text-3xl md:text-4xl font-bold text-white mb-2">50+</div>
            <div class="text-dark-400">产品分类</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部波浪 -->
    <div class="absolute bottom-0 left-0 right-0">
      <svg viewBox="0 0 1440 120" fill="none" class="w-full">
        <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
      </svg>
    </div>
  </section>
</template>

