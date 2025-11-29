<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePageContentStore } from '@/stores/pageContentStore'
import { usePageShowcase } from '@/composables/usePageShowcase'
import ShowcaseBanner from '@/components/common/ShowcaseBanner.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import type { SectionTitleConfig } from '@/types'

const pageStore = usePageContentStore()
const { slogans: aboutSlogans, statsFromConfig: aboutStatsFromConfig } = usePageShowcase('about', [
  '专注生命科学领域的生物科技企业',
  '为科研工作者提供优质的产品和专业的服务'
])

// 页面内容
const pageContent = computed(() => pageStore.getPageContent?.('about') ?? pageStore.getPage('about'))

// 统计数据
const defaultAboutStats = [
  { key: 'years', number: '8+', label: '年行业经验' },
  { key: 'customers', number: '1000+', label: '合作客户' },
  { key: 'brands', number: '50+', label: '知名品牌' }
]
const stats = computed(() => aboutStatsFromConfig.value.length > 0 ? aboutStatsFromConfig.value : defaultAboutStats)

// 从数据源获取 sections 标题配置
const sections = computed<Record<string, SectionTitleConfig>>(() => pageContent.value?.sections || {})

// 从数据源获取介绍卡片
const introCards = computed(() => pageContent.value?.introCards || [])

// 从数据源获取核心优势
const advantages = computed(() => pageContent.value?.advantages || [])

// 从数据源获取联系信息
const contactInfo = computed(() => pageContent.value?.contact || {
  phone: '400-XXX-XXXX',
  email: 'contact@xinrong.com',
  address: '广州市天河区XXX路XXX号'
})

onMounted(async () => {
  await pageStore.loadPageContent('about')
})
</script>

<template>
  <div class="about-page pt-[72px]">
    <!-- 展示区 -->
    <ShowcaseBanner
      :slogans="aboutSlogans"
      :stats="stats"
    />
    
    <!-- 公司简介 -->
    <section class="py-16">
      <div class="container-base">
        <div class="text-center mb-10">
          <span class="section-badge">{{ sections.intro?.badge || '公司简介' }}</span>
          <h2 class="section-title">{{ sections.intro?.title || '值得信赖的科研合作伙伴' }}</h2>
        </div>
        
        <div v-if="pageStore.loading" class="py-10">
          <LoadingSpinner text="加载中..." />
        </div>
        
        <div v-else class="space-y-6">
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
    
    <!-- 核心优势 -->
    <section v-if="advantages.length > 0" class="py-16 bg-dark-50">
      <div class="container-base">
        <div class="text-center mb-10">
          <span class="section-badge">{{ sections.advantages?.badge || '核心优势' }}</span>
          <h2 class="section-title">{{ sections.advantages?.title || '为什么选择我们' }}</h2>
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
    
    <!-- 联系方式 -->
    <section class="py-16">
      <div class="container-base">
        <div class="text-center mb-10">
          <span class="section-badge">{{ sections.contact?.badge || '联系我们' }}</span>
          <h2 class="section-title">{{ sections.contact?.title || '期待与您的合作' }}</h2>
        </div>
        
        <div class="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div class="card-base p-6 text-center">
            <div class="w-14 h-14 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-phone-alt text-xl"></i>
            </div>
            <h3 class="font-semibold text-dark-800 mb-2">电话咨询</h3>
            <p class="text-dark-500">{{ contactInfo.phone }}</p>
          </div>
          
          <div class="card-base p-6 text-center">
            <div class="w-14 h-14 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-envelope text-xl"></i>
            </div>
            <h3 class="font-semibold text-dark-800 mb-2">邮箱</h3>
            <p class="text-dark-500">{{ contactInfo.email }}</p>
          </div>
          
          <div class="card-base p-6 text-center">
            <div class="w-14 h-14 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-map-marker-alt text-xl"></i>
            </div>
            <h3 class="font-semibold text-dark-800 mb-2">地址</h3>
            <p class="text-dark-500">{{ contactInfo.address }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
