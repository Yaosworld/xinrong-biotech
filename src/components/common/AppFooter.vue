<script setup lang="ts">
import { ref } from 'vue'

const currentYear = new Date().getFullYear()

const footerLinks = ref([
  {
    title: '产品服务',
    links: [
      { name: '产品中心', path: '/products' },
      { name: '品牌中心', path: '/brands' },
      { name: '资讯中心', path: '/news' }
    ]
  },
  {
    title: '关于我们',
    links: [
      { name: '公司介绍', path: '/about' },
      { name: '联系我们', path: '/about' }
    ]
  }
])

const contactInfo = ref({
  phone: '400-XXX-XXXX',
  email: 'contact@xinrong.com',
  address: '广州市天河区XXX路XXX号'
})
</script>

<template>
  <footer class="bg-dark-800 text-white">
    <div class="container-base py-12">
      <div class="grid md:grid-cols-4 gap-8">
        <!-- 公司信息 -->
        <div class="md:col-span-2">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center">
              <span class="text-white font-bold text-lg">XR</span>
            </div>
            <div>
              <div class="font-bold">广州信荣生物科技有限公司</div>
              <div class="text-xs text-dark-400">XINRONG BIOTECHNOLOGY</div>
            </div>
          </div>
          <p class="text-dark-400 text-sm leading-relaxed max-w-md">
            专注于生命科学领域的生物科技企业，为科研工作者提供优质的产品和专业的服务。
          </p>
        </div>
        
        <!-- 快捷链接 -->
        <div v-for="section in footerLinks" :key="section.title">
          <h3 class="font-semibold mb-4">{{ section.title }}</h3>
          <ul class="space-y-2">
            <li v-for="link in section.links" :key="link.name">
              <router-link
                :to="link.path"
                class="text-dark-400 hover:text-white transition-colors text-sm"
              >
                {{ link.name }}
              </router-link>
            </li>
          </ul>
        </div>
      </div>
      
      <!-- 联系方式 -->
      <div class="border-t border-dark-700 mt-8 pt-8">
        <div class="flex flex-wrap items-center justify-center gap-6 text-sm text-dark-400">
          <span class="flex items-center gap-2">
            <i class="fas fa-phone-alt"></i>
            {{ contactInfo.phone }}
          </span>
          <span class="flex items-center gap-2">
            <i class="fas fa-envelope"></i>
            {{ contactInfo.email }}
          </span>
          <span class="flex items-center gap-2">
            <i class="fas fa-map-marker-alt"></i>
            {{ contactInfo.address }}
          </span>
        </div>
      </div>
    </div>
    
    <!-- 版权信息 -->
    <div class="bg-dark-900 py-4">
      <div class="container-base text-center text-sm text-dark-500">
        <p>© {{ currentYear }} 广州信荣生物科技有限公司 版权所有</p>
      </div>
    </div>
  </footer>
</template>
