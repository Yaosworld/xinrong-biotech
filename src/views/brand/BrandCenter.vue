<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBrandStore } from '@/stores/brandStore'
import { usePageContentStore } from '@/stores/pageContentStore'
import { usePageShowcase } from '@/composables/usePageShowcase'
import ShowcaseBanner from '@/components/common/ShowcaseBanner.vue'
import BrandCard from '@/components/business/BrandCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { SectionTitleConfig } from '@/types'

const brandStore = useBrandStore()
const pageStore = usePageContentStore()
const { slogans: brandSlogans, statsFromConfig: brandStatsFromConfig } = usePageShowcase('brand-center', [
  '与全球知名品牌合作',
  '为您提供高品质的生物技术产品与解决方案'
])

// 页面内容
const pageContent = computed(() => pageStore.getPageContent?.('brand-center') ?? pageStore.getPage('brand-center'))

// 从数据源获取 sections 标题配置
const sections = computed<Record<string, SectionTitleConfig>>(() => pageContent.value?.sections || {})

// 统计数据
const dynamicBrandStats = computed(() => [
  { key: 'brandCount', number: `${brandStore.brands.length}+`, label: '合作品牌' },
  { key: 'ownBrandCount', number: `${brandStore.brands.filter(b => b.is_own_brand || b.is_own).length}+`, label: '自主品牌' }
])
const stats = computed(() => brandStatsFromConfig.value.length > 0 ? brandStatsFromConfig.value : dynamicBrandStats.value)

// 自主品牌
const ownBrands = computed(() => {
  return brandStore.brands.filter(b => b.is_own_brand || b.is_own)
})

// 甄选品牌
const partnerBrands = computed(() => {
  return brandStore.brands.filter(b => !b.is_own_brand && !b.is_own)
})

onMounted(async () => {
  await Promise.all([
    brandStore.loadBrands(),
    pageStore.loadPageContent('brand-center')
  ])
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
          <span class="section-badge">{{ sections.ownBrands?.badge || '自主品牌' }}</span>
          <h2 class="section-title">{{ sections.ownBrands?.title || '自主研发，品质保证' }}</h2>
        </div>
        
        <!-- 自主品牌使用水平居中布局 -->
        <div class="flex flex-wrap justify-center gap-4">
          <div 
            v-for="brand in ownBrands"
            :key="brand.id"
            class="w-40 sm:w-48"
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
          <span class="section-badge">{{ sections.partnerBrands?.badge || '甄选品牌' }}</span>
          <h2 class="section-title">{{ sections.partnerBrands?.title || '全球知名品牌，值得信赖' }}</h2>
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
