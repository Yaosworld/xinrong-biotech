<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePromotionStore } from '@/stores/promotionStore'
import { usePagination } from '@/hooks/usePagination'
import ShowcaseBanner from '@/components/common/ShowcaseBanner.vue'
import NewsCard from '@/components/business/NewsCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const promotionStore = usePromotionStore()

// 本地横幅标语
const promotionSlogans = [
  '最新优惠活动',
  '第一时间了解我们的产品优惠与促销信息'
]

// 默认统计数据
const defaultStats = [
  { key: 'active', number: '10+', label: '进行中活动' },
  { key: 'categories', number: '5+', label: '活动分类' },
  { key: 'views', number: '10K+', label: '浏览次数' }
]

// 动态统计数据
const dynamicStats = computed(() => {
  // 使用处理后的活动数据，包含status字段
  const activePromotions = promotionStore.activePromotions.length
  const totalPromotions = promotionStore.processedPromotions.length

  return [
    { key: 'active', number: `${activePromotions}+`, label: '进行中活动' },
    { key: 'categories', number: '5+', label: '活动分类' },
    { key: 'views', number: '10K+', label: '浏览次数' }
  ]
})

// 优先使用动态数据，如果没有数据则使用默认数据
const stats = computed(() => {
  // 如果活动数据已加载且有数据，使用动态统计数据
  if (promotionStore.promotions.length > 0) {
    return dynamicStats.value
  }
  // 否则使用默认统计数据
  return defaultStats
})

// 搜索关键词
const searchQuery = ref('')
const searchInputValue = ref('')

// 分页功能
const { currentPageItems, paginationInfo, goToPage, setPageSize } = usePagination(
  computed(() => promotionStore.filteredPromotions),
  { initialPageSize: 8, scrollTarget: '.promotion-section' }
)

// 执行搜索
const handleSearch = () => {
  promotionStore.setFilter('search', searchInputValue.value.trim())
  searchQuery.value = searchInputValue.value.trim()
  goToPage(1)
}

// 清空筛选
const handleClearFilters = () => {
  promotionStore.clearAllFilters()
  searchInputValue.value = ''
  searchQuery.value = ''
  goToPage(1)
}

onMounted(async () => {
  await promotionStore.loadPromotions()
})
</script>

<template>
  <div class="promotion-center pt-[72px]">
    <!-- 展示区 -->
    <ShowcaseBanner
      :slogans="promotionSlogans"
      :stats="stats"
    />

    <!-- 搜索区 -->
    <section class="py-8 mt-2 relative z-10">
      <div class="container-base">
        <div class="search-box max-w-2xl mx-auto">
          <i class="fas fa-search text-dark-400 ml-4"></i>
          <input
            v-model="searchInputValue"
            type="text"
            placeholder="搜索促销活动..."
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">
            搜索
          </button>
        </div>
      </div>
    </section>

    <!-- 活动列表 -->
    <section class="promotion-section py-8">
      <div class="container-base">
        <!-- 加载状态 -->
        <div v-if="promotionStore.loading" class="py-20">
          <LoadingSpinner size="lg" text="加载活动中..." />
        </div>

        <!-- 空状态 -->
        <EmptyState
          v-else-if="currentPageItems.length === 0"
          icon="fas fa-bullhorn"
          title="暂无匹配的活动"
          description="尝试调整搜索关键词"
          action-text="清空搜索"
          @action="handleClearFilters"
        />

        <!-- 活动列表 -->
        <template v-else>
          <div class="space-y-6">
            <NewsCard
              v-for="promotion in currentPageItems"
              :key="promotion.id"
              :promotion="promotion"
              :highlight-keyword="searchQuery"
            />
          </div>

          <!-- 分页 -->
          <div v-if="paginationInfo.totalPages > 1" class="pagination-wrapper">
            <span class="text-dark-500 text-sm">共 {{ paginationInfo.totalItems }} 条</span>
            <el-select
              :model-value="paginationInfo.pageSize"
              size="default"
              style="width: 100px"
              @change="setPageSize"
            >
              <el-option :value="8" label="8条/页" />
              <el-option :value="16" label="16条/页" />
            </el-select>
            <el-pagination
              :current-page="paginationInfo.currentPage"
              :page-size="paginationInfo.pageSize"
              :total="paginationInfo.totalItems"
              layout="prev, pager, next, jumper"
              @current-change="goToPage"
            />
          </div>
        </template>
      </div>
    </section>
  </div>
</template>