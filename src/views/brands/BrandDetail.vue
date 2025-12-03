<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBrandStore } from '@/stores/brandStore'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const brandStore = useBrandStore()

const brandId = computed(() => route.params.id as string)
const imageError = ref(false)
const certificateImageError = ref(false)
const loading = ref(true)

// 几何装饰形状
const geometricShapes = ref<any[]>([])

// 生成几何装饰
const generateGeometricShapes = () => {
  const shapes = []
  const shapeCount = 15
  
  for (let i = 0; i < shapeCount; i++) {
    const size = 15 + Math.random() * 35
    const isCircle = Math.random() > 0.5
    const opacity = 0.08 + Math.random() * 0.15
    
    shapes.push({
      id: i,
      style: {
        left: `${Math.random() * 95}%`,
        top: `${Math.random() * 90}%`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: `${opacity}`,
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        boxShadow: '0 0 20px rgba(118, 75, 162, 0.3)',
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

// 当前品牌
const brand = computed(() => {
  return brandStore.getBrandById(brandId.value)
})

// 判断是否有有效的证书图片
const hasValidCertificate = computed(() => {
  return brand.value?.certificate_url && !certificateImageError.value
})

// 品牌描述分段（支持多段落）
const descriptionParagraphs = computed(() => {
  if (!brand.value?.description) return []
  // 按双换行分段（真正的段落分隔）
  return brand.value.description.split(/\n\n+/).filter(p => p.trim())
})

// 返回品牌列表
const goBack = () => {
  router.push('/brands')
}

// Logo加载错误处理
const handleImageError = () => {
  imageError.value = true
}

// 证书图片加载错误处理
const handleCertificateImageError = () => {
  certificateImageError.value = true
}

onMounted(async () => {
  generateGeometricShapes()
  loading.value = true
  try {
    await brandStore.loadBrands()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="brand-detail-page pt-[72px]">
    <!-- 几何装饰背景 -->
    <div class="geometric-decorations">
      <div
        v-for="shape in geometricShapes"
        :key="shape.id"
        class="geometric-shape"
        :style="shape.style"
      ></div>
    </div>

    <!-- 返回按钮 -->
    <button class="back-button" @click="goBack">
      <i class="fas fa-arrow-left"></i>
      返回品牌中心
    </button>

    <!-- 加载状态 -->
    <div v-if="loading" class="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner size="lg" text="加载品牌详情..." />
    </div>
    
    <!-- 品牌未找到 -->
    <div v-else-if="!brand" class="not-found-container">
      <div class="glass-card error-card">
        <i class="fas fa-exclamation-triangle text-5xl text-amber-500 mb-4"></i>
        <h2 class="text-xl font-bold text-dark-700 mb-2">品牌未找到</h2>
        <p class="text-dark-500 mb-6">抱歉，您查找的品牌不存在或已被移除</p>
        <button class="btn-primary" @click="goBack">
          <i class="fas fa-arrow-left mr-2"></i>
          返回品牌中心
        </button>
      </div>
    </div>
    
    <!-- 品牌详情内容 -->
    <div v-else class="brand-detail-content">
      <div class="container-base py-8">
        <h2 class="page-main-title">品牌介绍</h2>
        
        <div class="detail-layout" :class="{ 'single-column': !hasValidCertificate }">
          <!-- 左侧内容面板 -->
          <div class="left-panel glass-card">
            <!-- 品牌头部 -->
            <div class="brand-header">
              <div class="logo-and-title">
                <div class="brand-logo">
                  <img
                    v-if="!imageError && brand.logo_url"
                    :src="brand.logo_url"
                    :alt="brand.name"
                    @error="handleImageError"
                  />
                  <div v-else class="logo-fallback">
                    {{ brand.name.charAt(0) }}
                  </div>
                </div>
                <div class="brand-titles">
                  <div class="flex items-center gap-3 flex-wrap">
                    <h1 class="brand-title">{{ brand.name }}</h1>
                    <span
                      v-if="brand.is_own_brand"
                      class="own-brand-badge"
                    >
                      <i class="fas fa-star mr-1"></i>
                      自主品牌
                    </span>
                  </div>
                  <p v-if="brand.country" class="brand-subtitle">
                    <i class="fas fa-globe mr-2"></i>
                    {{ brand.country }}
                  </p>
                </div>
              </div>
            </div>

            <!-- 品牌介绍 -->
            <div v-if="brand.description" class="brand-description">
              <h3 class="section-title-inner">
                <i class="fas fa-file-alt text-primary-500"></i>
                品牌介绍
              </h3>
              <div class="description-content">
                <p
                  v-for="(paragraph, index) in descriptionParagraphs"
                  :key="index"
                  class="paragraph"
                  v-html="paragraph.replace(/\n/g, '<br>')"
                >
                </p>
                <p v-if="descriptionParagraphs.length === 0" class="paragraph">
                  {{ brand.description }}
                </p>
              </div>
            </div>
          </div>

          <!-- 右侧授权证书面板 - 仅当有有效证书图片时显示 -->
          <div v-if="hasValidCertificate" class="right-panel glass-card">
            <h3 class="section-title-inner">
              <i class="fas fa-certificate text-primary-500"></i>
              代理授权证书
            </h3>
            <div class="certificate-container">
              <img
                :src="brand.certificate_url"
                :alt="`${brand.name} 代理授权证书`"
                class="certificate-image"
                @error="handleCertificateImageError"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.brand-detail-page {
  min-height: 100vh;
  background: #f8fafc;
  position: relative;
  overflow: hidden;
}

/* 几何装饰背景 */
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
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 25px;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.back-button:hover {
  background: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.2);
}

/* 未找到内容 */
.not-found-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 2rem;
  position: relative;
  z-index: 2;
}

.error-card {
  text-align: center;
  padding: 3rem;
  max-width: 400px;
}

/* 玻璃态卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(102, 126, 234, 0.1);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

/* 品牌详情内容 - 垂直居中 */
.brand-detail-content {
  position: relative;
  z-index: 1;
  min-height: calc(100vh - 72px);
  display: flex;
  align-items: center;
}

.container-base {
  width: 100%;
}

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
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 2px;
}

/* 双栏布局 - 左侧决定高度，右侧自适应 */
.detail-layout {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

/* 单列布局 - 当没有证书图片时水平居中 */
.detail-layout.single-column {
  justify-content: center;
}

/* 左侧面板 */
.left-panel {
  flex: 1.2;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 单列布局时的左侧面板 */
.detail-layout.single-column .left-panel {
  flex: none;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.brand-header {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
}

.logo-and-title {
  display: flex;
  align-items: center;
  gap: 20px;
}

.brand-logo {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 8px;
  border: 2px solid rgba(102, 126, 234, 0.2);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.brand-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-fallback {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 8px;
  color: white;
  font-size: 2rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-titles {
  flex: 1;
}

.brand-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.own-brand-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 20px;
}

.brand-subtitle {
  font-size: 0.9rem;
  color: #64748b;
  margin-top: 8px;
}

.section-title-inner {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.description-content {
  color: #475569;
  line-height: 1.8;
}

.paragraph {
  margin-bottom: 1rem;
  position: relative;
  padding-left: 16px;
}

.paragraph::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  width: 4px;
  height: 4px;
  background: #667eea;
  border-radius: 50%;
}

.paragraph:last-child {
  margin-bottom: 0;
}

/* 右侧面板 - 跟随左侧高度 */
.right-panel {
  flex: 0.8;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-self: stretch; /* 跟随左侧高度 */
}

.certificate-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(102, 126, 234, 0.03);
  border-radius: 16px;
  border: 2px dashed rgba(102, 126, 234, 0.15);
  position: relative;
  overflow: hidden;
}

.certificate-image {
  width: 100%;
  height: 100%;
  object-fit: contain; /* 保持图片比例 */
}

.certificate-placeholder {
  text-align: center;
  padding: 2rem;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .detail-layout {
    flex-direction: column;
  }

  .left-panel,
  .right-panel {
    flex: none;
    width: 100%;
  }

  .back-button {
    top: 90px;
    left: 1rem;
    padding: 10px 18px;
    font-size: 0.85rem;
  }
}

@media (max-width: 768px) {
  .logo-and-title {
    flex-direction: column;
    align-items: flex-start;
  }

  .brand-logo {
    width: 70px;
    height: 70px;
  }

  .brand-title {
    font-size: 1.25rem;
  }

  .back-button {
    position: relative;
    top: 0;
    left: 0;
    margin: 1rem;
  }
}
</style>
