<script setup lang="ts">
import { computed, onMounted } from 'vue'
import ShowcaseBanner from '@/components/common/ShowcaseBanner.vue'
import { useSiteStore } from '@/stores/siteStore'
import { useAboutStore } from '@/stores/aboutStore'

const siteStore = useSiteStore()
const aboutStore = useAboutStore()

// 从 store 获取数据
const contact = computed(() => siteStore.contact)
const banner = computed(() => aboutStore.banner)
const sections = computed(() => aboutStore.sections)
const introCards = computed(() => aboutStore.introCards)
const advantages = computed(() => aboutStore.advantages)

// 响应式判断
const hasIntroCards = computed(() => aboutStore.hasIntroCards)
const hasAdvantages = computed(() => aboutStore.hasAdvantages)
const hasBannerSlogans = computed(() => aboutStore.hasBannerSlogans)
const hasBannerStats = computed(() => aboutStore.hasBannerStats)

// 加载数据
onMounted(async () => {
  await aboutStore.loadAboutData()
})
</script>

<template>
  <div class="about-page pt-[72px]">
    <!-- 展示区 - 只在有数据时显示 -->
    <ShowcaseBanner
      v-if="hasBannerSlogans || hasBannerStats"
      :slogans="banner.slogans"
      :stats="banner.stats"
    />
    
    <!-- 公司简介 - 只在有介绍卡片时显示 -->
    <section v-if="hasIntroCards" class="py-16">
      <div class="container-base">
        <div class="text-center mb-10">
          <span class="section-badge">{{ sections.intro.badge }}</span>
          <h2 class="section-title">{{ sections.intro.title }}</h2>
        </div>

        <div class="space-y-6">
          <div
            v-for="(card, index) in introCards"
            :key="index"
            class="intro-card"
          >
            <div class="flex items-start gap-4">
              <div class="intro-card-icon">
                <i :class="card.icon"></i>
              </div>
              <div class="flex-1">
                <h3 class="intro-card-title">{{ card.title }}</h3>
                <p class="intro-card-content">{{ card.content }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 核心优势 - 只在有优势数据时显示 -->
    <section v-if="hasAdvantages" class="py-16 bg-dark-50">
      <div class="container-base">
        <div class="text-center mb-10">
          <span class="section-badge">{{ sections.advantages.badge }}</span>
          <h2 class="section-title">{{ sections.advantages.title }}</h2>
        </div>
        
        <div class="max-w-3xl mx-auto advantage-timeline">
          <div
            v-for="(item, index) in advantages"
            :key="index"
            class="advantage-item"
          >
            <div class="advantage-number">
              {{ String(index + 1).padStart(2, '0') }}
            </div>
            <div class="advantage-content">
              <div class="flex items-center gap-3 mb-2">
                <div class="advantage-icon">
                  <i :class="item.icon"></i>
                </div>
                <h3 class="text-lg font-semibold text-dark-800">{{ item.title }}</h3>
              </div>
              <p class="text-dark-500 text-sm">{{ item.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 联系方式 - 始终显示 -->
    <section class="py-16">
      <div class="container-base">
        <div class="text-center mb-10">
          <span class="section-badge">{{ sections.contact.badge }}</span>
          <h2 class="section-title">{{ sections.contact.title }}</h2>
        </div>

        <div class="max-w-4xl mx-auto space-y-6">
          <!-- 电话号码 -->
          <div class="card-base p-6">
            <div class="flex items-center gap-6">
              <div class="w-16 h-16 rounded-xl bg-gradient-100 text-gradient-600 flex items-center justify-center flex-shrink-0">
                <i class="fas fa-phone-alt text-xl"></i>
              </div>
              <div class="w-24 flex-shrink-0">
                <h3 class="font-semibold text-dark-800 text-lg">电话咨询</h3>
              </div>
              <div class="flex-1">
                <div class="space-y-1">
                  <p v-for="phone in contact.phones" :key="phone" class="text-dark-600 text-lg">
                    {{ phone }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- 邮箱 -->
          <div class="card-base p-6">
            <div class="flex items-center gap-6">
              <div class="w-16 h-16 rounded-xl bg-gradient-100 text-gradient-600 flex items-center justify-center flex-shrink-0">
                <i class="fas fa-envelope text-xl"></i>
              </div>
              <div class="w-24 flex-shrink-0">
                <h3 class="font-semibold text-dark-800 text-lg">邮箱</h3>
              </div>
              <div class="flex-1">
                <p class="text-dark-600 text-lg">{{ contact.email }}</p>
              </div>
            </div>
          </div>

          <!-- 微信 -->
          <div class="card-base p-6">
            <div class="flex items-center gap-6">
              <div class="w-16 h-16 rounded-xl bg-gradient-100 text-gradient-600 flex items-center justify-center flex-shrink-0">
                <i class="fab fa-weixin text-xl"></i>
              </div>
              <div class="w-24 flex-shrink-0">
                <h3 class="font-semibold text-dark-800 text-lg">微信客服</h3>
              </div>
              <div class="flex-1 flex items-center">
                <img
                  :src="contact.wechatQrcode"
                  alt="微信二维码"
                  class="w-20 h-20 object-contain border border-gray-200 rounded-lg p-1 bg-white"
                />
              </div>
            </div>
          </div>

          <!-- 公司地址 -->
          <div class="card-base p-6">
            <div class="flex items-center gap-6">
              <div class="w-16 h-16 rounded-xl bg-gradient-100 text-gradient-600 flex items-center justify-center flex-shrink-0">
                <i class="fas fa-map-marker-alt text-xl"></i>
              </div>
              <div class="w-24 flex-shrink-0">
                <h3 class="font-semibold text-dark-800 text-lg">公司地址</h3>
              </div>
              <div class="flex-1">
                <p class="text-dark-600 text-lg">{{ contact.address }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 介绍卡片样式 */
.intro-card {
  @apply bg-white rounded-2xl p-6 shadow-sm border border-gray-100;
  @apply transition-all duration-300 hover:shadow-md hover:border-gradient-200;
}

.intro-card-icon {
  @apply w-14 h-14 rounded-xl bg-gradient-100 text-gradient-600;
  @apply flex items-center justify-center text-2xl flex-shrink-0;
}

.intro-card-title {
  @apply text-xl font-semibold text-dark-800 mb-2;
}

.intro-card-content {
  @apply text-dark-600 leading-relaxed;
}

/* 优势时间线样式 */
.advantage-timeline {
  @apply relative;
}

.advantage-timeline::before {
  content: '';
  @apply absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-200;
}

.advantage-item {
  @apply relative flex gap-6 mb-8 last:mb-0;
}

.advantage-number {
  @apply w-16 h-16 rounded-full bg-gradient-600 text-white;
  @apply flex items-center justify-center font-bold text-lg;
  @apply flex-shrink-0 relative z-10;
  @apply shadow-lg;
}

.advantage-content {
  @apply flex-1 bg-white rounded-xl p-6 shadow-sm border border-gray-100;
  @apply transition-all duration-300 hover:shadow-md hover:border-gradient-200;
}

.advantage-icon {
  @apply w-10 h-10 rounded-lg bg-gradient-100 text-gradient-600;
  @apply flex items-center justify-center text-lg;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .advantage-timeline::before {
    @apply left-6;
  }

  .advantage-number {
    @apply w-12 h-12 text-base;
  }

  .advantage-item {
    @apply gap-4;
  }

  .card-base {
    @apply flex-col items-start !important;
  }

  .card-base > div {
    @apply flex-col items-start w-full !important;
  }

  .card-base .w-24 {
    @apply w-full mb-2;
  }
}
</style>
