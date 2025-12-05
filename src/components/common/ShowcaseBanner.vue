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
    <!-- 分子粒子群动画 -->
    <div class="molecule-particles">
      <div class="particle particle-1"></div>
      <div class="particle particle-2"></div>
      <div class="particle particle-3"></div>
      <div class="particle particle-4"></div>
      <div class="particle particle-5"></div>
      <div class="particle particle-6"></div>
      <div class="particle particle-7"></div>
      <div class="particle particle-8"></div>
      <div class="particle particle-9"></div>
      <div class="particle particle-10"></div>
      <div class="particle particle-11"></div>
      <div class="particle particle-12"></div>
      <div class="particle particle-13"></div>
      <div class="particle particle-14"></div>
      <div class="particle particle-15"></div>
      <div class="particle particle-16"></div>
      <div class="particle particle-17"></div>
      <div class="particle particle-18"></div>
      <div class="particle particle-19"></div>
      <div class="particle particle-20"></div>
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

/* 分子粒子群样式 */
.molecule-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.5), 0 0 30px rgba(255, 255, 255, 0.25);
}

/* 随机分布的粒子位置和运动 */
.particle-1 { top: 15%; left: 20%; animation: randomFloat1 18s ease-in-out infinite; }
.particle-2 { top: 25%; left: 85%; animation: randomFloat2 22s ease-in-out infinite; }
.particle-3 { top: 35%; left: 10%; animation: randomFloat3 16s ease-in-out infinite; }
.particle-4 { top: 45%; left: 75%; animation: randomFloat4 20s ease-in-out infinite; }
.particle-5 { top: 55%; left: 35%; animation: randomFloat5 24s ease-in-out infinite; }
.particle-6 { top: 65%; left: 90%; animation: randomFloat6 14s ease-in-out infinite; }
.particle-7 { top: 75%; left: 15%; animation: randomFloat7 26s ease-in-out infinite; }
.particle-8 { top: 85%; left: 60%; animation: randomFloat8 12s ease-in-out infinite; }
.particle-9 { top: 10%; left: 50%; animation: randomFloat9 19s ease-in-out infinite; }
.particle-10 { top: 30%; left: 65%; animation: randomFloat10 17s ease-in-out infinite; }
.particle-11 { top: 50%; left: 5%; animation: randomFloat11 21s ease-in-out infinite; }
.particle-12 { top: 70%; left: 45%; animation: randomFloat12 15s ease-in-out infinite; }
.particle-13 { top: 20%; left: 80%; animation: randomFloat13 23s ease-in-out infinite; }
.particle-14 { top: 40%; left: 25%; animation: randomFloat14 13s ease-in-out infinite; }
.particle-15 { top: 60%; left: 70%; animation: randomFloat15 25s ease-in-out infinite; }
.particle-16 { top: 80%; left: 30%; animation: randomFloat16 11s ease-in-out infinite; }
.particle-17 { top: 5%; left: 40%; animation: randomFloat17 27s ease-in-out infinite; }
.particle-18 { top: 90%; left: 55%; animation: randomFloat18 18s ease-in-out infinite; }
.particle-19 { top: 12%; left: 95%; animation: randomFloat19 16s ease-in-out infinite; }
.particle-20 { top: 88%; left: 8%; animation: randomFloat20 22s ease-in-out infinite; }

/* 分子粒子动画关键帧 */
@keyframes randomFloat1 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; } 25% { transform: translate(30px, -25px) scale(1.2); opacity: 0.9; } 50% { transform: translate(-20px, 40px) scale(0.8); opacity: 0.6; } 75% { transform: translate(45px, 15px) scale(1.1); opacity: 0.8; } }
@keyframes randomFloat2 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; } 20% { transform: translate(-35px, 30px) scale(1.3); opacity: 0.7; } 40% { transform: translate(25px, -40px) scale(0.9); opacity: 0.9; } 60% { transform: translate(-15px, -20px) scale(1.1); opacity: 0.5; } 80% { transform: translate(40px, 35px) scale(0.7); opacity: 0.8; } }
@keyframes randomFloat3 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.7; } 33% { transform: translate(50px, 20px) scale(1.4); opacity: 0.4; } 66% { transform: translate(-30px, -35px) scale(0.6); opacity: 0.9; } }
@keyframes randomFloat4 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; } 25% { transform: translate(-25px, 45px) scale(1.2); opacity: 0.8; } 50% { transform: translate(35px, -15px) scale(0.8); opacity: 0.6; } 75% { transform: translate(-40px, -30px) scale(1.3); opacity: 0.9; } }
@keyframes randomFloat5 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.8; } 20% { transform: translate(20px, -50px) scale(0.7); opacity: 0.5; } 40% { transform: translate(-45px, 25px) scale(1.5); opacity: 0.9; } 60% { transform: translate(30px, 40px) scale(0.9); opacity: 0.7; } 80% { transform: translate(-10px, -20px) scale(1.1); opacity: 0.6; } }
@keyframes randomFloat6 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; } 50% { transform: translate(-60px, -25px) scale(1.6); opacity: 0.9; } }
@keyframes randomFloat7 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.7; } 16% { transform: translate(40px, 30px) scale(1.2); opacity: 0.4; } 33% { transform: translate(-20px, -40px) scale(0.8); opacity: 0.9; } 50% { transform: translate(55px, -10px) scale(1.4); opacity: 0.6; } 66% { transform: translate(-35px, 45px) scale(0.6); opacity: 0.8; } 83% { transform: translate(15px, -25px) scale(1.1); opacity: 0.5; } }
@keyframes randomFloat8 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; } 50% { transform: translate(25px, 35px) scale(1.3); opacity: 0.9; } }
@keyframes randomFloat9 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; } 30% { transform: translate(-40px, 20px) scale(1.2); opacity: 0.7; } 70% { transform: translate(30px, -35px) scale(0.9); opacity: 0.9; } }
@keyframes randomFloat10 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.8; } 25% { transform: translate(45px, -20px) scale(0.7); opacity: 0.5; } 75% { transform: translate(-25px, 40px) scale(1.4); opacity: 0.9; } }
@keyframes randomFloat11 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; } 40% { transform: translate(50px, 30px) scale(1.1); opacity: 0.8; } 80% { transform: translate(-30px, -25px) scale(0.8); opacity: 0.6; } }
@keyframes randomFloat12 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.7; } 33% { transform: translate(-35px, -40px) scale(1.3); opacity: 0.4; } 66% { transform: translate(40px, 25px) scale(0.9); opacity: 0.9; } }
@keyframes randomFloat13 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; } 20% { transform: translate(25px, 45px) scale(1.5); opacity: 0.7; } 60% { transform: translate(-50px, -15px) scale(0.6); opacity: 0.9; } }
@keyframes randomFloat14 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.8; } 50% { transform: translate(-20px, 30px) scale(1.2); opacity: 0.5; } }
@keyframes randomFloat15 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; } 25% { transform: translate(35px, -45px) scale(0.8); opacity: 0.9; } 50% { transform: translate(-40px, 20px) scale(1.4); opacity: 0.6; } 75% { transform: translate(20px, 35px) scale(1.1); opacity: 0.8; } }
@keyframes randomFloat16 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.7; } 50% { transform: translate(45px, -30px) scale(1.3); opacity: 0.5; } }
@keyframes randomFloat17 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; } 14% { transform: translate(-25px, 40px) scale(1.1); opacity: 0.8; } 28% { transform: translate(50px, -20px) scale(0.7); opacity: 0.4; } 42% { transform: translate(-35px, -35px) scale(1.5); opacity: 0.9; } 56% { transform: translate(30px, 25px) scale(0.9); opacity: 0.7; } 70% { transform: translate(-15px, 45px) scale(1.2); opacity: 0.6; } 84% { transform: translate(40px, -40px) scale(0.8); opacity: 0.8; } }
@keyframes randomFloat18 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; } 40% { transform: translate(-30px, 25px) scale(1.2); opacity: 0.9; } 80% { transform: translate(35px, -35px) scale(0.9); opacity: 0.5; } }
@keyframes randomFloat19 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.8; } 33% { transform: translate(20px, 50px) scale(1.4); opacity: 0.4; } 66% { transform: translate(-45px, -25px) scale(0.7); opacity: 0.9; } }
@keyframes randomFloat20 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; } 25% { transform: translate(55px, 15px) scale(0.8); opacity: 0.8; } 50% { transform: translate(-30px, -40px) scale(1.3); opacity: 0.6; } 75% { transform: translate(25px, 45px) scale(1.1); opacity: 0.9; } }
</style>
