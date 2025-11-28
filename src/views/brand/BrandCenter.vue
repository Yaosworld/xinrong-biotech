<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBrandStore } from '@/stores/brandStore'
import ShowcaseBanner from '@/components/common/ShowcaseBanner.vue'
import BrandCard from '@/components/business/BrandCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const brandStore = useBrandStore()

// 页面标语
const slogans = ['汇聚全球顶尖生命科学品牌', '为科研创新提供可靠保障']

// 统计数据（动态计算）
const stats = computed(() => [
  { key: 'brands', number: `${brandStore.brands.length}+`, label: '合作品牌' },
  { key: 'years', number: '8+', label: '年行业经验' },
  { key: 'products', number: '1000+', label: '产品种类' },
  { key: 'customers', number: '500+', label: '服务客户' }
])

// 自主品牌
const ownBrands = computed(() => {
  return brandStore.brands.filter(b => b.is_own_brand || b.is_own)
})

// 甄选品牌
const partnerBrands = computed(() => {
  return brandStore.brands.filter(b => !b.is_own_brand && !b.is_own)
})

onMounted(async () => {
  await brandStore.loadBrands()
})
</script>

<template>
  <div class="brand-center pt-[72px]">
    <!-- 展示区 -->
    <ShowcaseBanner
      :slogans="slogans"
      :stats="stats"
    />
    
    <!-- 自主品牌区 -->
    <section v-if="ownBrands.length > 0" class="py-12 bg-dark-50">
      <div class="container-base">
        <div class="text-center mb-8">
          <span class="section-badge">自主品牌</span>
          <h2 class="section-title">自主研发，品质保证</h2>
        </div>
        
        <div class="brands-grid">
          <BrandCard
            v-for="brand in ownBrands"
            :key="brand.id"
            :brand="brand"
          />
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
