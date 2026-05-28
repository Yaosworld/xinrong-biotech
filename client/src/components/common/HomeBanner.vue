<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useHomeBannerStore } from '@/stores/homeBannerStore'

const homeBannerStore = useHomeBannerStore()

// 横幅数据
const banners = computed(() => homeBannerStore.banners)
const hasBanners = computed(() => banners.value.length > 0)
const currentBanner = computed(() => banners.value[currentImageIndex.value] || null)

const currentImageIndex = ref(0)
const intervalId = ref<number | null>(null)

const nextImage = () => {
  if (banners.value.length === 0) return
  currentImageIndex.value = (currentImageIndex.value + 1) % banners.value.length
}

const prevImage = () => {
  if (banners.value.length === 0) return
  currentImageIndex.value = (currentImageIndex.value - 1 + banners.value.length) % banners.value.length
}

const goToImage = (index: number) => {
  if (banners.value.length === 0) return
  currentImageIndex.value = index
}

const startAutoRotation = () => {
  if (banners.value.length <= 1 || intervalId.value !== null) return
  intervalId.value = window.setInterval(nextImage, 4000)
}

const stopAutoRotation = () => {
  if (intervalId.value !== null) {
    clearInterval(intervalId.value)
    intervalId.value = null
  }
}

watch(
  () => banners.value.length,
  (length) => {
    if (length === 0) {
      currentImageIndex.value = 0
      stopAutoRotation()
      return
    }

    if (currentImageIndex.value >= length) {
      currentImageIndex.value = 0
    }

    stopAutoRotation()
    startAutoRotation()
  }
)

onMounted(async () => {
  await homeBannerStore.loadBanners()
  startAutoRotation()
})

onUnmounted(() => {
  stopAutoRotation()
})
</script>

<template>
  <section class="home-banner relative h-[900px] overflow-hidden">
    <!-- 图片轮播容器 -->
    <div
      class="image-slider relative h-full"
      @mouseenter="stopAutoRotation"
      @mouseleave="startAutoRotation"
    >
      <template v-if="hasBanners">
        <!-- 当前图片 -->
        <div
          v-for="(banner, index) in banners"
          :key="banner.id"
          class="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          :class="{ 'opacity-100': index === currentImageIndex, 'opacity-0': index !== currentImageIndex }"
        >
          <img
            :src="banner.url"
            :alt="`Banner ${index + 1}`"
            class="w-full h-full object-cover"
          />
          <!-- 渐变遮罩 -->
          <div class="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/80"></div>
        </div>

        <!-- 左右切换按钮 -->
        <button
          v-if="banners.length > 1"
          @click.stop="prevImage"
          class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 hover:scale-110 z-20"
          type="button"
        >
          <i class="fas fa-chevron-left text-lg"></i>
        </button>
        <button
          v-if="banners.length > 1"
          @click.stop="nextImage"
          class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 hover:scale-110 z-20"
          type="button"
        >
          <i class="fas fa-chevron-right text-lg"></i>
        </button>

        <!-- 指示器 -->
        <div v-if="banners.length > 1" class="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          <button
            v-for="(banner, index) in banners"
            :key="banner.id"
            @click.stop="goToImage(index)"
            class="w-2 h-2 rounded-full transition-all duration-300 hover:scale-125"
            :class="index === currentImageIndex ? 'w-8 bg-white' : 'bg-white/50 hover:bg-white/70'"
            type="button"
          ></button>
        </div>
      </template>
      <div
        v-else
        class="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
      >
        <div class="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/80"></div>
      </div>
    </div>

    <!-- 内容插槽 -->
    <div class="absolute inset-0 flex items-center justify-center z-10">
      <slot
        :currentBanner="currentBanner"
        :currentIndex="currentImageIndex"
      ></slot>
    </div>
  </section>
</template>

<style scoped>
.home-banner {
  /* 确保横幅占满视口宽度 */
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  width: 100vw;
}
</style>
