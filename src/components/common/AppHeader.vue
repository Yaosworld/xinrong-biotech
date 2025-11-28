<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Logo图片加载状态
const logoError = ref(false)

// 导航菜单
const navItems = [
  { name: '首页', path: '/', icon: 'fas fa-home' },
  { name: '产品中心', path: '/products', icon: 'fas fa-flask' },
  { name: '品牌中心', path: '/brands', icon: 'fas fa-award' },
  { name: '资讯中心', path: '/news', icon: 'fas fa-newspaper' }
]

// 响应式状态
const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

// 当前路由是否激活
const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
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
      <div class="flex items-center justify-between h-16 md:h-[72px]">
        <!-- Logo -->
        <router-link to="/" class="flex items-center gap-3 group">
          <!-- Logo图标 -->
          <div class="w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
            <img 
              v-if="!logoError"
              src="/images/common/logo.png" 
              alt="信荣生物" 
              class="w-full h-full object-contain"
              @error="logoError = true"
            />
            <span v-else class="text-white font-bold text-lg">XR</span>
          </div>
          <!-- 公司名称 -->
          <div class="hidden sm:block">
            <div class="text-lg font-bold text-dark-800 group-hover:text-primary-600 transition-colors">广州信荣生物科技有限公司</div>
            <div class="text-[10px] text-dark-400 tracking-wide">GUANGZHOU XINRONG BIOTECHNOLOGY CO., LTD.</div>
          </div>
        </router-link>

        <!-- Desktop Navigation -->
        <nav class="hidden lg:flex items-center gap-1">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            :class="[
              isActive(item.path)
                ? 'text-primary-600'
                : 'text-dark-600 hover:text-primary-600 hover:bg-primary-50'
            ]"
          >
            <i :class="item.icon" class="text-sm"></i>
            <span>{{ item.name }}</span>
          </router-link>
          
          <!-- 关于我们 - 突出按钮 -->
          <router-link
            to="/about"
            class="flex items-center gap-2 px-5 py-2 ml-2 rounded-lg text-sm font-medium transition-all duration-200"
            :class="[
              isActive('/about')
                ? 'bg-primary-700 text-white'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            ]"
          >
            <i class="fas fa-building text-sm"></i>
            <span>关于我们</span>
          </router-link>
        </nav>

        <!-- Mobile Menu Button -->
        <button
          class="lg:hidden p-2 rounded-lg text-dark-600 hover:bg-dark-100 transition-colors"
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
        class="lg:hidden absolute top-full left-0 right-0 bg-white shadow-lg border-t border-dark-100"
      >
        <nav class="container-base py-4 space-y-1">
          <button
            v-for="item in navItems"
            :key="item.path"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
            :class="[
              isActive(item.path)
                ? 'bg-primary-50 text-primary-600'
                : 'text-dark-600 hover:bg-dark-50'
            ]"
            @click="navigateTo(item.path)"
          >
            <i :class="item.icon" class="w-5 text-center"></i>
            <span class="font-medium">{{ item.name }}</span>
          </button>
          <button
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-600 text-white"
            @click="navigateTo('/about')"
          >
            <i class="fas fa-building w-5 text-center"></i>
            <span class="font-medium">关于我们</span>
          </button>
        </nav>
      </div>
    </Transition>
  </header>
</template>
