<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '@/stores/productStore'
import { getCategoryById, getCategoryImagePath } from '@/hooks/useCategoryImage'
import { usePageContentStore } from '@/stores/pageContentStore'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const pageContentStore = usePageContentStore()

const productId = computed(() => route.params.id as string)
const imageError = ref(false)
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

// 分类信息
const category = computed(() => {
  if (!product.value) return null
  return getCategoryById(product.value.categoryId)
})

// 分类图片路径
const categoryImagePath = computed(() => {
  if (!product.value) return '/images/common/placeholder.png'
  return getCategoryImagePath(product.value.categoryId)
})

// 联系信息
const contactInfo = computed(() => {
  return pageContentStore.siteInfo?.contact || {
    phone: '400-123-4567',
    mobile: '138-0000-0000',
    email: 'contact@xinrong-bio.com',
    wechatQrcode: '/images/common/wechat-qrcode.svg',
    qqQrcode: '/images/common/qq-qrcode.svg'
  }
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
        
        <div class="detail-layout">
          <!-- 左侧产品图片面板 -->
          <div class="left-panel glass-card">
            <div class="product-image-container">
              <img
                v-if="!imageError"
                :src="categoryImagePath"
                :alt="product.name"
                class="product-image"
                @error="imageError = true"
              />
              <div v-else class="image-placeholder">
                <i class="fas fa-image text-5xl text-primary-300 mb-4"></i>
                <p class="text-dark-400 font-medium">暂无产品图片</p>
              </div>
            </div>
          </div>

          <!-- 右侧产品信息面板 -->
          <div class="right-panel glass-card">
            <!-- 产品名称 -->
            <h1 class="product-title">{{ product.name }}</h1>
            
            <!-- 信息列表 -->
            <div class="info-list">
              <!-- 品牌 -->
              <div class="info-item">
                <span class="info-label">品牌</span>
                <span class="info-value brand-value">{{ product.brand || '-' }}</span>
              </div>
              
              <!-- 规格参数 -->
              <div class="info-item">
                <span class="info-label">规格参数</span>
                <span class="info-value">{{ product.specs || '-' }}</span>
              </div>
              
              <!-- 产品货号 -->
              <div class="info-item">
                <span class="info-label">产品货号</span>
                <span class="info-value font-mono">{{ product.sku || '-' }}</span>
              </div>
              
              <!-- 销售单位 -->
              <div class="info-item">
                <span class="info-label">销售单位</span>
                <span class="info-value">{{ product.unit || '-' }}</span>
              </div>
              
              <!-- 产品描述 -->
              <div class="info-item desc-item">
                <span class="info-label">产品描述</span>
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

    <!-- 咨询订购弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showContactModal" class="modal-overlay" @click.self="closeContactModal">
          <div class="contact-modal">
            <!-- 关闭按钮 -->
            <button class="modal-close" @click="closeContactModal">
              <i class="fas fa-times"></i>
            </button>
            
            <h3 class="modal-title">
              <i class="fas fa-headset text-primary-500 mr-2"></i>
              联系我们
            </h3>
            <p class="modal-subtitle">选择以下任意方式与我们取得联系</p>
            
            <div class="contact-methods">
              <!-- 电话联系 -->
              <div class="contact-method">
                <div class="method-icon phone-icon">
                  <i class="fas fa-phone-alt"></i>
                </div>
                <div class="method-info">
                  <div class="method-label">电话咨询</div>
                  <a :href="`tel:${contactInfo.phone}`" class="method-value">{{ contactInfo.phone }}</a>
                  <a v-if="contactInfo.mobile" :href="`tel:${contactInfo.mobile}`" class="method-value text-sm">{{ contactInfo.mobile }}</a>
                </div>
              </div>
              
              <!-- 微信联系 -->
              <div class="contact-method">
                <div class="method-icon wechat-icon">
                  <i class="fab fa-weixin"></i>
                </div>
                <div class="method-info">
                  <div class="method-label">微信咨询</div>
                  <div class="qrcode-wrapper">
                    <img 
                      :src="contactInfo.wechatQrcode" 
                      alt="微信二维码"
                      class="qrcode-img"
                      @error="($event.target as HTMLImageElement).style.display = 'none'"
                    />
                    <div class="qrcode-placeholder">
                      <i class="fab fa-weixin text-3xl text-green-500"></i>
                      <span class="text-xs text-dark-400 mt-1">扫码添加</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- QQ联系 -->
              <div class="contact-method">
                <div class="method-icon qq-icon">
                  <i class="fab fa-qq"></i>
                </div>
                <div class="method-info">
                  <div class="method-label">QQ咨询</div>
                  <div class="qrcode-wrapper">
                    <img 
                      :src="contactInfo.qqQrcode" 
                      alt="QQ二维码"
                      class="qrcode-img"
                      @error="($event.target as HTMLImageElement).style.display = 'none'"
                    />
                    <div class="qrcode-placeholder">
                      <i class="fab fa-qq text-3xl text-blue-500"></i>
                      <span class="text-xs text-dark-400 mt-1">扫码添加</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 邮箱联系 -->
              <div class="contact-method">
                <div class="method-icon email-icon">
                  <i class="fas fa-envelope"></i>
                </div>
                <div class="method-info">
                  <div class="method-label">邮箱咨询</div>
                  <a :href="`mailto:${contactInfo.email}`" class="method-value">{{ contactInfo.email }}</a>
                </div>
              </div>
            </div>
            
            <div v-if="contactInfo.workTime" class="work-time">
              <i class="fas fa-clock mr-2"></i>
              工作时间：{{ contactInfo.workTime }}
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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

/* 双栏布局 - 左侧决定高度 */
.detail-layout {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

/* 左侧面板 */
.left-panel {
  flex: 1;
  padding: 2rem;
}

.product-image-container {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fafbff 0%, #f0f4ff 100%);
  border-radius: 16px;
  overflow: hidden;
  aspect-ratio: 1;
  padding: 1.5rem;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 12px;
  transition: transform 0.3s ease;
}

.product-image:hover {
  transform: scale(1.02);
}

.image-placeholder {
  text-align: center;
  padding: 2rem;
}

/* 右侧面板 */
.right-panel {
  flex: 1;
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

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.contact-modal {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f1f5f9;
  color: #475569;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.modal-subtitle {
  color: #64748b;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.contact-methods {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.contact-method {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 12px;
  background: #f8fafc;
  transition: background 0.2s;
}

.contact-method:hover {
  background: #f1f5f9;
}

.method-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.phone-icon {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.wechat-icon {
  background: linear-gradient(135deg, #07c160, #00a64a);
}

.qq-icon {
  background: linear-gradient(135deg, #12b7f5, #0099ff);
}

.email-icon {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.method-info {
  flex: 1;
  min-width: 0;
}

.method-label {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.method-value {
  color: #1e293b;
  font-weight: 500;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;
}

.method-value:hover {
  color: #667eea;
}

.qrcode-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.qrcode-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qrcode-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.work-time {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  font-size: 0.875rem;
  color: #64748b;
}

/* 弹窗动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .contact-modal,
.modal-leave-to .contact-modal {
  transform: scale(0.9) translateY(20px);
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

  .product-image-container {
    max-height: 400px;
    aspect-ratio: auto;
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
