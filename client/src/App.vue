<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import AppFooter from '@/components/common/AppFooter.vue'
import FloatingPanel from '@/components/common/FloatingPanel.vue'
import { useSiteStore } from '@/stores/siteStore'
import { useBannerStore } from '@/stores/bannerStore'

const route = useRoute()
const siteStore = useSiteStore()
const bannerStore = useBannerStore()

// 判断是否为管理页面
const isAdminRoute = computed(() => route.path.startsWith('/admin'))

// 应用启动时加载网站配置
onMounted(() => {
  siteStore.loadSiteConfig()
  bannerStore.loadBanners()
})
</script>

<template>
  <div class="app-container min-h-screen flex flex-col">
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
  </div>
</template>

<style scoped>
.app-container {
  font-family: 'Inter', 'Noto Sans SC', system-ui, sans-serif;
}
</style>

