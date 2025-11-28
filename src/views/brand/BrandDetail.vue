<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBrandStore } from '@/stores/brandStore'
import { useProductStore } from '@/stores/productStore'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ProductCard from '@/components/business/ProductCard.vue'

const route = useRoute()
const router = useRouter()
const brandStore = useBrandStore()
const productStore = useProductStore()

const brandId = computed(() => route.params.id as string)
const imageError = ref(false)

// 当前品牌
const brand = computed(() => {
  return brandStore.getBrandById(brandId.value)
})

// 品牌相关产品
const brandProducts = computed(() => {
  if (!brand.value) return []
  return productStore.products.filter(p => p.brand === brand.value?.show_name)
})

// 返回品牌列表
const goBack = () => {
  router.push('/brands')
}

onMounted(async () => {
  await Promise.all([
    brandStore.loadBrands(),
    productStore.loadProducts()
  ])
})
</script>

<template>
  <div class="brand-detail pt-20">
    <!-- 加载状态 -->
    <div v-if="brandStore.loading" class="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" text="加载品牌详情..." />
    </div>
    
    <!-- 品牌未找到 -->
    <div v-else-if="!brand" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <i class="fas fa-star text-6xl text-dark-300 mb-6"></i>
        <h2 class="text-2xl font-bold text-dark-700 mb-4">品牌未找到</h2>
        <p class="text-dark-500 mb-6">抱歉，您查找的品牌不存在</p>
        <button class="btn-primary" @click="goBack">
          <i class="fas fa-arrow-left mr-2"></i>
          返回品牌中心
        </button>
      </div>
    </div>
    
    <!-- 品牌详情 -->
    <template v-else>
      <!-- 品牌头部 -->
      <section class="bg-gradient-to-br from-dark-900 to-dark-800 py-16">
        <div class="container-base">
          <div class="flex flex-col md:flex-row items-center gap-8">
            <!-- Logo -->
            <div class="w-32 h-32 rounded-2xl bg-white p-4 flex items-center justify-center">
              <img
                v-if="!imageError && brand.logo_url"
                :src="brand.logo_url"
                :alt="brand.show_name"
                class="max-w-full max-h-full object-contain"
                @error="imageError = true"
              />
              <div v-else class="text-4xl font-bold text-dark-300">
                {{ brand.show_name.charAt(0) }}
              </div>
            </div>
            
            <!-- 品牌信息 -->
            <div class="text-center md:text-left">
              <div class="flex items-center gap-3 mb-2">
                <h1 class="text-3xl font-bold text-white">{{ brand.show_name }}</h1>
                <span
                  v-if="brand.is_own"
                  class="px-3 py-1 bg-primary-500 text-white text-sm rounded-full"
                >
                  自主品牌
                </span>
              </div>
              <p v-if="brand.category" class="text-dark-400 mb-2">{{ brand.category }}</p>
              <p v-if="brand.country" class="text-dark-400">
                <i class="fas fa-globe mr-2"></i>
                {{ brand.country }}
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 品牌描述 -->
      <section v-if="brand.description" class="py-12 bg-white">
        <div class="container-base">
          <h2 class="text-2xl font-bold text-dark-900 mb-6">品牌介绍</h2>
          <p class="text-dark-600 leading-relaxed max-w-3xl">
            {{ brand.description }}
          </p>
        </div>
      </section>
      
      <!-- 品牌产品 -->
      <section v-if="brandProducts.length > 0" class="py-12 bg-dark-50">
        <div class="container-base">
          <h2 class="text-2xl font-bold text-dark-900 mb-8">
            品牌产品 ({{ brandProducts.length }})
          </h2>
          <div class="products-grid">
            <ProductCard
              v-for="product in brandProducts"
              :key="product.id"
              :product="product"
            />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

