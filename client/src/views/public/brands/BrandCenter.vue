<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBrandStore } from '@/stores/brandStore'
import { useBannerStore } from '@/stores/bannerStore'
import { BRAND_TYPE_CONFIG, type BrandType } from '@/types'
import ShowcaseBanner from '@/components/common/ShowcaseBanner.vue'
import BrandCard from '@/components/business/BrandCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const brandStore = useBrandStore()
const bannerStore = useBannerStore()

// 当前选中的分类标签（默认选中第一个分类）
const activeTab = ref<BrandType | 'all'>('own')

// 品牌分类标签配置
const brandTabs = computed(() => {
  const tabs: { key: BrandType | 'all'; label: string; count: number }[] = []
  
  // 按顺序添加各分类（只显示有品牌的分类）
  const types: BrandType[] = ['own', 'exclusive', 'primary', 'partner']
  types.forEach(type => {
    const count = brandStore.brandCountByType[type]
    if (count > 0) {
      tabs.push({
        key: type,
        label: BRAND_TYPE_CONFIG[type].label,
        count
      })
    }
  })
  
  // 全部品牌放在最后
  tabs.push({ key: 'all', label: '全部品牌', count: brandStore.brands.length })
  
  return tabs
})

// 当前显示的品牌列表
const displayBrands = computed(() => {
  if (activeTab.value === 'all') {
    return brandStore.sortedBrands
  }
  
  switch (activeTab.value) {
    case 'own': return brandStore.ownBrands
    case 'exclusive': return brandStore.exclusiveBrands
    case 'primary': return brandStore.primaryBrands
    case 'partner': return brandStore.partnerBrands
    default: return brandStore.sortedBrands
  }
})

// 当前分类的标题信息
const currentTypeInfo = computed(() => {
  if (activeTab.value === 'all') {
    return { badge: '全部品牌', subtitle: '优质品牌，值得信赖' }
  }
  return BRAND_TYPE_CONFIG[activeTab.value]
})

// 从 store 获取横幅标语
const brandSlogans = computed(() => bannerStore.getSlogans('brands'))

// 从 store 获取统计数据
const stats = computed(() => bannerStore.getDefaultStats('brands'))

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
    
    <!-- 品牌分类标签 -->
    <section class="py-8 bg-white border-b border-gray-100 sticky top-[72px] z-40">
      <div class="container-base">
        <div class="flex flex-wrap justify-center gap-3">
          <button
            v-for="tab in brandTabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            class="brand-tab"
            :class="{ active: activeTab === tab.key }"
          >
            <span class="tab-label">{{ tab.label }}</span>
            <span class="tab-count">{{ tab.count }}</span>
          </button>
        </div>
      </div>
    </section>
    
    <!-- 品牌展示区 -->
    <section class="py-12 bg-dark-50">
      <div class="container-base">
        <!-- 分类标题 -->
        <div class="text-center mb-8">
          <span class="section-badge">{{ currentTypeInfo.badge }}</span>
          <h2 class="section-title">{{ currentTypeInfo.subtitle }}</h2>
        </div>
        
        <!-- 加载状态 -->
        <div v-if="brandStore.loading" class="py-20">
          <LoadingSpinner size="lg" text="加载品牌中..." />
        </div>
        
        <!-- 空状态 -->
        <EmptyState
          v-else-if="displayBrands.length === 0"
          icon="fas fa-award"
          title="暂无品牌数据"
          description="该分类下暂无品牌"
        />
        
        <!-- 品牌网格 -->
        <div v-else class="brands-grid">
          <BrandCard
            v-for="brand in displayBrands"
            :key="brand.id"
            :brand="brand"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 品牌网格 - 使用 flex 布局实现居中 */
.brands-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
}

/* 品牌分类标签样式 */
.brand-tab {
  @apply px-5 py-2.5 rounded-full border-2 border-gray-200 bg-white text-gray-600 
         font-medium transition-all duration-300 flex items-center gap-2;
}

.brand-tab:hover {
  border-color: #05548C;
  color: #05548C;
}

.brand-tab.active {
  @apply text-white border-transparent;
  background: #05548C;
  box-shadow: none;
}

.tab-label {
  @apply text-sm;
}

.tab-count {
  @apply text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500;
}

.brand-tab.active .tab-count {
  @apply bg-white/20 text-white;
}
</style>
