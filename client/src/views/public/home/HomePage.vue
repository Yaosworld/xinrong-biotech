<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/productStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useBrandStore } from '@/stores/brandStore'
import { usePromotionStore } from '@/stores/promotionStore'
import { useHomeBannerStore } from '@/stores/homeBannerStore'
import HomeBanner from '@/components/common/HomeBanner.vue'
import ProductCard from '@/components/business/ProductCard.vue'
import BrandCard from '@/components/business/BrandCard.vue'
import NewsCard from '@/components/business/NewsCard.vue'

const router = useRouter()
const productStore = useProductStore()
const categoryStore = useCategoryStore()
const brandStore = useBrandStore()
const promotionStore = usePromotionStore()
const homeBannerStore = useHomeBannerStore()

// 从 store 获取分类列表（用于快捷入口）
const categories = computed(() => categoryStore.categories)

// 从 store 获取区块标题配置
const sections = computed(() => homeBannerStore.sections)

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

// 推荐品牌（自主品牌优先，然后是独家代理、一级代理，最后是合作品牌，总共取前10个）
const featuredBrands = computed(() => {
  // 按优先级获取品牌：自主 > 独家代理 > 一级代理 > 合作
  const ownBrands = brandStore.ownBrands
  const exclusiveBrands = brandStore.exclusiveBrands
  const primaryBrands = brandStore.primaryBrands
  const partnerBrands = brandStore.partnerBrands

  // 合并所有品牌，按优先级排序
  const combinedBrands = [...ownBrands, ...exclusiveBrands, ...primaryBrands, ...partnerBrands]

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
  // 先加载分类数据（ProductCard 需要分类图片）和首页配置
  await Promise.all([
    categoryStore.ensureLoaded(),
    homeBannerStore.loadBanners()
  ])
  
  // 并行加载其他数据
  await Promise.all([
    productStore.loadProducts(),
    brandStore.loadBrands(),
    promotionStore.loadPromotions(),
  ])
})

// 导航方法
const goTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="home-page">
    <!-- 图片轮播横幅 -->
    <HomeBanner />

    <!-- 产品分类快捷入口 -->
    <section class="py-10 bg-white">
      <div class="container-base">
        <div class="flex flex-wrap justify-center gap-3">
          <button
            v-for="category in categories.slice(0, 8)"
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
          <span class="section-badge">{{ sections.products.badge }}</span>
          <h2 class="section-title">{{ sections.products.title }}</h2>
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
          <span class="section-badge">{{ sections.brands.badge }}</span>
          <h2 class="section-title">{{ sections.brands.title }}</h2>
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
          <span class="section-badge">{{ sections.promotions.badge }}</span>
          <h2 class="section-title">{{ sections.promotions.title }}</h2>
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
