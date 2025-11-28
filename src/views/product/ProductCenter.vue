<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '@/stores/productStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { usePagination } from '@/hooks/usePagination'
import { useSearch } from '@/hooks/useSearch'
import SectionTitle from '@/components/common/SectionTitle.vue'
import ProductCard from '@/components/business/ProductCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const categoryStore = useCategoryStore()

// 搜索功能
const { searchQuery, isSearching, debouncedQuery, clearSearch } = useSearch(
  (query) => productStore.setFilter('search', query)
)

// 分页功能
const { currentPageItems, paginationInfo, goToPage } = usePagination(
  computed(() => productStore.sortedProducts),
  { initialPageSize: 12, scrollTarget: '.products-section' }
)

// 从URL读取筛选条件
onMounted(async () => {
  await Promise.all([
    productStore.loadProducts(),
    categoryStore.loadCategories()
  ])
  
  // 从URL初始化筛选条件
  if (route.query.category) {
    productStore.setFilter('categoryId', route.query.category as string)
  }
  if (route.query.brand) {
    productStore.setFilter('brand', route.query.brand as string)
  }
  if (route.query.search) {
    searchQuery.value = route.query.search as string
  }
})

// 筛选条件变化时更新URL
watch(
  () => productStore.filters,
  (filters) => {
    const query: Record<string, string> = {}
    if (filters.categoryId) query.category = filters.categoryId
    if (filters.brand) query.brand = filters.brand
    if (filters.search) query.search = filters.search
    router.replace({ query })
  },
  { deep: true }
)

// 分类筛选
const handleCategoryChange = (categoryId: string) => {
  productStore.setFilter('categoryId', categoryId)
  goToPage(1)
}

// 品牌筛选
const handleBrandChange = (brand: string) => {
  productStore.setFilter('brand', brand)
  goToPage(1)
}

// 清空筛选
const handleClearFilters = () => {
  productStore.clearAllFilters()
  clearSearch()
  goToPage(1)
}

// 排序变化
const handleSortChange = (sort: string) => {
  productStore.setSortBy(sort as any)
  goToPage(1)
}
</script>

<template>
  <div class="product-center pt-20">
    <!-- 页面头部 -->
    <section class="showcase-section py-16">
      <div class="container-base">
        <h1 class="showcase-title text-center mb-4">产品中心</h1>
        <p class="text-xl text-dark-300 text-center max-w-2xl mx-auto">
          探索我们的产品世界，为您提供最优质的科学仪器与试剂
        </p>
        
        <!-- 统计数据 -->
        <div class="flex justify-center gap-12 mt-8">
          <div class="text-center">
            <div class="text-3xl font-bold text-white">{{ productStore.products.length }}+</div>
            <div class="text-dark-400">产品种类</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-white">{{ categoryStore.categories.length }}+</div>
            <div class="text-dark-400">产品分类</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-white">{{ productStore.allBrands.length }}+</div>
            <div class="text-dark-400">合作品牌</div>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 筛选和产品区 -->
    <section class="products-section py-12 bg-dark-50">
      <div class="container-base">
        <div class="flex flex-col lg:flex-row gap-8">
          <!-- 侧边筛选栏 -->
          <aside class="lg:w-64 flex-shrink-0">
            <div class="bg-white rounded-xl p-6 shadow-sm sticky top-24">
              <h3 class="text-lg font-semibold text-dark-800 mb-4">筛选条件</h3>
              
              <!-- 搜索框 -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-dark-600 mb-2">搜索产品</label>
                <div class="relative">
                  <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="输入产品名称..."
                    class="w-full pl-10 pr-4 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-dark-400"></i>
                  <i
                    v-if="isSearching"
                    class="fas fa-spinner fa-spin absolute right-3 top-1/2 -translate-y-1/2 text-primary-500"
                  ></i>
                </div>
              </div>
              
              <!-- 分类筛选 -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-dark-600 mb-2">产品分类</label>
                <select
                  :value="productStore.filters.categoryId"
                  class="w-full px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  @change="handleCategoryChange(($event.target as HTMLSelectElement).value)"
                >
                  <option value="">全部分类</option>
                  <option
                    v-for="category in categoryStore.categories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.name }}
                  </option>
                </select>
              </div>
              
              <!-- 品牌筛选 -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-dark-600 mb-2">品牌</label>
                <select
                  :value="productStore.filters.brand"
                  class="w-full px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  @change="handleBrandChange(($event.target as HTMLSelectElement).value)"
                >
                  <option value="">全部品牌</option>
                  <option
                    v-for="brand in productStore.allBrands"
                    :key="brand"
                    :value="brand"
                  >
                    {{ brand }}
                  </option>
                </select>
              </div>
              
              <!-- 清空筛选 -->
              <button
                v-if="productStore.activeFiltersCount > 0"
                class="w-full py-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                @click="handleClearFilters"
              >
                <i class="fas fa-times mr-2"></i>
                清空筛选 ({{ productStore.activeFiltersCount }})
              </button>
            </div>
          </aside>
          
          <!-- 产品列表 -->
          <main class="flex-1">
            <!-- 工具栏 -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div class="text-dark-600">
                共找到 <span class="font-semibold text-primary-600">{{ productStore.sortedProducts.length }}</span> 个产品
              </div>
              
              <div class="flex items-center gap-4">
                <label class="text-sm text-dark-600">排序：</label>
                <select
                  :value="productStore.sortBy"
                  class="px-3 py-2 border border-dark-200 rounded-lg text-sm"
                  @change="handleSortChange(($event.target as HTMLSelectElement).value)"
                >
                  <option value="name-asc">名称 A-Z</option>
                  <option value="name-desc">名称 Z-A</option>
                  <option value="price-asc">价格从低到高</option>
                  <option value="price-desc">价格从高到低</option>
                </select>
              </div>
            </div>
            
            <!-- 加载状态 -->
            <div v-if="productStore.loading" class="py-20">
              <LoadingSpinner size="lg" text="加载产品中..." />
            </div>
            
            <!-- 空状态 -->
            <EmptyState
              v-else-if="currentPageItems.length === 0"
              icon="fas fa-box-open"
              title="暂无匹配的产品"
              description="尝试调整筛选条件或搜索关键词"
              action-text="清空筛选"
              @action="handleClearFilters"
            />
            
            <!-- 产品网格 -->
            <div v-else class="products-grid">
              <ProductCard
                v-for="product in currentPageItems"
                :key="product.id"
                :product="product"
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
          </main>
        </div>
      </div>
    </section>
  </div>
</template>

