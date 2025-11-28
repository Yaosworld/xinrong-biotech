<script setup lang="ts">
interface Props {
  icon?: string
  title?: string
  description?: string
  actionText?: string
  actionIcon?: string
}

withDefaults(defineProps<Props>(), {
  icon: 'fas fa-inbox',
  title: '暂无数据',
  description: '当前没有可显示的内容',
  actionText: '',
  actionIcon: ''
})

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 px-4">
    <!-- 图标 -->
    <div class="w-20 h-20 rounded-full bg-dark-100 flex items-center justify-center mb-6">
      <i :class="icon" class="text-3xl text-dark-400"></i>
    </div>
    
    <!-- 标题 -->
    <h3 class="text-xl font-semibold text-dark-700 mb-2">{{ title }}</h3>
    
    <!-- 描述 -->
    <p class="text-dark-500 text-center max-w-md mb-6">{{ description }}</p>
    
    <!-- 操作按钮 -->
    <button
      v-if="actionText"
      class="btn-primary"
      @click="emit('action')"
    >
      <i v-if="actionIcon" :class="actionIcon" class="mr-2"></i>
      {{ actionText }}
    </button>
    
    <!-- 插槽 -->
    <slot></slot>
  </div>
</template>

