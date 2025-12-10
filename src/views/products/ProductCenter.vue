<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '@/stores/productStore'
import { useBannerStore } from '@/stores/bannerStore'
import { CATEGORIES } from '@/hooks/useCategoryImage'
import ShowcaseBanner from '@/components/common/ShowcaseBanner.vue'
import ProductCard from '@/components/business/ProductCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const bannerStore = useBannerStore()

// 从 store 获取横幅标语
const productSlogans = computed(() => bannerStore.getSlogans('products'))

// 从 store 获取默认统计数据
const defaultStats = computed(() => bannerStore.getDefaultStats('products'))

// 动态统计数据 - 使用后端返回的总数
const dynamicStats = computed(() => [
  { key: 'products', number: `${productStore.pagination.total}+`, label: '商品种类' },
  { key: 'categories', number: `${CATEGORIES.length}+`, label: '产品类别' },
  { key: 'brands', number: `${productStore.allBrands.length}+`, label: '合作品牌' }
])

// 优先使用动态数据，如果没有数据则使用默认数据
const stats = computed(() => {
  if (productStore.pagination.total > 0 || productStore.allBrands.length > 0) {
    return dynamicStats.value
  }
  return defaultStats.value
})

// 搜索关键词
const searchQuery = ref('')
const searchInputValue = ref('')

// 展示的品牌和分类数量
const showAllBrands = ref(false)
const showAllCategories = ref(false)

// 展示的品牌列表
const displayedBrands = computed(() => {
  const brands = productStore.allBrands
  return showAllBrands.value ? brands : brands.slice(0, 8)
})

// 展示的分类列表
const displayedCategories = computed(() => {
  return showAllCategories.value ? CATEGORIES : CATEGORIES.slice(0, 10)
})

// 滚动到产品列表区域
const scrollToProducts = () => {
  nextTick(() => {
    const target = document.querySelector('.products-section')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

// 执行搜索
const handleSearch = () => {
  productStore.setFilter('search', searchInputValue.value.trim())
  searchQuery.value = searchInputValue.value.trim()
}

// 选择品牌（空字符串代表"所有"）
const selectBrand = (brand: string) => {
  productStore.setFilter('brand', brand)
}

// 选择分类（空字符串代表"所有"）
const selectCategory = (categoryId: string) => {
  productStore.setFilter('categoryId', categoryId)
}

// 清空筛选
const handleClearFilters = () => {
  productStore.clearAllFilters()
  searchInputValue.value = ''
  searchQuery.value = ''
}

// 排序变化
const handleSortChange = (sort: string) => {
  productStore.setSortBy(sort as any)
}

// 分页变化
const handlePageChange = (page: number) => {
  productStore.goToPage(page)
  scrollToProducts()
}

// 每页数量变化
const handlePageSizeChange = (size: number) => {
  productStore.setPageSize(size)
  scrollToProducts()
}

// 从URL读取筛选条件
onMounted(async () => {
  // 先设置筛选条件（不触发加载）
  if (route.query.category) {
    productStore.filters.categoryId = route.query.category as string
  }
  if (route.query.brand) {
    productStore.filters.brand = route.query.brand as string
  }
  if (route.query.search) {
    productStore.filters.search = route.query.search as string
    searchInputValue.value = route.query.search as string
    searchQuery.value = route.query.search as string
  }
  
  // 然后加载数据
  await productStore.loadProducts()
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
</script>

<template>
  <div class="product-center pt-[72px]">
    <!-- 展示区 -->
    <ShowcaseBanner
      :slogans="productSlogans"
      :stats="stats"
    />
    
    <!-- 搜索区 -->
    <section class="py-8 mt-2 relative z-10">
      <div class="container-base">
        <div class="search-box max-w-3xl mx-auto">
          <i class="fas fa-search text-dark-400 ml-4"></i>
          <input
            v-model="searchInputValue"
            type="text"
            placeholder="搜索产品名称、品牌、货号..."
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">
            搜索
          </button>
        </div>
      </div>
    </section>
    
    <!-- 筛选区 -->
    <section class="pb-6">
      <div class="container-base">
        <div class="filter-section">
          <!-- 合作品牌 -->
          <div class="mb-6">
            <div class="filter-header">
              <div class="filter-title">
                <i class="fas fa-award text-gradient-600"></i>
                <span>合作品牌</span>
              </div>
              <button
                v-if="productStore.allBrands.length > 8"
                class="filter-more-btn"
                @click="showAllBrands = !showAllBrands"
              >
                {{ showAllBrands ? '收起' : '更多' }}
                <i :class="showAllBrands ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
              </button>
            </div>
            <div class="filter-tags">
              <!-- 所有品牌选项 -->
              <button
                class="filter-tag"
                :class="{ active: !productStore.filters.brand }"
                @click="selectBrand('')"
              >
                所有
              </button>
              <button
                v-for="brand in displayedBrands"
                :key="brand"
                class="filter-tag"
                :class="{ active: productStore.filters.brand === brand }"
                @click="selectBrand(brand)"
              >
                {{ brand }}
              </button>
            </div>
          </div>
          
          <!-- 产品分类 -->
          <div>
            <div class="filter-header">
              <div class="filter-title">
                <i class="fas fa-folder text-gradient-600"></i>
                <span>产品分类</span>
              </div>
              <button
                v-if="CATEGORIES.length > 10"
                class="filter-more-btn"
                @click="showAllCategories = !showAllCategories"
              >
                {{ showAllCategories ? '收起' : '更多' }}
                <i :class="showAllCategories ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
              </button>
            </div>
            <div class="filter-tags">
              <!-- 所有分类选项 -->
              <button
                class="filter-tag"
                :class="{ active: !productStore.filters.categoryId }"
                @click="selectCategory('')"
              >
                所有
              </button>
              <button
                v-for="category in displayedCategories"
                :key="category.id"
                class="filter-tag"
                :class="{ active: productStore.filters.categoryId === category.id }"
                @click="selectCategory(category.id)"
              >
                {{ category.name }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 产品列表 -->
    <section class="products-section pb-16">
      <div class="container-base">
        <!-- 工具栏 -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div class="text-gradient-600 font-medium">
            共找到 {{ productStore.pagination.total }} 个产品
          </div>
          
          <div class="flex items-center gap-4">
            <span class="text-dark-500 text-sm">排序：</span>
            <el-select
              :model-value="productStore.sortBy"
              size="default"
              style="width: 140px"
              @change="handleSortChange"
            >
              <el-option value="name-asc" label="默认排序" />
              <el-option value="name-desc" label="名称 Z-A" />
            </el-select>
          </div>
        </div>
        
        <!-- 加载状态 -->
        <div v-if="productStore.loading" class="py-20">
          <LoadingSpinner size="lg" text="加载产品中..." />
        </div>
        
        <!-- 空状态 -->
        <EmptyState
          v-else-if="productStore.products.length === 0"
          icon="fas fa-box-open"
          title="暂无匹配的产品"
          description="尝试调整筛选条件或搜索关键词"
          action-text="清空筛选"
          @action="handleClearFilters"
        />
        
        <!-- 产品网格 -->
        <div v-else class="products-grid">
          <ProductCard
            v-for="product in productStore.products"
            :key="product.id"
            :product="product"
            :highlight-keyword="searchQuery"
          />
        </div>
        
        <!-- 分页 -->
        <div v-if="productStore.pagination.totalPages > 1" class="pagination-wrapper">
          <span class="text-dark-500 text-sm">共 {{ productStore.pagination.total }} 条</span>
          <el-select
            :model-value="productStore.pagination.pageSize"
            size="default"
            style="width: 110px"
            @change="handlePageSizeChange"
          >
            <el-option :value="12" label="12条/页" />
            <el-option :value="24" label="24条/页" />
            <el-option :value="48" label="48条/页" />
          </el-select>
          <el-pagination
            :current-page="productStore.pagination.page"
            :page-size="productStore.pagination.pageSize"
            :total="productStore.pagination.total"
            :pager-count="7"
            layout="prev, pager, next, jumper"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </section>
  </div>
</template>