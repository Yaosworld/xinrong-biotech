<script setup lang="ts">
/**
 * 几何装饰背景组件
 * 
 * 提供动态的几何形状装饰背景，用于详情页等场景
 */
import { ref, onMounted } from 'vue'

interface Props {
  /** 形状数量 */
  shapeCount?: number
  /** 最小尺寸 */
  minSize?: number
  /** 最大尺寸 */
  maxSize?: number
  /** 最小透明度 */
  minOpacity?: number
  /** 最大透明度 */
  maxOpacity?: number
}

const props = withDefaults(defineProps<Props>(), {
  shapeCount: 15,
  minSize: 15,
  maxSize: 50,
  minOpacity: 0.08,
  maxOpacity: 0.23
})

interface GeometricShape {
  id: number
  style: Record<string, string>
}

const geometricShapes = ref<GeometricShape[]>([])

const generateGeometricShapes = () => {
  const shapes: GeometricShape[] = []
  
  for (let i = 0; i < props.shapeCount; i++) {
    const size = props.minSize + Math.random() * (props.maxSize - props.minSize)
    const isCircle = Math.random() > 0.5
    const opacity = props.minOpacity + Math.random() * (props.maxOpacity - props.minOpacity)
    
    shapes.push({
      id: i,
      style: {
        left: `${Math.random() * 95}%`,
        top: `${Math.random() * 90}%`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: `${opacity}`,
        background: 'linear-gradient(135deg, #05548C, #43CEED)',
        boxShadow: '0 0 20px rgba(5, 84, 140, 0.3)',
        animation: `geometricFloat${(i % 4) + 1} ${15 + Math.random() * 10}s ease-in-out infinite`,
        animationDelay: `${Math.random() * 5}s`,
        transform: `rotate(${Math.random() * 360}deg)`,
        borderRadius: isCircle ? '50%' : '8px',
        border: '1px solid rgba(255, 255, 255, 0.15)'
      }
    })
  }
  
  geometricShapes.value = shapes
}

onMounted(() => {
  generateGeometricShapes()
})
</script>

<template>
  <div class="geometric-decorations">
    <div
      v-for="shape in geometricShapes"
      :key="shape.id"
      class="geometric-shape"
      :style="shape.style"
    ></div>
  </div>
</template>

<style scoped>
.geometric-decorations {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.geometric-shape {
  position: absolute;
  backdrop-filter: blur(2px);
  transition: all 0.3s ease;
}

@keyframes geometricFloat1 {
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  25% { transform: translate(30px, -25px) rotate(90deg) scale(1.08); }
  50% { transform: translate(-20px, 35px) rotate(180deg) scale(0.95); }
  75% { transform: translate(40px, 12px) rotate(270deg) scale(1.03); }
}

@keyframes geometricFloat2 {
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  33% { transform: translate(-40px, 28px) rotate(120deg) scale(1.12); }
  66% { transform: translate(28px, -38px) rotate(240deg) scale(0.88); }
}

@keyframes geometricFloat3 {
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  50% { transform: translate(-32px, -28px) rotate(180deg) scale(1.15); }
}

@keyframes geometricFloat4 {
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  20% { transform: translate(-25px, 42px) rotate(72deg) scale(0.92); }
  40% { transform: translate(38px, -18px) rotate(144deg) scale(1.08); }
  60% { transform: translate(-30px, -25px) rotate(216deg) scale(1.02); }
  80% { transform: translate(22px, 35px) rotate(288deg) scale(0.98); }
}
</style>
