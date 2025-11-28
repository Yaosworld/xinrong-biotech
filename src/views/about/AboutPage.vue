<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePageContentStore } from '@/stores/pageContentStore'
import ShowcaseBanner from '@/components/common/ShowcaseBanner.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const pageStore = usePageContentStore()

// 页面内容
const pageContent = computed(() => pageStore.getPageContent('about'))

// 页面标语
const slogans = [
  '专注生命科学领域的生物科技企业',
  '为科研工作者提供优质的产品和专业的服务'
]

// 统计数据
const stats = ref([
  { key: 'years', number: '8+', label: '年行业经验' },
  { key: 'customers', number: '1000+', label: '合作客户' },
  { key: 'brands', number: '50+', label: '知名品牌' }
])

// 介绍卡片
const introCards = ref([
  {
    icon: 'fas fa-building',
    title: '企业背景',
    content: '广州信荣生物科技有限公司成立于 2015 年，总部位于广州。作为一家专注于生命科学领域的生物科技企业，我们在医疗仪器、医疗材料、科研院校的生物试剂产品等领域拥有丰富的经验。我们致力于为科研工作者提供优质的产品和专业的服务。'
  },
  {
    icon: 'fas fa-shopping-cart',
    title: '产品优势',
    content: '公司代理的产品涵盖生命科学研究的多个方向，从先进仪器设备、到科学实验室的分子生物学、细胞生物学类的耗材，均为国际知名品牌，经过严格检测，确保产品质量卓越。'
  },
  {
    icon: 'fas fa-headset',
    title: '专业服务',
    content: '我们拥有专业的技术团队，能够为客户提供产品咨询、选型指导、技术培训及售后维护一体化服务。助力客户在生命科学研究领域取得卓越成果。'
  }
])

// 核心优势
const advantages = ref([
  {
    icon: 'fas fa-check-circle',
    title: '正规授权代理',
    content: '多个知名品牌官方授权代理，确保产品质量和售后服务'
  },
  {
    icon: 'fas fa-th-large',
    title: '品类齐全',
    content: '提供从基础试剂到高端仪器设备的全品类产品，满足一站式采购需求'
  },
  {
    icon: 'fas fa-bolt',
    title: '快速响应',
    content: '高效的订单处理流程，资深产品专家，准确且速达'
  },
  {
    icon: 'fas fa-warehouse',
    title: '专业仓储',
    content: '符合国际标准的仓储条件，保证产品质量稳定性和有效性'
  },
  {
    icon: 'fas fa-tags',
    title: '价格优势',
    content: '直接对接品牌方，减少中间环节，为客户提供更具竞争力的价格'
  }
])

onMounted(async () => {
  await pageStore.loadPageContent('about')
})
</script>

<template>
  <div class="about-page pt-[72px]">
    <!-- 展示区 -->
    <ShowcaseBanner
      :slogans="slogans"
      :stats="stats"
    />
    
    <!-- 公司简介 -->
    <section class="py-16">
      <div class="container-base">
        <div class="text-center mb-10">
          <span class="section-badge">公司简介</span>
          <h2 class="section-title">值得信赖的科研合作伙伴</h2>
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
    <section class="py-16 bg-dark-50">
      <div class="container-base">
        <div class="text-center mb-10">
          <span class="section-badge">核心优势</span>
          <h2 class="section-title">为什么选择我们</h2>
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
          <span class="section-badge">联系我们</span>
          <h2 class="section-title">期待与您的合作</h2>
        </div>
        
        <div class="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div class="card-base p-6 text-center">
            <div class="w-14 h-14 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-phone-alt text-xl"></i>
            </div>
            <h3 class="font-semibold text-dark-800 mb-2">电话咨询</h3>
            <p class="text-dark-500">400-XXX-XXXX</p>
          </div>
          
          <div class="card-base p-6 text-center">
            <div class="w-14 h-14 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-envelope text-xl"></i>
            </div>
            <h3 class="font-semibold text-dark-800 mb-2">邮箱</h3>
            <p class="text-dark-500">contact@xinrong.com</p>
          </div>
          
          <div class="card-base p-6 text-center">
            <div class="w-14 h-14 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-map-marker-alt text-xl"></i>
            </div>
            <h3 class="font-semibold text-dark-800 mb-2">地址</h3>
            <p class="text-dark-500">广州市天河区XXX路XXX号</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
