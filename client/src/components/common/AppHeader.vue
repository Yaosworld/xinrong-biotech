<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSiteStore } from '@/stores/siteStore'

const route = useRoute()
const router = useRouter()
const siteStore = useSiteStore()

// Logo图片加载状态
const logoError = ref(false)

// 从 store 获取联系信息
const primaryPhone = computed(() => siteStore.contact.phones[0] || '')
const email = computed(() => siteStore.contact.email || '')
const qq = computed(() => siteStore.contact.qq || '')
const wechatQrcode = computed(() => {
  const url = siteStore.contact.wechatQrcode || ''
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return url.startsWith('/') ? url : `/${url}`
})

// 导航菜单
const navItems = [
  { name: '首页', path: '/', icon: 'fas fa-home' },
  { name: '产品中心', path: '/products', icon: 'fas fa-flask' },
  { name: '资讯中心', path: '/news', icon: 'fas fa-newspaper' },
  { name: '品牌中心', path: '/brands', icon: 'fas fa-award' },
  { name: '关于我们', path: '/about', icon: 'fas fa-building' }
]

// 搜索相关
const searchInputValue = ref('')

// 响应式状态
const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

// 当前路由是否激活
const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  if (route.path === path) return true
  if (route.path.startsWith(path + '/')) return true
  return false
}

// 获取导航链接的样式类
const getNavLinkClasses = (path: string) => {
  const active = isActive(path)
  return active
    ? 'text-gradient-600 bg-gradient-50 font-semibold'
    : 'text-dark-600 hover:text-gradient-600 hover:bg-gradient-50'
}

// 滚动监听
const handleScroll = () => {
  isScrolled.value = window.scrollY > 10
}

// 切换移动端菜单
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

// 导航到页面
const navigateTo = (path: string) => {
  router.push(path)
  isMobileMenuOpen.value = false
}

// 搜索方法
const handleSearch = () => {
  const query = searchInputValue.value.trim()
  if (query) {
    router.push({ path: '/products', query: { search: query } })
    searchInputValue.value = ''
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll()
  siteStore.loadSiteConfig()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <header
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white"
    :class="isScrolled ? 'shadow-header' : ''"
  >
    <div class="header-container">
      <div class="header-layout">
        <!-- 左侧：Logo -->
        <router-link to="/" class="flex items-center gap-3 group flex-shrink-0">
          <div class="w-14 h-14 overflow-hidden bg-white flex items-center justify-center transition-transform group-hover:scale-105">
            <img
              v-if="!logoError"
              src="/images/common/logo.png"
              alt="信荣生物"
              class="w-full h-full object-contain"
              @error="logoError = true"
            />
            <span v-else class="text-gradient-600 font-bold text-xl">XR</span>
          </div>
          <div class="hidden sm:block logo-text-area">
            <div class="company-name-cn">{{ siteStore.company.name || '信荣生物' }}</div>
            <div class="company-name-en">{{ siteStore.company.englishName || 'XINRONG BIOTECHNOLOGY' }}</div>
          </div>
        </router-link>

        <!-- 中间：导航 -->
        <nav class="hidden lg:flex items-center justify-center gap-4">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-base font-medium transition-all duration-200"
            :class="getNavLinkClasses(item.path)"
          >
            <i :class="item.icon" class="text-base"></i>
            <span>{{ item.name }}</span>
          </router-link>
        </nav>

        <!-- 右侧：搜索框 + 联系信息 -->
        <div class="hidden lg:flex items-center gap-4 flex-shrink-0">
          <!-- 搜索框 -->
          <div class="header-search-box">
            <i class="fas fa-search text-dark-400 text-sm"></i>
            <input
              v-model="searchInputValue"
              type="text"
              placeholder="搜索产品、品牌..."
              class="header-search-input"
              @keyup.enter="handleSearch"
            />
            <button class="header-search-btn" @click="handleSearch">
              搜索
            </button>
          </div>
          
          <!-- 分隔线 -->
          <div class="h-10 w-px bg-dark-200"></div>
          
          <!-- 联系方式 -->
          <div class="contact-info">
            <div class="contact-item">
              <i class="fab fa-qq text-gradient-600"></i>
              <span>{{ qq }}</span>
            </div>
            <div class="contact-item">
              <i class="fas fa-phone-alt text-gradient-600"></i>
              <span>{{ primaryPhone }}</span>
            </div>
          </div>
          <!-- 微信二维码 -->
          <div class="qrcode-box group">
            <img 
              v-if="wechatQrcode" 
              :src="wechatQrcode" 
              alt="微信客服" 
              class="qrcode-img"
            />
          </div>
        </div>

        <!-- 移动端菜单按钮 -->
        <button
          class="lg:hidden p-3 rounded-lg text-dark-600 hover:bg-dark-100 transition-colors"
          @click="toggleMobileMenu"
        >
          <i :class="isMobileMenuOpen ? 'fas fa-times' : 'fas fa-bars'" class="text-2xl"></i>
        </button>
      </div>
    </div>

    <!-- 移动端菜单 -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <div
        v-if="isMobileMenuOpen"
        class="lg:hidden absolute top-full left-0 right-0 bg-white shadow-lg border-t border-dark-100"
      >
        <nav class="container-base py-4 space-y-2">
          <!-- 移动端搜索框 -->
          <div class="mobile-search-box mb-4">
            <i class="fas fa-search text-dark-400"></i>
            <input
              v-model="searchInputValue"
              type="text"
              placeholder="搜索产品、品牌..."
              class="mobile-search-input"
              @keyup.enter="handleSearch"
            />
            <button class="mobile-search-btn" @click="handleSearch">
              搜索
            </button>
          </div>
          
          <!-- 移动端联系信息 -->
          <div class="mobile-contact-box mb-4">
            <div class="flex items-center gap-3">
              <div class="flex-1">
                <div class="flex items-center gap-2 text-sm text-dark-600 mb-1">
                  <i class="fas fa-phone-alt text-gradient-600"></i>
                  <span>手机：{{ primaryPhone }}</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-dark-600">
                  <i class="fab fa-qq text-gradient-600"></i>
                  <span>QQ：{{ qq }}</span>
                </div>
              </div>
              <div class="w-12 h-12 rounded-lg overflow-hidden border border-dark-200">
                <img v-if="wechatQrcode" :src="wechatQrcode" alt="微信客服" class="w-full h-full object-cover" />
              </div>
            </div>
          </div>
          
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="w-full flex items-center gap-4 px-5 py-4 rounded-lg transition-colors"
            :class="getNavLinkClasses(item.path)"
            @click="navigateTo(item.path)"
          >
            <i :class="item.icon" class="w-6 text-center text-lg"></i>
            <span class="font-medium text-lg">{{ item.name }}</span>
          </router-link>
        </nav>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
/* Header 容器 - 更宽的布局 */
.header-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 24px;
}

@media (min-width: 1400px) {
  .header-container {
    padding: 0 40px;
  }
}

/* 三栏布局 */
.header-layout {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 2rem;
  height: 72px;
}

@media (min-width: 768px) {
  .header-layout {
    height: 80px;
  }
}

@media (min-width: 1400px) {
  .header-layout {
    gap: 3rem;
  }
}

/* Logo 文本区域 */
.logo-text-area {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.company-name-cn {
  @apply font-bold text-dark-800 transition-colors;
  font-size: 1.125rem;
  text-align: justify;
  text-align-last: justify;
  width: 100%;
}

.group:hover .company-name-cn {
  @apply text-gradient-600;
}

.company-name-en {
  @apply text-dark-400;
  font-size: 8px;
  white-space: nowrap;
}

@media (min-width: 768px) {
  .company-name-cn {
    font-size: 1.25rem;
  }
  .company-name-en {
    font-size: 9px;
  }
}

/* 联系信息区域 */
.contact-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-item {
  @apply flex items-center gap-2 text-xs text-dark-600;
}

.contact-item i {
  @apply text-xs;
  width: 14px;
}

/* 二维码区域 */
.qrcode-box {
  @apply flex flex-col items-center;
  @apply border border-dark-200 rounded-lg p-1;
  @apply transition-all duration-200;
}

.qrcode-box:hover {
  @apply border-gradient-400 shadow-sm;
}

.qrcode-img {
  @apply w-12 h-12 object-cover rounded;
}

/* 移动端联系信息 */
.mobile-contact-box {
  @apply px-4 py-3 bg-dark-50 rounded-xl border border-dark-200;
}

/* 桌面端搜索框 */
.header-search-box {
  @apply flex items-center gap-2 px-4 py-2;
  @apply bg-dark-50 border border-dark-200 rounded-full;
  @apply transition-all duration-200;
  width: 280px;
}

.header-search-box:focus-within {
  @apply border-gradient-400 bg-white shadow-sm;
}

.header-search-input {
  @apply flex-1 bg-transparent text-dark-700 placeholder-dark-400;
  @apply text-sm focus:outline-none;
  min-width: 0;
}

.header-search-btn {
  @apply px-3 py-1.5 bg-gradient-600 text-white rounded-full;
  @apply text-xs font-medium;
  @apply hover:bg-gradient-700 transition-colors;
}

/* 移动端搜索框 */
.mobile-search-box {
  @apply flex items-center gap-3 px-4 py-3;
  @apply bg-dark-50 rounded-xl border border-dark-200;
}

.mobile-search-input {
  @apply flex-1 bg-transparent text-dark-700 placeholder-dark-400;
  @apply text-base focus:outline-none;
}

.mobile-search-btn {
  @apply px-4 py-2 bg-gradient-600 text-white rounded-lg;
  @apply text-sm font-medium;
  @apply hover:bg-gradient-700 transition-colors;
}
</style>
