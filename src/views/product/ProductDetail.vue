<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '@/stores/productStore'
import { useCategoryStore } from '@/stores/categoryStore'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ProductCard from '@/components/business/ProductCard.vue'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const categoryStore = useCategoryStore()

const productId = computed(() => route.params.id as string)
const imageError = ref(false)

// 当前产品
const product = computed(() => {
  return productStore.getProductById(productId.value)
})

// 分类信息
const category = computed(() => {
  if (!product.value) return null
  return categoryStore.getCategoryById(product.value.categoryId)
})

// 分类图片路径
const categoryImagePath = computed(() => {
  if (!product.value) return '/images/common/placeholder.png'
  return categoryStore.getCategoryImagePath(product.value.categoryId)
})

// 相关产品（同分类的其他产品）
const relatedProducts = computed(() => {
  if (!product.value) return []
  return productStore
    .getProductsByCategoryId(product.value.categoryId)
    .filter(p => p.id !== product.value?.id)
    .slice(0, 4)
})

// 计算折扣
const discountPercentage = computed(() => {
  if (!product.value?.originalPrice || !product.value?.currentPrice) return 0
  return Math.round((1 - product.value.currentPrice / product.value.originalPrice) * 100)
})

// 返回产品列表
const goBack = () => {
  router.push('/products')
}

onMounted(async () => {
  await Promise.all([
    productStore.loadProducts(),
    categoryStore.loadCategories()
  ])
})
</script>

<template>
  <div class="product-detail pt-20">
    <!-- 加载状态 -->
    <div v-if="productStore.loading" class="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" text="加载产品详情..." />
    </div>
    
    <!-- 产品未找到 -->
    <div v-else-if="!product" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <i class="fas fa-box-open text-6xl text-dark-300 mb-6"></i>
        <h2 class="text-2xl font-bold text-dark-700 mb-4">产品未找到</h2>
        <p class="text-dark-500 mb-6">抱歉，您查找的产品不存在或已下架</p>
        <button class="btn-primary" @click="goBack">
          <i class="fas fa-arrow-left mr-2"></i>
          返回产品列表
        </button>
      </div>
    </div>
    
    <!-- 产品详情 -->
    <template v-else>
      <!-- 面包屑 -->
      <div class="bg-dark-50 py-4">
        <div class="container-base">
          <nav class="flex items-center text-sm text-dark-500">
            <router-link to="/" class="hover:text-primary-600">首页</router-link>
            <i class="fas fa-chevron-right mx-2 text-xs"></i>
            <router-link to="/products" class="hover:text-primary-600">产品中心</router-link>
            <i class="fas fa-chevron-right mx-2 text-xs"></i>
            <span v-if="category" class="hover:text-primary-600 cursor-pointer" @click="router.push(`/products?category=${category.id}`)">
              {{ category.name }}
            </span>
            <i v-if="category" class="fas fa-chevron-right mx-2 text-xs"></i>
            <span class="text-dark-800 font-medium">{{ product.name }}</span>
          </nav>
        </div>
      </div>
      
      <!-- 主要内容 -->
      <section class="py-12">
        <div class="container-base">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <!-- 产品图片 -->
            <div class="space-y-4">
              <div class="aspect-square bg-dark-100 rounded-2xl overflow-hidden relative">
                <img
                  v-if="!imageError"
                  :src="categoryImagePath"
                  :alt="product.name"
                  class="w-full h-full object-cover"
                  @error="imageError = true"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <i class="fas fa-image text-6xl text-dark-300"></i>
                </div>
                
                <!-- 折扣标签 -->
                <div
                  v-if="discountPercentage > 0"
                  class="absolute top-4 left-4 px-3 py-2 bg-red-500 text-white font-bold rounded-lg"
                >
                  -{{ discountPercentage }}% OFF
                </div>
              </div>
            </div>
            
            <!-- 产品信息 -->
            <div>
              <!-- 品牌 -->
              <div v-if="product.brand" class="text-primary-600 font-medium mb-2">
                {{ product.brand }}
              </div>
              
              <!-- 名称 -->
              <h1 class="text-3xl font-bold text-dark-900 mb-4">{{ product.name }}</h1>
              
              <!-- 分类标签 -->
              <div v-if="category" class="mb-6">
                <span class="inline-flex items-center px-3 py-1 bg-dark-100 text-dark-600 rounded-full text-sm">
                  <i class="fas fa-tag mr-2"></i>
                  {{ category.name }}
                </span>
              </div>
              
              <!-- 价格 -->
              <div v-if="product.currentPrice || product.originalPrice" class="mb-6">
                <div class="flex items-baseline gap-4">
                  <span
                    v-if="product.currentPrice"
                    class="text-4xl font-bold text-primary-600"
                  >
                    ¥{{ product.currentPrice.toLocaleString() }}
                  </span>
                  <span
                    v-if="product.originalPrice && product.currentPrice && product.currentPrice < product.originalPrice"
                    class="text-xl text-dark-400 line-through"
                  >
                    ¥{{ product.originalPrice.toLocaleString() }}
                  </span>
                </div>
              </div>
              
              <!-- 规格参数 -->
              <div class="mb-8">
                <h3 class="text-lg font-semibold text-dark-800 mb-3">规格参数</h3>
                <div class="bg-dark-50 rounded-xl p-4">
                  <p class="text-dark-600 leading-relaxed">{{ product.specs }}</p>
                </div>
              </div>
              
              <!-- SKU -->
              <div v-if="product.sku" class="mb-6">
                <span class="text-sm text-dark-500">产品编码：</span>
                <span class="text-sm font-mono text-dark-700">{{ product.sku }}</span>
              </div>
              
              <!-- 单位 -->
              <div v-if="product.unit" class="mb-6">
                <span class="text-sm text-dark-500">销售单位：</span>
                <span class="text-sm text-dark-700">{{ product.unit }}</span>
              </div>
              
              <!-- 产品描述 -->
              <div class="mb-8">
                <h3 class="text-lg font-semibold text-dark-800 mb-3">产品描述</h3>
                <p class="text-dark-600 leading-relaxed">{{ product.desc }}</p>
              </div>
              
              <!-- 联系按钮 -->
              <div class="flex gap-4">
                <button class="btn-primary flex-1">
                  <i class="fas fa-phone-alt mr-2"></i>
                  咨询订购
                </button>
                <button class="btn-secondary">
                  <i class="fas fa-heart"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 相关产品 -->
      <section v-if="relatedProducts.length > 0" class="py-12 bg-dark-50">
        <div class="container-base">
          <h2 class="text-2xl font-bold text-dark-900 mb-8">相关产品</h2>
          <div class="products-grid">
            <ProductCard
              v-for="p in relatedProducts"
              :key="p.id"
              :product="p"
            />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

