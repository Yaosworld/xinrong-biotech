<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePageContentStore } from '@/stores/pageContentStore'

const pageContentStore = usePageContentStore()

// 网站信息
const siteInfo = computed(() => pageContentStore.siteInfo)

// 快速链接
const quickLinks = [
  { name: '产品中心', path: '/products' },
  { name: '品牌中心', path: '/brands' },
  { name: '资讯中心', path: '/news' },
  { name: '关于我们', path: '/about' }
]

// 产品分类链接
const categoryLinks = [
  { name: '精密仪器', path: '/products?category=C01' },
  { name: '实验耗材', path: '/products?category=C02' },
  { name: '生物试剂', path: '/products?category=C03' }
]

onMounted(() => {
  pageContentStore.loadSiteInfo()
})
</script>

<template>
  <footer class="bg-dark-900 text-white">
    <!-- 主要内容区 -->
    <div class="container-base py-12 md:py-16">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
        <!-- 公司信息 -->
        <div class="lg:col-span-1">
          <div class="flex items-center space-x-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-tech-600 flex items-center justify-center">
              <i class="fas fa-dna text-white text-xl"></i>
            </div>
            <span class="text-xl font-bold font-display">
              {{ siteInfo?.name || '生物科技' }}
            </span>
          </div>
          <p class="text-dark-400 text-sm leading-relaxed mb-6">
            专注于生物科技领域，为客户提供高品质的科学仪器、实验耗材和生物试剂，助力科研创新与产业发展。
          </p>
          <!-- 社交媒体 -->
          <div class="flex space-x-4">
            <a href="#" class="w-10 h-10 rounded-lg bg-dark-800 hover:bg-primary-600 flex items-center justify-center transition-colors">
              <i class="fab fa-weixin"></i>
            </a>
            <a href="#" class="w-10 h-10 rounded-lg bg-dark-800 hover:bg-primary-600 flex items-center justify-center transition-colors">
              <i class="fab fa-weibo"></i>
            </a>
            <a href="#" class="w-10 h-10 rounded-lg bg-dark-800 hover:bg-primary-600 flex items-center justify-center transition-colors">
              <i class="fab fa-linkedin"></i>
            </a>
          </div>
        </div>

        <!-- 快速链接 -->
        <div>
          <h3 class="text-lg font-semibold mb-6">快速链接</h3>
          <ul class="space-y-3">
            <li v-for="link in quickLinks" :key="link.path">
              <router-link
                :to="link.path"
                class="text-dark-400 hover:text-primary-400 transition-colors flex items-center space-x-2"
              >
                <i class="fas fa-chevron-right text-xs"></i>
                <span>{{ link.name }}</span>
              </router-link>
            </li>
          </ul>
        </div>

        <!-- 产品分类 -->
        <div>
          <h3 class="text-lg font-semibold mb-6">产品分类</h3>
          <ul class="space-y-3">
            <li v-for="link in categoryLinks" :key="link.path">
              <router-link
                :to="link.path"
                class="text-dark-400 hover:text-primary-400 transition-colors flex items-center space-x-2"
              >
                <i class="fas fa-chevron-right text-xs"></i>
                <span>{{ link.name }}</span>
              </router-link>
            </li>
          </ul>
        </div>

        <!-- 联系方式 -->
        <div>
          <h3 class="text-lg font-semibold mb-6">联系我们</h3>
          <ul class="space-y-4">
            <li class="flex items-start space-x-3">
              <i class="fas fa-phone text-primary-500 mt-1"></i>
              <div>
                <p class="text-sm text-dark-400">客服热线</p>
                <p class="font-medium">{{ siteInfo?.contact?.phone || '400-123-4567' }}</p>
              </div>
            </li>
            <li class="flex items-start space-x-3">
              <i class="fas fa-envelope text-primary-500 mt-1"></i>
              <div>
                <p class="text-sm text-dark-400">电子邮箱</p>
                <p class="font-medium">{{ siteInfo?.contact?.email || 'contact@biotech.com' }}</p>
              </div>
            </li>
            <li class="flex items-start space-x-3">
              <i class="fas fa-map-marker-alt text-primary-500 mt-1"></i>
              <div>
                <p class="text-sm text-dark-400">公司地址</p>
                <p class="font-medium text-sm">{{ siteInfo?.contact?.address || '北京市海淀区中关村大街1号' }}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 底部版权 -->
    <div class="border-t border-dark-800">
      <div class="container-base py-6 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
        <p class="text-dark-400 text-sm">
          {{ siteInfo?.footer?.copyright || '© 2025 生物科技企业. 保留所有权利.' }}
        </p>
        <div class="flex items-center space-x-6 text-sm text-dark-400">
          <a href="#" class="hover:text-primary-400 transition-colors">隐私政策</a>
          <a href="#" class="hover:text-primary-400 transition-colors">使用条款</a>
          <a href="#" class="hover:text-primary-400 transition-colors">网站地图</a>
        </div>
      </div>
    </div>
  </footer>
</template>

