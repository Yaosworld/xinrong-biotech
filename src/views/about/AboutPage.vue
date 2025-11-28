<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { usePageContentStore } from '@/stores/pageContentStore'
import SectionTitle from '@/components/common/SectionTitle.vue'

const pageContentStore = usePageContentStore()

// 公司特色
const features = ref([
  {
    icon: 'fas fa-flask',
    title: '专业品质',
    description: '严选全球顶级品牌产品，确保每一件商品都符合最高标准'
  },
  {
    icon: 'fas fa-shipping-fast',
    title: '快速配送',
    description: '完善的物流体系，确保产品安全、快速送达您手中'
  },
  {
    icon: 'fas fa-headset',
    title: '专业服务',
    description: '资深技术团队提供专业咨询，解决您的所有疑问'
  },
  {
    icon: 'fas fa-certificate',
    title: '品质保证',
    description: '所有产品均有正品保证，支持售后服务'
  }
])

// 发展历程
const timeline = ref([
  {
    year: '2010',
    title: '公司成立',
    description: '在北京中关村科技园区成立，开始从事生物科技产品代理业务'
  },
  {
    year: '2013',
    title: '业务拓展',
    description: '与多家国际知名品牌建立合作关系，产品线覆盖实验仪器、耗材、试剂等领域'
  },
  {
    year: '2016',
    title: '自主品牌',
    description: '推出自主品牌产品线，开始自主研发高品质实验耗材'
  },
  {
    year: '2020',
    title: '数字化转型',
    description: '全面升级数字化服务平台，提供更便捷的在线采购体验'
  },
  {
    year: '2023',
    title: '持续创新',
    description: '持续扩大产品线，服务客户超过1000家科研机构和企业'
  }
])

onMounted(() => {
  pageContentStore.fetchPage('about')
})
</script>

<template>
  <div class="about-page pt-20">
    <!-- 页面头部 -->
    <section class="showcase-section py-16">
      <div class="container-base">
        <h1 class="showcase-title text-center mb-4">关于我们</h1>
        <p class="text-xl text-dark-300 text-center max-w-2xl mx-auto">
          专注生物科技领域，为科研事业保驾护航
        </p>
      </div>
    </section>
    
    <!-- 公司介绍 -->
    <section class="py-16 bg-white">
      <div class="container-base">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 class="text-3xl font-bold text-dark-900 mb-6">
              我们的使命
            </h2>
            <p class="text-dark-600 leading-relaxed mb-6">
              作为一家专注于生物科技领域的企业，我们致力于为科研机构、医疗企业和高等院校提供高品质的科学仪器、实验耗材和生物试剂。
            </p>
            <p class="text-dark-600 leading-relaxed mb-6">
              自2010年成立以来，我们始终坚持"品质第一、服务至上"的理念，与全球100多家知名品牌建立了紧密的合作关系，
              为客户提供超过3000种优质产品。
            </p>
            <p class="text-dark-600 leading-relaxed">
              我们的团队由经验丰富的生物科技专家组成，能够为客户提供专业的技术支持和解决方案，
              帮助客户在科研工作中取得突破性进展。
            </p>
          </div>
          <div class="relative">
            <div class="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-primary-100 to-tech-100">
              <div class="w-full h-full flex items-center justify-center">
                <i class="fas fa-microscope text-8xl text-primary-500/30"></i>
              </div>
            </div>
            <!-- 装饰元素 -->
            <div class="absolute -bottom-6 -right-6 w-24 h-24 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg">
              <div class="text-white text-center">
                <div class="text-2xl font-bold">15+</div>
                <div class="text-xs">年经验</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 公司特色 -->
    <section class="py-16 bg-dark-50">
      <div class="container-base">
        <SectionTitle
          title="为什么选择我们"
          subtitle="专业、高效、值得信赖"
        />
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow"
          >
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
              <i :class="feature.icon" class="text-2xl text-primary-600"></i>
            </div>
            <h3 class="text-lg font-semibold text-dark-800 mb-2">{{ feature.title }}</h3>
            <p class="text-dark-500 text-sm">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 发展历程 -->
    <section class="py-16 bg-white">
      <div class="container-base">
        <SectionTitle
          title="发展历程"
          subtitle="十五年砥砺前行，见证每一个重要时刻"
        />
        
        <div class="relative max-w-3xl mx-auto">
          <!-- 时间线 -->
          <div class="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-primary-200 transform md:-translate-x-1/2"></div>
          
          <div class="space-y-12">
            <div
              v-for="(item, index) in timeline"
              :key="item.year"
              class="relative flex items-start md:justify-center"
            >
              <!-- 时间点 -->
              <div class="absolute left-8 md:left-1/2 w-4 h-4 rounded-full bg-primary-500 border-4 border-white shadow transform -translate-x-1/2 mt-1"></div>
              
              <!-- 内容 -->
              <div
                class="ml-16 md:ml-0 md:w-1/2"
                :class="index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12 md:ml-auto'"
              >
                <div class="bg-dark-50 rounded-xl p-6">
                  <div class="text-2xl font-bold text-primary-600 mb-2">{{ item.year }}</div>
                  <h3 class="text-lg font-semibold text-dark-800 mb-2">{{ item.title }}</h3>
                  <p class="text-dark-500">{{ item.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 联系我们 -->
    <section class="py-16 bg-gradient-to-br from-dark-900 to-dark-800 text-white">
      <div class="container-base text-center">
        <h2 class="text-3xl font-bold mb-4">与我们取得联系</h2>
        <p class="text-dark-300 mb-8 max-w-xl mx-auto">
          无论您有任何问题或需求，我们的专业团队都将竭诚为您服务
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="tel:400-123-4567" class="btn-primary text-lg px-8">
            <i class="fas fa-phone-alt mr-2"></i>
            400-123-4567
          </a>
          <a href="mailto:contact@biotech.com" class="btn-outline border-white/30 text-white hover:bg-white hover:text-dark-900 text-lg px-8">
            <i class="fas fa-envelope mr-2"></i>
            发送邮件
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

