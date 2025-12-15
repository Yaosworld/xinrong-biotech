<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'white' | 'dark'
  text?: string
}

withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'primary',
  text: ''
})

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
  xl: 'w-16 h-16 border-4'
}

const colorClasses = {
  primary: 'border-primary-200 border-t-primary-600',
  white: 'border-white/30 border-t-white',
  dark: 'border-dark-200 border-t-dark-600'
}
</script>

<template>
  <div class="flex flex-col items-center justify-center space-y-3">
    <div
      class="rounded-full animate-spin"
      :class="[sizeClasses[size], colorClasses[color]]"
    ></div>
    <p v-if="text" class="text-sm text-dark-500">{{ text }}</p>
  </div>
</template>

