<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Logo图片加载状态
const logoError = ref(false)

// 导航菜单（包括关于我们，统一处理）
const navItems = [
  { name: '首页', path: '/', icon: 'fas fa-home' },
  { name: '产品中心', path: '/products', icon: 'fas fa-flask' },
  { name: '品牌中心', path: '/brands', icon: 'fas fa-award' },
  { name: '资讯中心', path: '/news', icon: 'fas fa-newspaper' },
  { name: '关于我们', path: '/about', icon: 'fas fa-building' }
]

// 响应式状态
const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

// 当前路由是否激活 - 修复后的精确匹配逻辑
const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }

  // 精确匹配
  if (route.path === path) {
    return true
  }

  // 子路由匹配（如 /products/123 匹配 /products）
  if (route.path.startsWith(path + '/')) {
    return true
  }

  return false
}

// 获取导航链接的样式类 - 所有导航项统一样式
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

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll()
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
    <div class="container-base">
      <div class="flex items-center justify-between h-20 md:h-24">
        <!-- Logo -->
        <router-link to="/" class="flex items-center gap-4 group">
          <!-- Logo图标 -->
          <div class="w-16 h-16 overflow-hidden bg-white flex items-center justify-center transition-transform group-hover:scale-105">
            <img
              v-if="!logoError"
              src="/images/common/logo.png"
              alt="信荣生物"
              class="w-full h-full object-contain"
              @error="logoError = true"
            />
            <span v-else class="text-gradient-600 font-bold text-2xl">XR</span>
          </div>
          <!-- 公司名称 -->
          <div class="hidden sm:block">
            <div class="text-xl md:text-2xl font-bold text-dark-800 group-hover:text-gradient-600 transition-colors">广州信荣生物科技有限公司</div>
            <div class="text-xs md:text-sm text-dark-400 tracking-wide">GUANGZHOU XINRONG BIOTECHNOLOGY CO., LTD.</div>
          </div>
        </router-link>

        <!-- Desktop Navigation -->
        <nav class="hidden lg:flex items-center gap-2">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-3 px-5 py-3 rounded-lg text-base lg:text-lg font-medium transition-all duration-200"
            :class="getNavLinkClasses(item.path)"
          >
            <i :class="item.icon" class="text-lg lg:text-xl"></i>
            <span>{{ item.name }}</span>
          </router-link>
        </nav>

        <!-- Mobile Menu Button -->
        <button
          class="lg:hidden p-3 rounded-lg text-dark-600 hover:bg-dark-100 transition-colors"
          @click="toggleMobileMenu"
        >
          <i :class="isMobileMenuOpen ? 'fas fa-times' : 'fas fa-bars'" class="text-2xl"></i>
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
        class="lg:hidden absolute top-full left-0 right-0 bg-white shadow-lg border-t border-dark-100"
      >
        <nav class="container-base py-4 space-y-2">
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