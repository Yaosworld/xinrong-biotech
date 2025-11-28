<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/productStore'
import SectionTitle from '@/components/common/SectionTitle.vue'
import ProductCard from '@/components/business/ProductCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const router = useRouter()
const productStore = useProductStore()

// 获取前8个产品作为预览
const previewProducts = computed(() => {
  return productStore.products.slice(0, 8)
})

const goToProducts = () => {
  router.push('/products')
}
</script>

<template>
  <section class="py-16 md:py-24 bg-dark-50">
    <div class="container-base">
      <SectionTitle
        title="热门产品"
        subtitle="精选优质产品，为您的科研工作提供强有力的支持"
      >
        <template #extra>
          <button
            class="mt-6 btn-outline text-sm"
            @click="goToProducts"
          >
            查看全部产品
            <i class="fas fa-arrow-right ml-2"></i>
          </button>
        </template>
      </SectionTitle>
      
      <!-- 加载状态 -->
      <div v-if="productStore.loading" class="py-20">
        <LoadingSpinner size="lg" text="加载产品中..." />
      </div>
      
      <!-- 产品网格 -->
      <div v-else class="products-grid">
        <ProductCard
          v-for="product in previewProducts"
          :key="product.id"
          :product="product"
        />
      </div>
      
      <!-- 底部按钮 -->
      <div class="text-center mt-12">
        <button
          class="btn-primary text-lg px-8"
          @click="goToProducts"
        >
          <i class="fas fa-th-large mr-2"></i>
          浏览全部 {{ productStore.products.length }}+ 产品
        </button>
      </div>
    </div>
  </section>
</template>

