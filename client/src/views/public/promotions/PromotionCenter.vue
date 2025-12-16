<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePromotionStore } from '@/stores/promotionStore'
import { useBannerStore } from '@/stores/bannerStore'
import { usePagination } from '@/hooks/usePagination'
import ShowcaseBanner from '@/components/common/ShowcaseBanner.vue'
import NewsCard from '@/components/business/NewsCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { PromotionTimeStatus } from '@/types'
import { PROMOTION_STATUS_CONFIG, PROMOTION_PAGINATION_CONFIG } from '@/constants/promotions'

const promotionStore = usePromotionStore()
const bannerStore = useBannerStore()

// 从 store 获取横幅标语
const promotionSlogans = computed(() => bannerStore.getSlogans('promotions'))

// 从 store 获取统计数据（完全由后台配置控制）
const stats = computed(() => bannerStore.getDefaultStats('promotions'))

// 搜索关键词
const searchQuery = ref('')
const searchInputValue = ref('')

// 筛选面板展开状态
const showFilters = ref(false)

// 状态筛选选项
const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'endingSoon', label: PROMOTION_STATUS_CONFIG.TEXT.endingSoon },
  { value: 'active', label: PROMOTION_STATUS_CONFIG.TEXT.active },
  { value: 'coming', label: PROMOTION_STATUS_CONFIG.TEXT.coming },
  { value: 'ended', label: PROMOTION_STATUS_CONFIG.TEXT.ended }
]

// 当前选中的状态
const selectedStatus = ref<PromotionTimeStatus | 'all'>('all')

// 当前选中的标签
const selectedTags = ref<string[]>([])

// 分页功能
const { currentPageItems, paginationInfo, goToPage, setPageSize } = usePagination(
  computed(() => promotionStore.filteredPromotions),
  { initialPageSize: PROMOTION_PAGINATION_CONFIG.FRONT_PAGE_SIZE, scrollTarget: '.promotion-section' }
)

// 执行搜索
const handleSearch = () => {
  promotionStore.setFilter('search', searchInputValue.value.trim())
  searchQuery.value = searchInputValue.value.trim()
  goToPage(1)
}

// 状态筛选变化
const handleStatusChange = (status: PromotionTimeStatus | 'all') => {
  selectedStatus.value = status
  promotionStore.setFilter('timeStatus', status)
  goToPage(1)
}

// 标签筛选变化
const handleTagChange = (tags: string[]) => {
  selectedTags.value = tags
  promotionStore.setFilter('tags', tags)
  goToPage(1)
}

// 是否有激活的筛选条件
const hasActiveFilters = computed(() => {
  return searchInputValue.value.trim() !== '' || 
         selectedStatus.value !== 'all' || 
         selectedTags.value.length > 0
})

// 清空筛选
const handleClearFilters = () => {
  promotionStore.clearAllFilters()
  searchInputValue.value = ''
  searchQuery.value = ''
  selectedStatus.value = 'all'
  selectedTags.value = []
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

    <!-- 搜索和筛选区 -->
    <section class="py-8 mt-2 relative z-10">
      <div class="container-base">
        <!-- 搜索框 -->
        <div class="search-box max-w-2xl mx-auto">
          <i class="fas fa-search text-dark-400 ml-4"></i>
          <input
            v-model="searchInputValue"
            type="text"
            placeholder="搜索促销活动..."
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button class="filter-toggle-btn" @click="showFilters = !showFilters">
            <i :class="showFilters ? 'fas fa-times' : 'fas fa-filter'"></i>
          </button>
          <button class="search-btn" @click="handleSearch">
            搜索
          </button>
        </div>
        
        <!-- 筛选面板 -->
        <transition name="slide-fade">
          <div v-if="showFilters" class="filter-panel max-w-2xl mx-auto mt-4">
            <div class="filter-row">
              <span class="filter-label">状态：</span>
              <div class="filter-options">
                <button
                  v-for="opt in statusOptions"
                  :key="opt.value"
                  class="filter-tag"
                  :class="{ active: selectedStatus === opt.value }"
                  @click="handleStatusChange(opt.value as PromotionTimeStatus | 'all')"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            
            <div v-if="promotionStore.availableTags.length > 0" class="filter-row">
              <span class="filter-label">标签：</span>
              <div class="filter-options">
                <button
                  v-for="tag in promotionStore.availableTags"
                  :key="tag"
                  class="filter-tag"
                  :class="{ active: selectedTags.includes(tag) }"
                  @click="handleTagChange(selectedTags.includes(tag) ? selectedTags.filter(t => t !== tag) : [...selectedTags, tag])"
                >
                  {{ tag }}
                </button>
              </div>
            </div>
            
            <div v-if="hasActiveFilters" class="filter-actions">
              <button class="clear-filter-btn" @click="handleClearFilters">
                <i class="fas fa-times-circle"></i> 清空筛选
              </button>
            </div>
          </div>
        </transition>
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


<style scoped>
/* 筛选切换按钮 */
.filter-toggle-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: #667eea;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s;
  border-radius: 8px;
}

.filter-toggle-btn:hover {
  background: rgba(102, 126, 234, 0.1);
}

/* 筛选面板 */
.filter-panel {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.filter-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.filter-row:last-child {
  margin-bottom: 0;
}

.filter-label {
  font-size: 14px;
  color: #666;
  min-width: 50px;
  padding-top: 6px;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}

.filter-tag {
  padding: 6px 14px;
  border: 1px solid #e4e7ed;
  border-radius: 20px;
  background: #fff;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tag:hover {
  border-color: #667eea;
  color: #667eea;
}

.filter-tag.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-color: transparent;
  color: #fff;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  margin-top: 12px;
}

.clear-filter-btn {
  padding: 6px 14px;
  border: none;
  background: #f5f5f5;
  color: #666;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.clear-filter-btn:hover {
  background: #e8e8e8;
  color: #333;
}

/* 过渡动画 */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

/* 分页样式 */
.pagination-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}
</style>
