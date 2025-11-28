<script setup lang="ts">
import { onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useBrandStore } from '@/stores/brandStore'
import { usePromotionStore } from '@/stores/promotionStore'
import HeroBanner from './components/HeroBanner.vue'
import CategoryShowcase from './components/CategoryShowcase.vue'
import ProductPreview from './components/ProductPreview.vue'
import BrandPreview from './components/BrandPreview.vue'
import NewsPreview from './components/NewsPreview.vue'

const productStore = useProductStore()
const categoryStore = useCategoryStore()
const brandStore = useBrandStore()
const promotionStore = usePromotionStore()

onMounted(async () => {
  // 并行加载所有数据
  await Promise.all([
    productStore.loadProducts(),
    categoryStore.loadCategories(),
    brandStore.loadBrands(),
    promotionStore.loadPromotions()
  ])
})
</script>

<template>
  <div class="home-page">
    <!-- Hero Banner -->
    <HeroBanner />
    
    <!-- 分类展示 -->
    <CategoryShowcase />
    
    <!-- 产品预览 -->
    <ProductPreview />
    
    <!-- 品牌预览 -->
    <BrandPreview />
    
    <!-- 资讯预览 -->
    <NewsPreview />
  </div>
</template>

