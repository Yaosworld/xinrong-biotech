<script setup lang="ts">
import { ref } from 'vue'

const currentYear = new Date().getFullYear()

// Logo图片加载状态
const logoError = ref(false)

const footerLinks = ref([
  {
    title: '网站服务',
    links: [
      { name: '产品中心', path: '/products' },
      { name: '资讯中心', path: '/news' },
      { name: '品牌中心', path: '/brands' },
      { name: '关于我们', path: '/about' }
    ]
  }
])

const friendLinks = ref([
  { name: '锐竞平台', url: 'https://www.ringbio.com' },
  { name: '喀斯玛平台', url: 'https://www.casmart.com.cn' },
  { name: '丁香平台', url: 'https://www.dxy.cn' }
])

const contactInfo = ref({
  phone1: '15919646073',
  phone2: '13422057239',
  email: '15919646073@139.com',
  address: '广东省广州市黄埔区云埔街道双井东路2号鸫汇商业中心612'
})
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
                src="/images/common/logo.png"
                alt="信荣生物"
                class="w-full h-full object-contain"
                @error="logoError = true"
              />
              <span v-else class="text-primary-600 font-bold text-lg">XR</span>
            </div>
            <!-- 公司名称 -->
            <div>
              <div class="text-lg font-bold text-white">广州信荣生物科技有限公司</div>
              <div class="text-[10px] text-dark-400 tracking-wide">GUANGZHOU XINRONG BIOTECHNOLOGY CO., LTD.</div>
            </div>
          </div>

          <!-- 二维码图片 -->
          <div class="flex gap-6 mt-6">
            <!-- 微信二维码 -->
            <div class="flex flex-col items-center">
              <div class="w-16 h-16 bg-white rounded-lg p-0.5 shadow-sm">
                <img
                  src="/images/common/wx-qrcode-contact.png"
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
                  src="/images/common/gzh-qrcode.jpg"
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
            <li v-for="link in footerLinks[0].links" :key="link.name">
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
              <div class="flex items-center gap-2 text-sm text-dark-400">
                <i class="fas fa-phone-alt"></i>
                <span>{{ contactInfo.phone1 }}</span>
              </div>
              <div class="flex items-center gap-2 text-sm text-dark-400">
                <i class="fas fa-phone-alt"></i>
                <span>{{ contactInfo.phone2 }}</span>
              </div>
            </div>

            <!-- 邮箱 -->
            <div class="flex items-center gap-2 text-sm text-dark-400">
              <i class="fas fa-envelope"></i>
              <span>{{ contactInfo.email }}</span>
            </div>

            <!-- 地址 -->
            <div class="flex items-start gap-2 text-sm text-dark-400">
              <i class="fas fa-map-marker-alt mt-1"></i>
              <span class="leading-tight">{{ contactInfo.address }}</span>
            </div>

            </div>
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
