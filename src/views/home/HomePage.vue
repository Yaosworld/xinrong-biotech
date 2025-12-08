<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/productStore'
import { CATEGORIES } from '@/hooks/useCategoryImage'
import { useBrandStore } from '@/stores/brandStore'
import { usePromotionStore } from '@/stores/promotionStore'
import HomeBanner from '@/components/common/HomeBanner.vue'
import ProductCard from '@/components/business/ProductCard.vue'
import BrandCard from '@/components/business/BrandCard.vue'
import NewsCard from '@/components/business/NewsCard.vue'

const router = useRouter()
const productStore = useProductStore()
const brandStore = useBrandStore()
const promotionStore = usePromotionStore()

// 搜索相关
const searchInputValue = ref('')

// 热门产品（取所有产品排序后的前8个，不受筛选条件影响）
const featuredProducts = computed(() => {
  // 创建一个临时的排序后的产品列表，不受筛选条件影响
  const allProducts = [...productStore.products]

  // 应用排序逻辑（与 store 中的排序逻辑保持一致）
  switch (productStore.sortBy) {
    case 'name-asc':
      allProducts.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
      break
    case 'name-desc':
      allProducts.sort((a, b) => b.name.localeCompare(a.name, 'zh-CN'))
      break
  }

  return allProducts.slice(0, 8)
})

// 推荐品牌（自有品牌优先，然后是国外知名品牌，总共取前10个）
const featuredBrands = computed(() => {
  // 获取自有品牌
  const ownBrands = brandStore.ownBrands
  // 获取国外知名品牌（非自有品牌且非中国品牌）
  const internationalBrands = brandStore.brands.filter(brand =>
    brand.is_own_brand !== true && brand.country !== '中国'
  )

  // 将自有品牌和国外品牌合并，自有品牌在前
  const combinedBrands = [...ownBrands, ...internationalBrands]

  // 如果数量不足10个，再添加国内代理品牌
  if (combinedBrands.length < 10) {
    const domesticAgentBrands = brandStore.brands.filter(brand =>
      brand.is_own_brand !== true && brand.country === '中国'
    )
    combinedBrands.push(...domesticAgentBrands)
  }

  // 按优先级排序
  combinedBrands.sort((a, b) => (a.priority || 999) - (b.priority || 999))

  // 返回前10个
  return combinedBrands.slice(0, 10)
})

// 最新活动（按优先级取前8个：即将结束 > 进行中 > 即将开始）
const latestPromotions = computed(() => {
  // 使用 store 中已经排好序的活动（已经按照状态优先级排序）
  // filteredPromotions 是排好序的，但不包括已结束的活动
  const activePromotions = promotionStore.sortedPromotions.filter(p =>
    p.status !== 'ended' && p.status !== 'all'
  )

  // 返回前8个活动
  return activePromotions.slice(0, 8)
})

// 初始化数据
onMounted(async () => {
  await Promise.all([
    productStore.loadProducts(),
    brandStore.loadBrands(),
    promotionStore.loadPromotions(),
  ])
})

// 搜索方法
const handleSearch = () => {
  const query = searchInputValue.value.trim()
  if (query) {
    router.push({
      path: '/products',
      query: { search: query }
    })
  } else {
    router.push('/products')
  }
}

// 导航方法
const goTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="home-page">
    <!-- 图片轮播横幅 -->
    <HomeBanner>
      <!-- 搜索框 -->
      <div class="mx-auto px-8" style="width: 800px;">
        <div class="hero-search-box">
          <i class="fas fa-search hero-search-icon"></i>
          <input
            v-model="searchInputValue"
            type="text"
            placeholder="搜索产品名称、品牌、货号..."
            class="hero-search-input"
            @keyup.enter="handleSearch"
          />
          <button class="hero-search-btn" @click="handleSearch">
            搜索
          </button>
        </div>
      </div>
    </HomeBanner>

    <!-- 产品分类快捷入口 -->
    <section class="py-10 bg-white">
      <div class="container-base">
        <div class="flex flex-wrap justify-center gap-3">
          <button
            v-for="category in CATEGORIES.slice(0, 8)"
            :key="category.id"
            class="filter-tag"
            @click="goTo(`/products?category=${category.id}`)"
          >
            {{ category.name }}
          </button>
          <button
            class="filter-tag !bg-gradient-50 !text-gradient-600"
            @click="goTo('/products')"
          >
            查看全部 →
          </button>
        </div>
      </div>
    </section>
    
    <!-- 热门产品 -->
    <section class="py-16 bg-dark-50">
      <div class="container-base">
        <div class="text-center mb-10">
          <span class="section-badge">热门产品</span>
          <h2 class="section-title">精选优质产品</h2>
        </div>
        
        <div class="products-grid">
          <ProductCard
            v-for="product in featuredProducts"
            :key="product.id"
            :product="product"
          />
        </div>
        
        <div class="text-center mt-10">
          <button class="btn-primary" @click="goTo('/products')">
            查看全部产品
            <i class="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      </div>
    </section>
    
    <!-- 合作品牌 -->
    <section class="py-16">
      <div class="container-base">
        <div class="text-center mb-10">
          <span class="section-badge">品牌矩阵</span>
          <h2 class="section-title">知名品牌，值得信赖</h2>
        </div>
        
        <div class="brands-grid">
          <BrandCard
            v-for="brand in featuredBrands"
            :key="brand.id"
            :brand="brand"
          />
        </div>
        
        <div class="text-center mt-10">
          <button class="btn-primary" @click="goTo('/brands')">
            查看全部品牌
            <i class="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      </div>
    </section>
    
    <!-- 最新活动 -->
    <section v-if="latestPromotions.length > 0" class="py-16 bg-dark-50">
      <div class="container-base">
        <div class="text-center mb-10">
          <span class="section-badge">最新活动</span>
          <h2 class="section-title">优惠活动动态一手掌握</h2>
        </div>

        <div class="space-y-6">
          <NewsCard
            v-for="promotion in latestPromotions"
            :key="promotion.id"
            :promotion="promotion"
          />
        </div>

        <div class="text-center mt-10">
          <button class="btn-primary" @click="goTo('/promotions')">
            查看全部活动
            <i class="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
/* 主页横幅搜索框样式 */
.hero-search-box {
  @apply flex items-center bg-black rounded-lg;
  @apply px-6 py-4 shadow-2xl;
  @apply transition-all duration-300 hover:bg-black;
  position: relative;
  border: 2px solid rgba(255, 255, 255, 0.9);
}

.hero-search-icon {
  @apply text-white/80 text-xl ml-4 mr-4;
}

.hero-search-input {
  @apply flex-1 bg-transparent text-white placeholder-white/70;
  @apply px-0 py-3 text-lg focus:outline-none;
  @apply caret-white;
}

.hero-search-btn {
  @apply px-10 py-3.5 bg-gray-800 hover:bg-gray-700;
  @apply text-white rounded font-medium text-base;
  @apply transition-all duration-200 hover:transform hover:scale-105;
}

/* 添加发光效果 */
.hero-search-box:focus-within {
  border-color: rgba(255, 255, 255, 1);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}

/* 确保在不同背景图片上都有良好的可读性 */
@media (prefers-contrast: high) {
  .hero-search-box {
    border-color: rgba(255, 255, 255, 1);
  }

  .hero-search-input {
    @apply text-white placeholder-white/70;
  }

  .hero-search-icon {
    @apply text-white/90;
  }
}
</style>
