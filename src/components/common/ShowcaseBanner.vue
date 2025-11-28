<script setup lang="ts">
interface StatItem {
  number: string
  label: string
}

interface Props {
  title: string
  subtitle?: string
  stats?: StatItem[]
}

defineProps<Props>()
</script>

<template>
  <section class="showcase-section relative">
    <!-- 装饰圆点 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="decoration-dot w-4 h-4 top-[10%] left-[5%]" style="animation-delay: 0s;"></div>
      <div class="decoration-dot w-6 h-6 top-[20%] left-[15%]" style="animation-delay: 1s;"></div>
      <div class="decoration-dot w-3 h-3 top-[15%] right-[20%]" style="animation-delay: 0.5s;"></div>
      <div class="decoration-dot w-5 h-5 top-[8%] right-[10%]" style="animation-delay: 1.5s;"></div>
      <div class="decoration-dot w-8 h-8 top-[50%] left-[3%]" style="animation-delay: 2s;"></div>
      <div class="decoration-dot w-4 h-4 bottom-[30%] left-[12%]" style="animation-delay: 0.8s;"></div>
      <div class="decoration-dot w-6 h-6 bottom-[20%] right-[8%]" style="animation-delay: 1.2s;"></div>
      <div class="decoration-dot w-3 h-3 bottom-[40%] right-[15%]" style="animation-delay: 0.3s;"></div>
      <div class="decoration-dot w-5 h-5 top-[60%] right-[5%]" style="animation-delay: 1.8s;"></div>
    </div>
    
    <div class="container-base relative z-10">
      <!-- 标题区 -->
      <div class="text-center">
        <h1 class="showcase-title">{{ title }}</h1>
        <p v-if="subtitle" class="showcase-subtitle">{{ subtitle }}</p>
      </div>
      
      <!-- 统计数据 -->
      <div v-if="stats && stats.length" class="showcase-stats">
        <div v-for="stat in stats" :key="stat.label" class="showcase-stat">
          <div class="showcase-stat-number">{{ stat.number }}</div>
          <div class="showcase-stat-label">{{ stat.label }}</div>
        </div>
      </div>
      
      <!-- 插槽 -->
      <slot></slot>
    </div>
  </section>
</template>

