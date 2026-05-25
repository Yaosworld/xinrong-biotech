<script setup lang="ts">
/**
 * 详情页布局组件
 * 
 * 提供统一的详情页布局结构，包括：
 * - 几何装饰背景
 * - 返回按钮
 * - 加载状态
 * - 未找到状态
 * - 内容区域插槽
 */
import { useRouter } from 'vue-router'
import GeometricBackground from './GeometricBackground.vue'
import LoadingSpinner from './LoadingSpinner.vue'

interface Props {
  /** 页面标题 */
  title: string
  /** 返回按钮文本 */
  backText: string
  /** 返回路径 */
  backPath: string
  /** 是否加载中 */
  loading?: boolean
  /** 加载提示文本 */
  loadingText?: string
  /** 是否未找到 */
  notFound?: boolean
  /** 未找到图标 */
  notFoundIcon?: string
  /** 未找到标题 */
  notFoundTitle?: string
  /** 未找到描述 */
  notFoundDescription?: string
  /** 是否显示标题 */
  showTitle?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  loadingText: '加载中...',
  notFound: false,
  notFoundIcon: 'fas fa-exclamation-triangle',
  notFoundTitle: '内容未找到',
  notFoundDescription: '抱歉，您查找的内容不存在或已被移除',
  showTitle: true
})

const router = useRouter()

const handleBack = () => {
  router.push(props.backPath)
}
</script>

<template>
  <div class="detail-page pt-[72px]">
    <!-- 几何装饰背景 -->
    <GeometricBackground />

    <!-- 返回按钮 -->
    <button class="back-button" @click="handleBack">
      <i class="fas fa-arrow-left"></i>
      {{ backText }}
    </button>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <LoadingSpinner size="lg" :text="loadingText" />
    </div>
    
    <!-- 未找到状态 -->
    <div v-else-if="notFound" class="not-found-container">
      <div class="glass-card error-card">
        <i :class="notFoundIcon" class="error-icon"></i>
        <h2 class="error-title">{{ notFoundTitle }}</h2>
        <p class="error-description">{{ notFoundDescription }}</p>
        <button class="btn-primary" @click="handleBack">
          <i class="fas fa-arrow-left mr-2"></i>
          {{ backText }}
        </button>
      </div>
    </div>
    
    <!-- 内容区域 -->
    <div v-else class="detail-content">
      <div class="container-base py-8">
        <h2 v-if="showTitle" class="page-main-title">{{ title }}</h2>
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: #f8fafc;
  position: relative;
  overflow: hidden;
}

.detail-content {
  position: relative;
  z-index: 1;
  min-height: calc(100vh - 72px);
  display: flex;
  align-items: center;
}

/* 返回按钮 */
.back-button {
  position: fixed;
  top: 100px;
  left: 2rem;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  color: #374151;
  border: 1px solid rgba(5, 84, 140, 0.2);
  border-radius: 25px;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.back-button:hover {
  background: rgba(5, 84, 140, 0.1);
  border-color: rgba(5, 84, 140, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(5, 84, 140, 0.2);
}

/* 加载状态 */
.loading-container {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

/* 未找到状态 */
.not-found-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 2rem;
  position: relative;
  z-index: 2;
}

/* 玻璃态卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(5, 84, 140, 0.1);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.error-card {
  text-align: center;
  padding: 3rem;
  max-width: 400px;
}

.error-icon {
  font-size: 3rem;
  color: #f59e0b;
  margin-bottom: 1rem;
}

.error-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.error-description {
  color: #64748b;
  margin-bottom: 1.5rem;
}

/* 页面主标题 */
.page-main-title {
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 2rem;
  position: relative;
  padding-bottom: 1rem;
}

.page-main-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: linear-gradient(135deg, #05548C, #43CEED);
  border-radius: 2px;
}

/* 按钮样式 */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #05548C, #43CEED);
  color: #fff;
  border: none;
  border-radius: 25px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(5, 84, 140, 0.4);
}

.mr-2 {
  margin-right: 0.5rem;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .back-button {
    top: 90px;
    left: 1rem;
    padding: 10px 18px;
    font-size: 0.85rem;
  }
}

@media (max-width: 768px) {
  .back-button {
    position: relative;
    top: 0;
    left: 0;
    margin: 1rem;
  }
  
  .page-main-title {
    font-size: 1.5rem;
  }
}
</style>
