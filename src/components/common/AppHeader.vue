<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePageContentStore } from '@/stores/pageContentStore'

const route = useRoute()
const router = useRouter()
const pageContentStore = usePageContentStore()

// 导航菜单
const navItems = [
  { name: '首页', path: '/', icon: 'fas fa-home' },
  { name: '产品中心', path: '/products', icon: 'fas fa-box' },
  { name: '品牌中心', path: '/brands', icon: 'fas fa-star' },
  { name: '资讯中心', path: '/news', icon: 'fas fa-newspaper' },
  { name: '关于我们', path: '/about', icon: 'fas fa-info-circle' }
]

// 响应式状态
const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

// 网站信息
const siteInfo = computed(() => pageContentStore.siteInfo)

// 当前路由是否激活
const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

// 滚动监听
const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
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

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  pageContentStore.loadSiteInfo()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <header
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    :class="[
      isScrolled
        ? 'bg-white/95 backdrop-blur-md shadow-md'
        : 'bg-transparent'
    ]"
  >
    <div class="container-base">
      <div class="flex items-center justify-between h-16 md:h-20">
        <!-- Logo -->
        <router-link to="/" class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-tech-600 flex items-center justify-center">
            <i class="fas fa-dna text-white text-xl"></i>
          </div>
          <span
            class="text-xl font-bold font-display transition-colors"
            :class="isScrolled ? 'text-dark-900' : 'text-dark-900'"
          >
            {{ siteInfo?.name || '生物科技' }}
          </span>
        </router-link>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center space-x-1">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="px-4 py-2 rounded-lg font-medium transition-all duration-200"
            :class="[
              isActive(item.path)
                ? 'bg-primary-100 text-primary-700'
                : isScrolled
                  ? 'text-dark-600 hover:text-primary-600 hover:bg-primary-50'
                  : 'text-dark-700 hover:text-primary-600 hover:bg-white/50'
            ]"
          >
            {{ item.name }}
          </router-link>
        </nav>

        <!-- Mobile Menu Button -->
        <button
          class="md:hidden p-2 rounded-lg transition-colors"
          :class="isScrolled ? 'text-dark-700 hover:bg-dark-100' : 'text-dark-700 hover:bg-white/50'"
          @click="toggleMobileMenu"
        >
          <i :class="isMobileMenuOpen ? 'fas fa-times' : 'fas fa-bars'" class="text-xl"></i>
        </button>
      </div>
    </div>

    <!-- Mobile Menu -->
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
        class="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg border-t border-dark-100"
      >
        <nav class="container-base py-4 space-y-1">
          <button
            v-for="item in navItems"
            :key="item.path"
            class="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors"
            :class="[
              isActive(item.path)
                ? 'bg-primary-100 text-primary-700'
                : 'text-dark-600 hover:bg-dark-50'
            ]"
            @click="navigateTo(item.path)"
          >
            <i :class="item.icon" class="w-5 text-center"></i>
            <span class="font-medium">{{ item.name }}</span>
          </button>
        </nav>
      </div>
    </Transition>
  </header>
</template>

