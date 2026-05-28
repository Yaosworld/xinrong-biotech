<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import AppFooter from '@/components/common/AppFooter.vue'
import FloatingPanel from '@/components/common/FloatingPanel.vue'
import { useSiteStore } from '@/stores/siteStore'
import { useBannerStore } from '@/stores/bannerStore'

const route = useRoute()
const router = useRouter()
const siteStore = useSiteStore()
const bannerStore = useBannerStore()
const PUBLIC_ROOT_FONT_SIZE = '17px'

// 路由是否准备好
const isRouterReady = ref(false)

// 判断是否为管理页面
const isAdminRoute = computed(() => route.path.startsWith('/admin'))

watchEffect(() => {
  document.documentElement.style.fontSize = isAdminRoute.value ? '' : PUBLIC_ROOT_FONT_SIZE
})

// 应用启动时加载网站配置
onMounted(async () => {
  // 等待路由准备好
  await router.isReady()
  isRouterReady.value = true
  
  // 只在前台页面加载网站配置
  if (!isAdminRoute.value) {
    siteStore.loadSiteConfig()
    bannerStore.loadBanners()
  }
})

onBeforeUnmount(() => {
  document.documentElement.style.fontSize = ''
})
</script>

<template>
  <div
    class="app-container min-h-screen flex flex-col"
    :class="{ 'public-app': !isAdminRoute }"
  >
    <!-- 等待路由准备好 -->
    <template v-if="isRouterReady">
      <!-- 前台布局 -->
      <template v-if="!isAdminRoute">
        <AppHeader />
        <main class="flex-1">
          <RouterView />
        </main>
        <AppFooter />
        <FloatingPanel />
      </template>

      <!-- 管理后台布局 (独立布局) -->
      <template v-else>
        <RouterView />
      </template>
    </template>
  </div>
</template>

<style scoped>
.app-container {
  font-family: 'Inter', 'Noto Sans SC', system-ui, sans-serif;
}

.public-app {
  line-height: 1.65;
}
</style>

