<script setup lang="ts">
import { useRouter } from 'vue-router'
import { CATEGORIES } from '@/hooks/useCategoryImage'
import SectionTitle from '@/components/common/SectionTitle.vue'

const router = useRouter()

const goToCategory = (categoryId: string) => {
  router.push(`/products?category=${categoryId}`)
}

// 分类图标映射
const categoryIcons: Record<string, string> = {
  'C01': 'fas fa-microscope',
  'C02': 'fas fa-vial',
  'C03': 'fas fa-dna'
}

const getCategoryIcon = (id: string) => {
  return categoryIcons[id] || 'fas fa-box'
}
</script>

<template>
  <section class="py-16 md:py-24 bg-white">
    <div class="container-base">
      <SectionTitle
        title="产品分类"
        subtitle="探索我们丰富的产品线，满足您的各类科研需求"
      />
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <article
          v-for="category in CATEGORIES"
          :key="category.id"
          class="group relative overflow-hidden rounded-2xl cursor-pointer"
          @click="goToCategory(category.id)"
        >
          <!-- 背景图 -->
          <div class="aspect-[4/3] bg-dark-100">
            <img
              :src="`/images/categories/${category.imageName}`"
              :alt="category.name"
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
              @error="($event.target as HTMLImageElement).src = '/images/common/placeholder.png'"
            />
          </div>
          
          <!-- 渐变遮罩 -->
          <div class="absolute inset-0 bg-gradient-to-t from-dark-900/90 via-dark-900/50 to-transparent"></div>
          
          <!-- 内容 -->
          <div class="absolute inset-0 p-6 flex flex-col justify-end">
            <div class="flex items-center space-x-3 mb-3">
              <div class="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <i :class="getCategoryIcon(category.id)" class="text-xl text-white"></i>
              </div>
            </div>
            
            <h3 class="text-2xl font-bold text-white mb-2">{{ category.name }}</h3>
            <p class="text-white/70 mb-4">{{ category.description || '探索更多产品' }}</p>
            
            <div class="flex items-center text-primary-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              <span>浏览产品</span>
              <i class="fas fa-arrow-right ml-2 transform group-hover:translate-x-2 transition-transform"></i>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

