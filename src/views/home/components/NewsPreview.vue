<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePromotionStore } from '@/stores/promotionStore'
import SectionTitle from '@/components/common/SectionTitle.vue'
import NewsCard from '@/components/business/NewsCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const router = useRouter()
const promotionStore = usePromotionStore()

// 获取前3个促销活动作为预览（优先显示进行中的）
const previewPromotions = computed(() => {
  return promotionStore.sortedPromotions.slice(0, 3)
})

const goToNews = () => {
  router.push('/news')
}
</script>

<template>
  <section class="py-16 md:py-24 bg-dark-50">
    <div class="container-base">
      <SectionTitle
        title="最新活动"
        subtitle="了解我们的最新促销活动和优惠信息"
      >
        <template #extra>
          <button
            class="mt-6 btn-outline text-sm"
            @click="goToNews"
          >
            查看全部活动
            <i class="fas fa-arrow-right ml-2"></i>
          </button>
        </template>
      </SectionTitle>
      
      <!-- 加载状态 -->
      <div v-if="promotionStore.loading" class="py-20">
        <LoadingSpinner size="lg" text="加载活动中..." />
      </div>
      
      <!-- 活动网格 -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <NewsCard
          v-for="promotion in previewPromotions"
          :key="promotion.id"
          :promotion="promotion"
        />
      </div>
      
      <!-- 底部按钮 -->
      <div class="text-center mt-12">
        <button
          class="btn-primary"
          @click="goToNews"
        >
          <i class="fas fa-newspaper mr-2"></i>
          查看更多活动
        </button>
      </div>
    </div>
  </section>
</template>

