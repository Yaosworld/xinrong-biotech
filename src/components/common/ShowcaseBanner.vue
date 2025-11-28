<script setup lang="ts">
import { computed } from 'vue'

interface StatItem {
  number: string
  label: string
  key?: string
}

interface SloganItem {
  text: string
  type?: 'primary' | 'secondary'
}

interface Props {
  // 新接口：支持多个平等标语
  slogans?: SloganItem[] | string[]
  // 旧接口：保持向后兼容
  title?: string
  subtitle?: string
  // 统计数据
  stats?: StatItem[]
}

const props = defineProps<Props>()

// 统一处理标语数据，兼容新旧接口
const displaySlogans = computed(() => {
  // 优先使用新的 slogans 接口
  if (props.slogans && props.slogans.length > 0) {
    return props.slogans.map(slogan => {
      if (typeof slogan === 'string') {
        return { text: slogan, type: 'primary' as const }
      }
      return slogan
    })
  }
  
  // 回退到旧的 title/subtitle 接口
  const result: SloganItem[] = []
  if (props.title) {
    result.push({ text: props.title, type: 'primary' })
  }
  if (props.subtitle) {
    result.push({ text: props.subtitle, type: 'primary' })
  }
  return result
})

// 根据统计项数量计算布局
const statsGridClass = computed(() => {
  const count = props.stats?.length || 0
  if (count <= 3) return 'stats-grid-few'
  if (count <= 5) return 'stats-grid-medium'
  return 'stats-grid-many'
})
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
      <!-- 标语区 -->
      <div class="slogans-container text-center">
        <div
          v-for="(slogan, index) in displaySlogans"
          :key="index"
          class="slogan-item"
          :class="[
            slogan.type === 'secondary' ? 'slogan-secondary' : 'slogan-primary',
            { 'mt-2': index > 0 }
          ]"
        >
          {{ slogan.text }}
        </div>
      </div>
      
      <!-- 统计数据 -->
      <div 
        v-if="stats && stats.length" 
        class="showcase-stats"
        :class="statsGridClass"
      >
        <div 
          v-for="stat in stats" 
          :key="stat.key || stat.label" 
          class="showcase-stat"
        >
          <div class="showcase-stat-number">{{ stat.number }}</div>
          <div class="showcase-stat-label">{{ stat.label }}</div>
        </div>
      </div>
      
      <!-- 插槽 -->
      <slot></slot>
    </div>
  </section>
</template>

<style scoped>
/* 标语样式 */
.slogans-container {
  margin-bottom: 0.5rem;
}

.slogan-item {
  line-height: 1.4;
}

.slogan-primary {
  @apply text-3xl md:text-4xl font-bold text-white;
}

.slogan-secondary {
  @apply text-xl md:text-2xl font-semibold text-white/90;
}

/* 统计项响应式布局 */
.stats-grid-few {
  @apply gap-10 md:gap-16;
}

.stats-grid-medium {
  @apply gap-6 md:gap-10;
}

.stats-grid-many {
  @apply gap-4 md:gap-6 flex-wrap;
}
</style>
