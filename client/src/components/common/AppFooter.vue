<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSiteStore } from '@/stores/siteStore'

const siteStore = useSiteStore()

// Logo图片加载状态
const logoError = ref(false)

// 从 store 获取数据
const company = computed(() => siteStore.company)
const contact = computed(() => siteStore.contact)
const footerLinks = computed(() => siteStore.footerLinks)
const friendLinks = computed(() => siteStore.friendLinks)
const copyright = computed(() => siteStore.copyright)
</script>

<template>
  <footer class="bg-dark-800 text-white relative z-10">
    <div class="container-base py-12">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        <!-- 公司信息 -->
        <div class="lg:col-span-2">
          <div class="flex items-center gap-3 mb-4">
            <!-- Logo图标 -->
            <div class="w-11 h-11 overflow-hidden bg-white flex items-center justify-center transition-transform">
              <img
                v-if="!logoError"
                :src="company.logo"
                :alt="company.shortName"
                class="w-full h-full object-contain"
                @error="logoError = true"
              />
              <span v-else class="text-primary-600 font-bold text-lg">XR</span>
            </div>
            <!-- 公司名称 -->
            <div>
              <div class="text-lg font-bold text-white">{{ company.name }}</div>
              <div class="text-[10px] text-dark-400 tracking-wide">{{ company.englishName }}</div>
            </div>
          </div>

          <!-- 二维码图片 -->
          <div class="flex gap-6 mt-6">
            <!-- 微信二维码 -->
            <div class="flex flex-col items-center">
              <div class="w-16 h-16 bg-white rounded-lg p-0.5 shadow-sm">
                <img
                  :src="contact.wechatQrcode"
                  alt="微信客服"
                  class="w-full h-full object-contain"
                />
              </div>
              <p class="text-xs text-white mt-2">微信客服</p>
            </div>

            <!-- 公众号二维码 -->
            <div class="flex flex-col items-center">
              <div class="w-16 h-16 bg-white rounded-lg p-0.5 shadow-sm">
                <img
                  :src="contact.gzhQrcode"
                  alt="微信公众号"
                  class="w-full h-full object-contain"
                />
              </div>
              <p class="text-xs text-white mt-2">微信公众号</p>
            </div>
          </div>
        </div>

        <!-- 网站服务 -->
        <div>
          <h3 class="font-semibold mb-4">网站服务</h3>
          <ul class="space-y-2">
            <li v-for="link in footerLinks" :key="link.name">
              <router-link
                :to="link.path"
                class="text-dark-400 hover:text-white transition-colors text-sm"
              >
                {{ link.name }}
              </router-link>
            </li>
          </ul>
        </div>

        <!-- 友情链接 -->
        <div>
          <h3 class="font-semibold mb-4">友情链接</h3>
          <ul class="space-y-2">
            <li v-for="link in friendLinks" :key="link.name">
              <a
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-dark-400 hover:text-white transition-colors text-sm"
              >
                {{ link.name }}
              </a>
            </li>
          </ul>
        </div>

        <!-- 联系我们 -->
        <div>
          <h3 class="font-semibold mb-4">联系我们</h3>
          <div class="space-y-3">
            <!-- 手机号码 -->
            <div class="space-y-1">
              <div 
                v-for="phone in contact.phones" 
                :key="phone"
                class="flex items-center gap-2 text-sm text-dark-400"
              >
                <i class="fas fa-phone-alt"></i>
                <span>{{ phone }}</span>
              </div>
            </div>

            <!-- 邮箱 -->
            <div class="flex items-center gap-2 text-sm text-dark-400">
              <i class="fas fa-envelope"></i>
              <span>{{ contact.email }}</span>
            </div>

            <!-- 地址 -->
            <div class="flex items-start gap-2 text-sm text-dark-400">
              <i class="fas fa-map-marker-alt mt-1"></i>
              <span class="leading-tight">{{ contact.address }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 版权信息 -->
    <div class="bg-dark-900 py-4">
      <div class="container-base text-center text-sm text-dark-500">
        <p>{{ copyright }}</p>
        <p class="mt-2 flex items-center justify-center gap-4 flex-wrap">
          <a 
            href="https://beian.miit.gov.cn/" 
            target="_blank" 
            rel="noopener noreferrer"
            class="hover:text-white transition-colors"
          >
            ICP备案号：粤ICP备2025507620号
          </a>
          <span class="flex items-center gap-1">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm4 10H8v-1c0-1.33 2.67-2 4-2s4 .67 4 2v1z"/>
            </svg>
            <a 
              href="http://www.beian.gov.cn/portal/registerSystemInfo" 
              target="_blank" 
              rel="noopener noreferrer"
              class="hover:text-white transition-colors"
            >
              粤公网安备 44xxxxxxxxx号
            </a>
          </span>
        </p>
      </div>
    </div>
  </footer>
</template>
