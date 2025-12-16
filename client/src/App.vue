<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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

// 路由是否准备好
const isRouterReady = ref(false)

// 判断是否为管理页面
const isAdminRoute = computed(() => route.path.startsWith('/admin'))

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
</script>

<template>
  <div class="app-container min-h-screen flex flex-col">
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
</style>

