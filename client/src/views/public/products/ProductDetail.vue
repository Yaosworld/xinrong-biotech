<script setup lang="ts">
/**
 * 产品详情页
 * 
 * 使用 DetailPageLayout 通用布局组件
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useProductStore } from '@/stores/productStore'
import { useSiteStore } from '@/stores/siteStore'
import DetailPageLayout from '@/components/common/DetailPageLayout.vue'
import ContactModal from '@/components/common/ContactModal.vue'

const route = useRoute()
const productStore = useProductStore()
const siteStore = useSiteStore()

const productId = computed(() => route.params.id as string)
const showContactModal = ref(false)
const loading = ref(true)

// 当前产品
const product = computed(() => {
  return productStore.getProductById(productId.value)
})

// 从 store 获取联系信息
const contactInfo = computed(() => ({
  phone1: siteStore.primaryPhone,
  phone2: siteStore.secondaryPhone,
  email: siteStore.contact.email,
  wechatQrcode: siteStore.contact.wechatQrcode,
  workTime: siteStore.contact.workTime
}))

// 打开咨询弹窗
const openContactModal = () => {
  showContactModal.value = true
}

// 关闭咨询弹窗
const closeContactModal = () => {
  showContactModal.value = false
}

onMounted(async () => {
  loading.value = true
  try {
    await productStore.loadProducts()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <DetailPageLayout
    title="产品详情"
    back-text="返回产品中心"
    back-path="/products"
    :loading="loading"
    loading-text="加载产品详情..."
    :not-found="!loading && !product"
    not-found-icon="fas fa-box-open"
    not-found-title="产品未找到"
    not-found-description="抱歉，您查找的产品不存在或已下架"
  >
    <div class="detail-layout single-column">
      <!-- 产品信息面板 -->
      <div class="product-panel glass-card">
        <!-- 产品名称 -->
        <h1 class="product-title">{{ product?.name }}</h1>
        
        <!-- 信息列表 -->
        <div class="info-list">
          <div class="info-item">
            <span class="info-label">货号</span>
            <span class="info-value">{{ product?.sku || '-' }}</span>
          </div>

          <div class="info-item">
            <span class="info-label">品牌</span>
            <span class="info-value brand-value">{{ product?.brand || '-' }}</span>
          </div>

          <div class="info-item">
            <span class="info-label">规格</span>
            <span class="info-value">{{ product?.specs || '-' }}</span>
          </div>

          <div class="info-item">
            <span class="info-label">单位</span>
            <span class="info-value">{{ product?.unit || '-' }}</span>
          </div>

          <div class="info-item desc-item">
            <span class="info-label">描述</span>
            <p class="info-value desc-value">{{ product?.desc || '暂无描述' }}</p>
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

    <!-- 联系我们弹窗 -->
    <ContactModal
      :show="showContactModal"
      :contact-info="contactInfo"
      @close="closeContactModal"
    />
  </DetailPageLayout>
</template>

<style scoped>
@import '@/styles/detail-page.css';

/* 产品特有样式 */
.product-panel {
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

/* 响应式 */
@media (max-width: 1024px) {
  .product-panel {
    width: 100%;
    padding: 1.5rem;
  }
}
</style>
