<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '@/stores/productStore'
import { usePageContentStore } from '@/stores/pageContentStore'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ContactModal from '@/components/common/ContactModal.vue'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const pageContentStore = usePageContentStore()

const productId = computed(() => route.params.id as string)
const showContactModal = ref(false)
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

// 当前产品
const product = computed(() => {
  return productStore.getProductById(productId.value)
})

// 联系信息
const contactInfo = ref({
  phone1: '15919646073',
  phone2: '13422057239',
  email: '15919646073@139.com',
  wechatQrcode: '/images/common/wx-qrcode-contact.png',
  workTime: '周一至周五 8:00-17:30'
})

// 返回产品列表（使用浏览器历史记录保持之前的筛选状态）
const goBack = () => {
  // 检查是否有历史记录可以返回
  if (window.history.length > 1) {
    router.back()
  } else {
    // 如果没有历史记录，直接跳转到产品中心
    router.push('/products')
  }
}

// 打开咨询弹窗
const openContactModal = () => {
  showContactModal.value = true
}

// 关闭咨询弹窗
const closeContactModal = () => {
  showContactModal.value = false
}

onMounted(async () => {
  generateGeometricShapes()
  loading.value = true
  try {
    await Promise.all([
      productStore.loadProducts(),
      pageContentStore.loadSiteInfo()
    ])
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="product-detail-page pt-[72px]">
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
      返回产品中心
    </button>

    <!-- 加载状态 -->
    <div v-if="loading" class="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner size="lg" text="加载产品详情..." />
    </div>
    
    <!-- 产品未找到 -->
    <div v-else-if="!product" class="not-found-container">
      <div class="glass-card error-card">
        <i class="fas fa-box-open text-5xl text-amber-500 mb-4"></i>
        <h2 class="text-xl font-bold text-dark-700 mb-2">产品未找到</h2>
        <p class="text-dark-500 mb-6">抱歉，您查找的产品不存在或已下架</p>
        <button class="btn-primary" @click="goBack">
          <i class="fas fa-arrow-left mr-2"></i>
          返回产品中心
        </button>
      </div>
    </div>
    
    <!-- 产品详情 -->
    <div v-else class="product-detail-content">
      <div class="container-base py-8">
        <h2 class="page-main-title">产品详情</h2>
        
        <div class="detail-layout single-column">
          <!-- 产品信息面板 -->
          <div class="right-panel glass-card">
            <!-- 产品名称 -->
            <h1 class="product-title">{{ product.name }}</h1>
            
            <!-- 信息列表 -->
            <div class="info-list">
              <!-- 产品货号 -->
              <div class="info-item">
                <span class="info-label">货号</span>
                <span class="info-value">{{ product.sku || '-' }}</span>
              </div>

              <!-- 品牌 -->
              <div class="info-item">
                <span class="info-label">品牌</span>
                <span class="info-value brand-value">{{ product.brand || '-' }}</span>
              </div>

              <!-- 规格参数 -->
              <div class="info-item">
                <span class="info-label">规格</span>
                <span class="info-value">{{ product.specs || '-' }}</span>
              </div>

              <!-- 销售单位 -->
              <div class="info-item">
                <span class="info-label">单位</span>
                <span class="info-value">{{ product.unit || '-' }}</span>
              </div>

              <!-- 产品描述 -->
              <div class="info-item desc-item">
                <span class="info-label">描述</span>
                <p class="info-value desc-value">{{ product.desc || '暂无描述' }}</p>
              </div>
            </div>
            
            <!-- 咨询订购按钮 -->
            <div class="mt-6">
              <button class="contact-btn" @click="openContactModal">
                <i class="fas fa-phone-alt mr-2"></i>
                咨询订购
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 联系我们弹窗 -->
    <ContactModal
      :show="showContactModal"
      :contact-info="contactInfo"
      @close="closeContactModal"
    />
  </div>
</template>

<style scoped>
.product-detail-page {
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

/* 产品详情内容 */
.product-detail-content {
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

/* 单列布局 - 水平居中 */
.detail-layout {
  display: flex;
  justify-content: center;
}

.detail-layout.single-column {
  justify-content: center;
}

/* 产品信息面板 */
.right-panel {
  flex: none;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
  padding: 2rem;
  display: flex;
  flex-direction: column;
}

.product-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
}

.info-list {
  flex: 1;
}

.info-item {
  display: flex;
  align-items: baseline;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(102, 126, 234, 0.08);
}

.info-item:last-child {
  border-bottom: none;
}

.desc-item {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.info-label {
  color: #64748b;
  font-size: 0.875rem;
  flex-shrink: 0;
  width: 80px;
}

.info-value {
  color: #1e293b;
  font-weight: 500;
  flex: 1;
}

.brand-value {
  color: #667eea;
}

.desc-value {
  color: #475569;
  line-height: 1.6;
  font-size: 0.875rem;
  font-weight: normal;
}

.contact-btn {
  width: 100%;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  font-weight: 500;
  color: white;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.contact-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}


/* 响应式设计 */
@media (max-width: 1024px) {
  .right-panel {
    width: 100%;
    padding: 1.5rem;
  }

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

  .contact-methods {
    grid-template-columns: 1fr;
  }
}
</style>
