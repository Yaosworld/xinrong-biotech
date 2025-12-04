<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const images = [
  '/images/home/banner_1.jpg',
  '/images/home/banner_2.jpg',
  '/images/home/banner_3.jpg',
  '/images/home/banner_4.jpg'
]

const currentImageIndex = ref(0)
const intervalId = ref<number | null>(null)

const nextImage = () => {
  currentImageIndex.value = (currentImageIndex.value + 1) % images.length
}

const prevImage = () => {
  currentImageIndex.value = (currentImageIndex.value - 1 + images.length) % images.length
}

const goToImage = (index: number) => {
  currentImageIndex.value = index
}

const startAutoRotation = () => {
  intervalId.value = setInterval(nextImage, 4000) // 每4秒切换一次
}

const stopAutoRotation = () => {
  if (intervalId.value) {
    clearInterval(intervalId.value)
    intervalId.value = null
  }
}

onMounted(() => {
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
      <!-- 当前图片 -->
      <div
        v-for="(image, index) in images"
        :key="index"
        class="absolute inset-0 transition-opacity duration-1000 ease-in-out"
        :class="{ 'opacity-100': index === currentImageIndex, 'opacity-0': index !== currentImageIndex }"
      >
        <img
          :src="image"
          :alt="`Banner ${index + 1}`"
          class="w-full h-full object-cover"
        />
        <!-- 渐变遮罩 -->
        <div class="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/80"></div>
      </div>

      <!-- 左右切换按钮 -->
      <button
        @click.stop="prevImage"
        class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 hover:scale-110 z-20"
        type="button"
      >
        <i class="fas fa-chevron-left text-lg"></i>
      </button>
      <button
        @click.stop="nextImage"
        class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 hover:scale-110 z-20"
        type="button"
      >
        <i class="fas fa-chevron-right text-lg"></i>
      </button>

      <!-- 指示器 -->
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        <button
          v-for="(image, index) in images"
          :key="index"
          @click.stop="goToImage(index)"
          class="w-2 h-2 rounded-full transition-all duration-300 hover:scale-125"
          :class="index === currentImageIndex ? 'w-8 bg-white' : 'bg-white/50 hover:bg-white/70'"
          type="button"
        ></button>
      </div>
    </div>

    <!-- 内容插槽 -->
    <div class="absolute inset-0 flex items-center justify-center z-10">
      <slot></slot>
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