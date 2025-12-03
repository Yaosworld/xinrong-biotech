<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/productStore'
import { CATEGORIES } from '@/hooks/useCategoryImage'
import { useBrandStore } from '@/stores/brandStore'
import { usePromotionStore } from '@/stores/promotionStore'
import { usePageContentStore } from '@/stores/pageContentStore'
import { usePageShowcase } from '@/composables/usePageShowcase'
import ShowcaseBanner from '@/components/common/ShowcaseBanner.vue'
import ProductCard from '@/components/business/ProductCard.vue'
import BrandCard from '@/components/business/BrandCard.vue'
import NewsCard from '@/components/business/NewsCard.vue'
import type { SectionTitleConfig } from '@/types'

const router = useRouter()
const productStore = useProductStore()
const brandStore = useBrandStore()
const promotionStore = usePromotionStore()
const pageStore = usePageContentStore()
const { slogans: homeSlogans, statsFromConfig: homeStatsFromConfig } = usePageShowcase('home', [
  '探索生命科学的无限可能',
  '为科研机构和医疗企业提供高品质的科学仪器、实验耗材和生物试剂'
])

// 页面内容
const pageContent = computed(() => pageStore.getPageContent?.('home') ?? pageStore.getPage('home'))

// 从数据源获取 sections 标题配置
const sections = computed<Record<string, SectionTitleConfig>>(() => pageContent.value?.sections || {})

// 从数据源获取优势数据
const advantagesData = computed(() => pageContent.value?.advantages || [
  { icon: 'fas fa-check-circle', title: '正规授权', content: '多个知名品牌官方授权代理' },
  { icon: 'fas fa-th-large', title: '品类齐全', content: '一站式满足科研采购需求' },
  { icon: 'fas fa-bolt', title: '快速响应', content: '高效订单处理，准确速达' },
  { icon: 'fas fa-headset', title: '专业服务', content: '资深团队提供技术支持' }
])

// 统计数据
const dynamicHomeStats = computed(() => [
  { key: 'products', number: `${productStore.products.length}+`, label: '产品种类' },
  { key: 'brands', number: `${brandStore.brands.length}+`, label: '合作品牌' },
  { key: 'customers', number: '1000+', label: '服务客户' }
])
const stats = computed(() => homeStatsFromConfig.value.length > 0 ? homeStatsFromConfig.value : dynamicHomeStats.value)

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
    brandStore.loadBrands(),
    promotionStore.loadPromotions(),
    pageStore.loadPageContent('home')
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
      :slogans="homeSlogans"
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
            v-for="category in CATEGORIES.slice(0, 8)"
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
          <span class="section-badge">{{ sections.products?.badge || '热门产品' }}</span>
          <h2 class="section-title">{{ sections.products?.title || '精选优质产品' }}</h2>
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
          <span class="section-badge">{{ sections.brands?.badge || '合作品牌' }}</span>
          <h2 class="section-title">{{ sections.brands?.title || '全球知名品牌，值得信赖' }}</h2>
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
          <span class="section-badge">{{ sections.promotions?.badge || '最新活动' }}</span>
          <h2 class="section-title">{{ sections.promotions?.title || '科研动态一手掌握' }}</h2>
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
    <section v-if="advantagesData.length > 0" class="py-16">
      <div class="container-base">
        <div class="text-center mb-10">
          <span class="section-badge">{{ sections.advantages?.badge || '我们的优势' }}</span>
          <h2 class="section-title">{{ sections.advantages?.title || '为什么选择我们' }}</h2>
        </div>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            v-for="(item, index) in advantagesData" 
            :key="index"
            class="card-base p-6 text-center"
          >
            <div class="w-14 h-14 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <i :class="[item.icon, 'text-2xl']"></i>
            </div>
            <h3 class="font-semibold text-dark-800 mb-2">{{ item.title }}</h3>
            <p class="text-dark-500 text-sm">{{ item.content }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
