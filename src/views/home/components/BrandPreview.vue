<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBrandStore } from '@/stores/brandStore'
import SectionTitle from '@/components/common/SectionTitle.vue'

const router = useRouter()
const brandStore = useBrandStore()

// 获取推荐品牌或前12个品牌作为预览
const previewBrands = computed(() => {
  const featured = brandStore.featuredBrands
  if (featured.length >= 6) {
    return featured.slice(0, 12)
  }
  return brandStore.brands.slice(0, 12)
})

const goToBrands = () => {
  router.push('/brands')
}
</script>

<template>
  <section class="py-16 md:py-24 bg-white">
    <div class="container-base">
      <SectionTitle
        title="合作品牌"
        subtitle="与全球知名品牌合作，为您提供最优质的产品与服务"
      />
      
      <!-- 品牌Logo网格 -->
      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 md:gap-6">
        <div
          v-for="brand in previewBrands"
          :key="brand.brand_id"
          class="aspect-square bg-dark-50 rounded-xl p-4 flex items-center justify-center hover:bg-dark-100 hover:shadow-md transition-all cursor-pointer group"
          @click="goToBrands"
        >
          <img
            v-if="brand.logo_url"
            :src="brand.logo_url"
            :alt="brand.show_name"
            class="max-w-full max-h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity"
            loading="lazy"
            @error="($event.target as HTMLImageElement).style.display = 'none'"
          />
          <div v-else class="text-2xl font-bold text-dark-300 group-hover:text-primary-500 transition-colors">
            {{ brand.show_name.charAt(0) }}
          </div>
        </div>
      </div>
      
      <!-- 底部按钮 -->
      <div class="text-center mt-12">
        <button
          class="btn-outline"
          @click="goToBrands"
        >
          <i class="fas fa-star mr-2"></i>
          查看全部品牌
        </button>
      </div>
    </div>
  </section>
</template>

