<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePromotionStore } from '@/stores/promotionStore'
import { usePagination } from '@/hooks/usePagination'
import { useSearch } from '@/hooks/useSearch'
import NewsCard from '@/components/business/NewsCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const promotionStore = usePromotionStore()

// 搜索功能
const { searchQuery, debouncedQuery, clearSearch } = useSearch(
  (query) => promotionStore.setFilter('search', query)
)

// 分页功能
const { currentPageItems, paginationInfo, goToPage } = usePagination(
  computed(() => promotionStore.filteredPromotions),
  { initialPageSize: 9, scrollTarget: '.news-section' }
)

// 状态筛选
const handleStatusChange = (status: string) => {
  promotionStore.setFilter('status', status as any)
  goToPage(1)
}

// 清空筛选
const handleClearFilters = () => {
  promotionStore.clearAllFilters()
  clearSearch()
  goToPage(1)
}

onMounted(async () => {
  await promotionStore.loadPromotions()
})
</script>

<template>
  <div class="news-center pt-20">
    <!-- 页面头部 -->
    <section class="showcase-section py-16">
      <div class="container-base">
        <h1 class="showcase-title text-center mb-4">资讯中心</h1>
        <p class="text-xl text-dark-300 text-center max-w-2xl mx-auto">
          最新活动与资讯，第一时间了解我们的产品动态与优惠信息
        </p>
      </div>
    </section>
    
    <!-- 筛选区 -->
    <section class="py-6 bg-white border-b sticky top-16 z-40">
      <div class="container-base">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <!-- 搜索框 -->
          <div class="relative w-full sm:w-80">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索活动..."
              class="w-full pl-10 pr-4 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-dark-400"></i>
          </div>
          
          <!-- 状态筛选 -->
          <div class="flex items-center gap-2">
            <button
              v-for="status in [
                { value: 'all', label: '全部' },
                { value: 'active', label: '进行中' },
                { value: 'coming', label: '即将开始' },
                { value: 'ended', label: '已结束' }
              ]"
              :key="status.value"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="[
                promotionStore.filters.status === status.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-100 text-dark-600 hover:bg-dark-200'
              ]"
              @click="handleStatusChange(status.value)"
            >
              {{ status.label }}
            </button>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 活动列表 -->
    <section class="news-section py-12 bg-dark-50">
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
          description="尝试调整筛选条件或搜索关键词"
          action-text="清空筛选"
          @action="handleClearFilters"
        />
        
        <!-- 活动网格 -->
        <template v-else>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <NewsCard
              v-for="promotion in currentPageItems"
              :key="promotion.id"
              :promotion="promotion"
              :highlight-keyword="debouncedQuery"
            />
          </div>
          
          <!-- 分页 -->
          <div v-if="paginationInfo.totalPages > 1" class="mt-10 flex justify-center">
            <el-pagination
              :current-page="paginationInfo.currentPage"
              :page-size="paginationInfo.pageSize"
              :total="paginationInfo.totalItems"
              layout="prev, pager, next"
              @current-change="goToPage"
            />
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

