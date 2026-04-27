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
import { getCategoryImagePath, getCategoryName } from '@/hooks/useCategoryImage'
import DetailPageLayout from '@/components/common/DetailPageLayout.vue'
import ContactModal from '@/components/common/ContactModal.vue'

const route = useRoute()
const productStore = useProductStore()
const siteStore = useSiteStore()

const productId = computed(() => route.params.id as string)
const showContactModal = ref(false)
const loading = ref(true)
const imageError = ref(false)

// 当前产品
const product = computed(() => {
  return productStore.getProductById(productId.value)
})

const productCategoryName = computed(() => {
  return product.value ? getCategoryName(product.value.categoryId) : '未分类'
})

const productImageUrl = computed(() => {
  if (!product.value) return '/images/common/placeholder.png'
  return getCategoryImagePath(product.value.categoryId)
})

const normalizedPrice = computed(() => {
  const rawPrice = product.value?.price
  if (rawPrice == null) return ''
  return String(rawPrice).trim()
})

const hasPrice = computed(() => {
  return !!normalizedPrice.value
})

const priceText = computed(() => {
  return normalizedPrice.value || '暂无，请联系工作人员以了解详情'
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

const handleImageError = () => {
  imageError.value = true
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
    <div class="detail-layout">
      <!-- 左侧产品信息面板 -->
      <div class="left-panel glass-card product-info-panel">
        <div class="product-header">
          <div class="flex items-center gap-3 flex-wrap">
            <h1 class="product-title">{{ product?.name }}</h1>
            <span class="product-category-badge">
              <i class="fas fa-folder-open mr-1"></i>
              {{ productCategoryName }}
            </span>
          </div>
        </div>

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
            <span class="info-label">价格</span>
            <span class="info-value" :class="hasPrice ? 'price-value' : 'price-empty-value'">
              {{ priceText }}
            </span>
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

      <!-- 右侧产品图片面板 -->
      <div class="right-panel glass-card product-image-panel">
        <h3 class="section-title-inner">
          <i class="fas fa-image text-gradient-600"></i>
          产品图片
        </h3>
        <div class="image-container product-image-container">
          <img
            v-if="!imageError"
            :src="productImageUrl"
            :alt="product?.name || productCategoryName"
            class="product-image"
            @error="handleImageError"
          />
          <div v-else class="product-image-fallback">
            <i class="fas fa-image"></i>
            <span>暂无产品图片</span>
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
  </DetailPageLayout>
</template>

<style scoped>
@import '@/styles/detail-page.css';

/* 产品特有样式 */
.product-info-panel {
  flex: 1.05;
}

.product-image-panel {
  flex: 0.95;
}

.product-header {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
}

.product-category-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 20px;
}

.product-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
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

.price-value {
  color: #dc2626;
  font-weight: 700;
}

.price-empty-value {
  color: #64748b;
  font-weight: 400;
}

.desc-value {
  color: #475569;
  line-height: 1.6;
  font-size: 0.875rem;
  font-weight: normal;
}

.product-image-container {
  min-height: 420px;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.product-image-fallback {
  width: 100%;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #94a3b8;
  font-size: 0.95rem;
}

.product-image-fallback i {
  font-size: 2rem;
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
  .product-info-panel,
  .product-image-panel {
    width: 100%;
  }

  .product-image-container,
  .product-image-fallback {
    min-height: 320px;
  }
}

@media (max-width: 768px) {
  .product-title {
    font-size: 1.25rem;
  }
}
</style>
