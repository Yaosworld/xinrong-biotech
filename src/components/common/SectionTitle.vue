<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
  align?: 'left' | 'center' | 'right'
  size?: 'sm' | 'md' | 'lg'
}

withDefaults(defineProps<Props>(), {
  subtitle: '',
  align: 'center',
  size: 'md'
})

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
}

const titleSizeClasses = {
  sm: 'text-xl md:text-2xl',
  md: 'text-2xl md:text-3xl',
  lg: 'text-3xl md:text-4xl'
}

const subtitleSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg'
}
</script>

<template>
  <div :class="alignClasses[align]" class="mb-8 md:mb-12">
    <h2
      class="font-bold font-display text-dark-900"
      :class="titleSizeClasses[size]"
    >
      {{ title }}
    </h2>
    <p
      v-if="subtitle"
      class="mt-3 text-dark-500 max-w-2xl"
      :class="[
        subtitleSizeClasses[size],
        align === 'center' ? 'mx-auto' : ''
      ]"
    >
      {{ subtitle }}
    </p>
    <slot name="extra"></slot>
  </div>
</template>

