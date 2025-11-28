<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePromotionStore } from '@/stores/promotionStore'
import { usePagination } from '@/hooks/usePagination'
import ShowcaseBanner from '@/components/common/ShowcaseBanner.vue'
import NewsCard from '@/components/business/NewsCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const promotionStore = usePromotionStore()

// 搜索关键词
const searchQuery = ref('')
const searchInputValue = ref('')

// 分页功能
const { currentPageItems, paginationInfo, goToPage, setPageSize } = usePagination(
  computed(() => promotionStore.filteredPromotions),
  { initialPageSize: 8, scrollTarget: '.news-section' }
)

// 统计数据
const stats = computed(() => [
  { number: `${promotionStore.promotions.length}+`, label: '活动资讯' },
  { number: '50+', label: '学术会议' },
  { number: '20+', label: '新品发布' }
])

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
  <div class="news-center pt-[72px]">
    <!-- 展示区 -->
    <ShowcaseBanner
      title="最新活动资讯"
      subtitle="科研动态一手掌握"
      :stats="stats"
    />
    
    <!-- 搜索区 -->
    <section class="py-8 -mt-6 relative z-10">
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
    <section class="news-section py-8">
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
