<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBrandStore } from '@/stores/brandStore'
import ShowcaseBanner from '@/components/common/ShowcaseBanner.vue'
import BrandCard from '@/components/business/BrandCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const brandStore = useBrandStore()

// 本地横幅标语
const brandSlogans = [
  '拥有自主品牌，提供高品质产品与专业解决方案',
  '代理全球知名品牌，满足您多样化以及个性化的实验需求'
]

// 默认统计数据
const defaultStats = [
  { key: 'domesticCount', number: '30+', label: '国内品牌' },
  { key: 'internationalCount', number: '20+', label: '国际品牌' }
]

// 动态统计数据
const dynamicStats = computed(() => [
  { key: 'domesticCount', number: `${brandStore.domesticBrands.length}+`, label: '国内品牌' },
  { key: 'internationalCount', number: `${brandStore.internationalBrands.length}+`, label: '国际品牌' }
])

// 优先使用动态数据，如果没有数据则使用默认数据
const stats = computed(() => {
  // 如果品牌数据已加载且有数据，使用动态统计数据
  if (brandStore.brands.length > 0 || brandStore.ownBrands.length > 0) {
    return dynamicStats.value
  }
  // 否则使用默认统计数据
  return defaultStats
})

// 使用store中的computed属性
const ownBrands = computed(() => brandStore.ownBrands)
const partnerBrands = computed(() => brandStore.agentBrands)

onMounted(async () => {
  await brandStore.loadBrands()
})
</script>

<template>
  <div class="brand-center pt-[72px]">
    <!-- 展示区 -->
    <ShowcaseBanner
      :slogans="brandSlogans"
      :stats="stats"
    />
    
    <!-- 自主品牌区 -->
    <section v-if="ownBrands.length > 0" class="py-12 bg-dark-50">
      <div class="container-base">
        <div class="text-center mb-8">
          <span class="section-badge">自主品牌</span>
          <h2 class="section-title">自主研发，品质保证</h2>
        </div>
        
        <!-- 自主品牌使用水平居中布局 -->
        <div class="flex flex-wrap justify-center gap-4">
          <div
            v-for="brand in ownBrands"
            :key="brand.id"
          >
            <BrandCard :brand="brand" />
          </div>
        </div>
      </div>
    </section>
    
    <!-- 甄选品牌区 -->
    <section class="py-12">
      <div class="container-base">
        <div class="text-center mb-8">
          <span class="section-badge">甄选品牌</span>
          <h2 class="section-title">全球知名品牌，值得信赖</h2>
        </div>
        
        <!-- 加载状态 -->
        <div v-if="brandStore.loading" class="py-20">
          <LoadingSpinner size="lg" text="加载品牌中..." />
        </div>
        
        <!-- 空状态 -->
        <EmptyState
          v-else-if="partnerBrands.length === 0 && ownBrands.length === 0"
          icon="fas fa-award"
          title="暂无品牌数据"
          description="品牌数据正在完善中"
        />
        
        <!-- 品牌网格 -->
        <div v-else class="brands-grid">
          <BrandCard
            v-for="brand in partnerBrands"
            :key="brand.id"
            :brand="brand"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.brands-grid {
  @apply grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center;
}
</style>
