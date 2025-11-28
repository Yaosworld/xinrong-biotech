<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBrandStore } from '@/stores/brandStore'
import { useSearch } from '@/hooks/useSearch'
import SectionTitle from '@/components/common/SectionTitle.vue'
import BrandCard from '@/components/business/BrandCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const brandStore = useBrandStore()

// 搜索功能
const { searchQuery, debouncedQuery, clearSearch } = useSearch(
  (query) => brandStore.setFilter('search', query)
)

// 自主品牌
const ownBrands = computed(() => {
  if (brandStore.filters.search) {
    return brandStore.filteredBrands.filter(b => b.is_own)
  }
  return brandStore.ownBrands
})

// 甄选品牌
const selectedBrands = computed(() => {
  if (brandStore.filters.search) {
    return brandStore.filteredBrands.filter(b => !b.is_own)
  }
  return brandStore.selectedBrands
})

// 清空筛选
const handleClearFilters = () => {
  brandStore.clearAllFilters()
  clearSearch()
}

onMounted(async () => {
  await brandStore.loadBrands()
})
</script>

<template>
  <div class="brand-center pt-20">
    <!-- 页面头部 -->
    <section class="showcase-section py-16">
      <div class="container-base">
        <h1 class="showcase-title text-center mb-4">品牌中心</h1>
        <p class="text-xl text-dark-300 text-center max-w-2xl mx-auto">
          与全球知名品牌合作，为您提供高品质的生物技术产品与解决方案
        </p>
        
        <!-- 统计数据 -->
        <div class="flex justify-center gap-12 mt-8">
          <div class="text-center">
            <div class="text-3xl font-bold text-white">{{ brandStore.brands.length }}+</div>
            <div class="text-dark-400">合作品牌</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-white">{{ brandStore.ownBrands.length }}+</div>
            <div class="text-dark-400">自主品牌</div>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 搜索区 -->
    <section class="py-8 bg-white border-b">
      <div class="container-base">
        <div class="max-w-xl mx-auto">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索品牌名称..."
              class="w-full pl-12 pr-4 py-3 border border-dark-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-dark-400"></i>
            <button
              v-if="searchQuery"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"
              @click="handleClearFilters"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 加载状态 -->
    <div v-if="brandStore.loading" class="py-20 bg-dark-50">
      <LoadingSpinner size="lg" text="加载品牌中..." />
    </div>
    
    <template v-else>
      <!-- 自主品牌区 -->
      <section v-if="ownBrands.length > 0" class="py-12 bg-white">
        <div class="container-base">
          <SectionTitle
            title="自主品牌"
            subtitle="自主研发的优质品牌产品"
            align="left"
          />
          
          <div class="brands-grid">
            <BrandCard
              v-for="brand in ownBrands"
              :key="brand.brand_id"
              :brand="brand"
              :highlight-keyword="debouncedQuery"
            />
          </div>
        </div>
      </section>
      
      <!-- 甄选品牌区 -->
      <section v-if="selectedBrands.length > 0" class="py-12 bg-dark-50">
        <div class="container-base">
          <SectionTitle
            title="甄选品牌"
            subtitle="全球知名品牌合作伙伴"
            align="left"
          />
          
          <div class="brands-grid">
            <BrandCard
              v-for="brand in selectedBrands"
              :key="brand.brand_id"
              :brand="brand"
              :highlight-keyword="debouncedQuery"
            />
          </div>
        </div>
      </section>
      
      <!-- 空状态 -->
      <EmptyState
        v-if="ownBrands.length === 0 && selectedBrands.length === 0"
        icon="fas fa-star"
        title="暂无匹配的品牌"
        description="尝试调整搜索关键词"
        action-text="清空搜索"
        @action="handleClearFilters"
      />
    </template>
  </div>
</template>

