<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePromotionStore } from '@/stores/promotionStore'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import NewsCard from '@/components/business/NewsCard.vue'

const route = useRoute()
const router = useRouter()
const promotionStore = usePromotionStore()

const promotionId = computed(() => Number(route.params.id))
const imageError = ref(false)

// 当前促销活动
const promotion = computed(() => {
  return promotionStore.getPromotionById(promotionId.value)
})

// 相关活动
const relatedPromotions = computed(() => {
  if (!promotion.value) return []
  return promotionStore.sortedPromotions
    .filter(p => p.id !== promotion.value?.id)
    .slice(0, 3)
})

// 状态颜色
const statusColorClass = computed(() => {
  switch (promotion.value?.status) {
    case 'active':
      return 'bg-green-100 text-green-700'
    case 'coming':
      return 'bg-yellow-100 text-yellow-700'
    case 'ended':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
})

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// 计算折扣
const discountPercentage = computed(() => {
  if (!promotion.value?.original_price || !promotion.value?.current_price) return 0
  return Math.round((1 - promotion.value.current_price / promotion.value.original_price) * 100)
})

// 返回资讯中心
const goBack = () => {
  router.push('/news')
}

onMounted(async () => {
  await promotionStore.loadPromotions()
})
</script>

<template>
  <div class="promotion-detail pt-20">
    <!-- 加载状态 -->
    <div v-if="promotionStore.loading" class="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" text="加载活动详情..." />
    </div>
    
    <!-- 活动未找到 -->
    <div v-else-if="!promotion" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <i class="fas fa-bullhorn text-6xl text-dark-300 mb-6"></i>
        <h2 class="text-2xl font-bold text-dark-700 mb-4">活动未找到</h2>
        <p class="text-dark-500 mb-6">抱歉，您查找的活动不存在或已下架</p>
        <button class="btn-primary" @click="goBack">
          <i class="fas fa-arrow-left mr-2"></i>
          返回资讯中心
        </button>
      </div>
    </div>
    
    <!-- 活动详情 -->
    <template v-else>
      <!-- 活动头图 -->
      <section class="relative h-64 md:h-96 bg-dark-900 overflow-hidden">
        <img
          v-if="!imageError && promotion.image_url"
          :src="promotion.image_url"
          :alt="promotion.title"
          class="w-full h-full object-cover opacity-50"
          @error="imageError = true"
        />
        <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-600 to-tech-600">
          <i :class="promotion.icon_class || 'fas fa-bullhorn'" class="text-8xl text-white/30"></i>
        </div>
        
        <!-- 状态标签 -->
        <div
          class="absolute top-6 right-6 px-4 py-2 rounded-full font-medium"
          :class="statusColorClass"
        >
          {{ promotion.statusText }}
        </div>
      </section>
      
      <!-- 主要内容 -->
      <section class="py-12">
        <div class="container-base">
          <div class="max-w-3xl mx-auto">
            <!-- 日期 -->
            <div
              v-if="promotion.start_date && promotion.end_date"
              class="flex items-center text-dark-500 mb-4"
            >
              <i class="fas fa-calendar-alt mr-2"></i>
              <span>{{ formatDate(promotion.start_date) }} - {{ formatDate(promotion.end_date) }}</span>
            </div>
            
            <!-- 标题 -->
            <h1 class="text-3xl md:text-4xl font-bold text-dark-900 mb-6">
              {{ promotion.title }}
            </h1>
            
            <!-- 摘要 -->
            <p class="text-xl text-dark-600 mb-8 leading-relaxed">
              {{ promotion.summary }}
            </p>
            
            <!-- 价格信息 -->
            <div v-if="promotion.current_price || promotion.original_price" class="bg-primary-50 rounded-2xl p-6 mb-8">
              <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div class="text-sm text-dark-500 mb-2">活动价格</div>
                  <div class="flex items-baseline gap-4">
                    <span
                      v-if="promotion.current_price"
                      class="text-4xl font-bold text-primary-600"
                    >
                      ¥{{ promotion.current_price.toLocaleString() }}
                    </span>
                    <span
                      v-if="promotion.original_price && promotion.current_price && promotion.current_price < promotion.original_price"
                      class="text-xl text-dark-400 line-through"
                    >
                      ¥{{ promotion.original_price.toLocaleString() }}
                    </span>
                  </div>
                </div>
                <div v-if="discountPercentage > 0" class="text-right">
                  <div
                    class="inline-flex items-center px-4 py-2 bg-red-500 text-white font-bold rounded-lg"
                  >
                    <i class="fas fa-fire mr-2"></i>
                    立省 {{ discountPercentage }}%
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 详细描述 -->
            <div v-if="promotion.description" class="prose prose-lg max-w-none mb-8">
              <h2 class="text-2xl font-bold text-dark-900 mb-4">活动详情</h2>
              <p class="text-dark-600 leading-relaxed whitespace-pre-wrap">
                {{ promotion.description }}
              </p>
            </div>
            
            <!-- 适用产品 -->
            <div v-if="promotion.applicable_products" class="bg-dark-50 rounded-xl p-6 mb-8">
              <h3 class="font-semibold text-dark-800 mb-2">
                <i class="fas fa-box mr-2"></i>
                适用产品
              </h3>
              <p class="text-dark-600">{{ promotion.applicable_products }}</p>
            </div>
            
            <!-- 标签 -->
            <div v-if="promotion.tags?.length" class="mb-8">
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="tag in promotion.tags"
                  :key="tag"
                  class="px-3 py-1 bg-dark-100 text-dark-600 rounded-full text-sm"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="flex gap-4">
              <button class="btn-primary flex-1">
                <i class="fas fa-phone-alt mr-2"></i>
                立即咨询
              </button>
              <button class="btn-secondary" @click="goBack">
                <i class="fas fa-arrow-left mr-2"></i>
                返回列表
              </button>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 相关活动 -->
      <section v-if="relatedPromotions.length > 0" class="py-12 bg-dark-50">
        <div class="container-base">
          <h2 class="text-2xl font-bold text-dark-900 mb-8">更多活动</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <NewsCard
              v-for="p in relatedPromotions"
              :key="p.id"
              :promotion="p"
            />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

