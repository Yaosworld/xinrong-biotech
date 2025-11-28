<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/productStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useBrandStore } from '@/stores/brandStore'
import { usePromotionStore } from '@/stores/promotionStore'
import ShowcaseBanner from '@/components/common/ShowcaseBanner.vue'
import ProductCard from '@/components/business/ProductCard.vue'
import BrandCard from '@/components/business/BrandCard.vue'
import NewsCard from '@/components/business/NewsCard.vue'

const router = useRouter()
const productStore = useProductStore()
const categoryStore = useCategoryStore()
const brandStore = useBrandStore()
const promotionStore = usePromotionStore()

// 页面标语
const slogans = ['精选优质产品', '助力科研创新']

// 统计数据（动态计算）
const stats = computed(() => [
  { key: 'products', number: `${productStore.products.length}+`, label: '产品种类' },
  { key: 'brands', number: `${brandStore.brands.length}+`, label: '合作品牌' },
  { key: 'customers', number: '1000+', label: '服务客户' }
])

// 热门产品（取前8个）
const featuredProducts = computed(() => {
  return productStore.products.slice(0, 8)
})

// 推荐品牌（取前10个）
const featuredBrands = computed(() => {
  return brandStore.brands.slice(0, 10)
})

// 最新活动（取前3个）
const latestPromotions = computed(() => {
  return promotionStore.promotions.slice(0, 3)
})

// 初始化数据
onMounted(async () => {
  await Promise.all([
    productStore.loadProducts(),
    categoryStore.loadCategories(),
    brandStore.loadBrands(),
    promotionStore.loadPromotions()
  ])
})

// 导航方法
const goTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="home-page pt-[72px]">
    <!-- 展示区 -->
    <ShowcaseBanner
      :slogans="slogans"
      :stats="stats"
    >
      <!-- 搜索框 -->
      <div class="max-w-2xl mx-auto mt-10">
        <div 
          class="search-box cursor-pointer"
          @click="goTo('/products')"
        >
          <i class="fas fa-search text-dark-400 ml-4"></i>
          <input
            type="text"
            placeholder="搜索产品名称、品牌、货号..."
            class="search-input cursor-pointer"
            readonly
          />
          <button class="search-btn">
            搜索
          </button>
        </div>
      </div>
    </ShowcaseBanner>
    
    <!-- 产品分类快捷入口 -->
    <section class="py-10 bg-white">
      <div class="container-base">
        <div class="flex flex-wrap justify-center gap-3">
          <button
            v-for="category in categoryStore.categories.slice(0, 8)"
            :key="category.id"
            class="filter-tag"
            @click="goTo(`/products?category=${category.id}`)"
          >
            {{ category.name }}
          </button>
          <button
            class="filter-tag !bg-primary-50 !text-primary-600"
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
          <span class="section-badge">合作品牌</span>
          <h2 class="section-title">全球知名品牌，值得信赖</h2>
        </div>
        
        <div class="brands-grid">
          <BrandCard
            v-for="brand in featuredBrands"
            :key="brand.id"
            :brand="brand"
          />
        </div>
        
        <div class="text-center mt-10">
          <button class="btn-outline" @click="goTo('/brands')">
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
          <h2 class="section-title">科研动态一手掌握</h2>
        </div>
        
        <div class="space-y-6">
          <NewsCard
            v-for="promotion in latestPromotions"
            :key="promotion.id"
            :promotion="promotion"
          />
        </div>
        
        <div class="text-center mt-10">
          <button class="btn-outline" @click="goTo('/news')">
            查看全部活动
            <i class="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      </div>
    </section>
    
    <!-- 为什么选择我们 -->
    <section class="py-16">
      <div class="container-base">
        <div class="text-center mb-10">
          <span class="section-badge">我们的优势</span>
          <h2 class="section-title">为什么选择我们</h2>
        </div>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="card-base p-6 text-center">
            <div class="w-14 h-14 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-check-circle text-2xl"></i>
            </div>
            <h3 class="font-semibold text-dark-800 mb-2">正规授权</h3>
            <p class="text-dark-500 text-sm">多个知名品牌官方授权代理</p>
          </div>
          
          <div class="card-base p-6 text-center">
            <div class="w-14 h-14 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-th-large text-2xl"></i>
            </div>
            <h3 class="font-semibold text-dark-800 mb-2">品类齐全</h3>
            <p class="text-dark-500 text-sm">一站式满足科研采购需求</p>
          </div>
          
          <div class="card-base p-6 text-center">
            <div class="w-14 h-14 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-bolt text-2xl"></i>
            </div>
            <h3 class="font-semibold text-dark-800 mb-2">快速响应</h3>
            <p class="text-dark-500 text-sm">高效订单处理，准确速达</p>
          </div>
          
          <div class="card-base p-6 text-center">
            <div class="w-14 h-14 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-headset text-2xl"></i>
            </div>
            <h3 class="font-semibold text-dark-800 mb-2">专业服务</h3>
            <p class="text-dark-500 text-sm">资深团队提供技术支持</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
