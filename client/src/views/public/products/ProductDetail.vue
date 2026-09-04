<script setup lang="ts">
/**
 * 产品详情页
 * 
 * 布局：左侧分类侧栏 + 右侧产品详情 + 底部相关产品推荐
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '@/stores/productStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useSiteStore } from '@/stores/siteStore'
import { getCategoryImagePath, getCategoryName } from '@/hooks/useCategoryImage'
import ContactModal from '@/components/common/ContactModal.vue'
import GeometricBackground from '@/components/common/GeometricBackground.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ShowcaseBanner from '@/components/common/ShowcaseBanner.vue'
import { renderProductDescription } from '@/utils/productDescription'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const categoryStore = useCategoryStore()
const siteStore = useSiteStore()

const productId = computed(() => route.params.id as string)
const showContactModal = ref(false)
const loading = ref(true)
const imageError = ref(false)
const detailImageError = ref(false)
const descriptionImageError = ref(false)

// 分类列表
const categories = computed(() => categoryStore.categories)

// 当前产品
const product = computed(() => {
  return productStore.getProductById(productId.value)
})

// 当前产品所属分类ID
const currentCategoryId = computed(() => product.value?.categoryId || '')

const productCategoryName = computed(() => {
  return product.value ? getCategoryName(product.value.categoryId) : '未分类'
})

const productImageUrl = computed(() => {
  if (!product.value) return '/images/common/placeholder.png'
  if (product.value.detailImageUrl && !detailImageError.value) {
    return product.value.detailImageUrl
  }
  return getCategoryImagePath(product.value.categoryId)
})

const hasDescriptionText = computed(() => !!product.value?.desc?.trim())
const hasDescriptionImage = computed(() => !!product.value?.descriptionImageUrl && !descriptionImageError.value)
const hasDescription = computed(() => hasDescriptionText.value || hasDescriptionImage.value)
const descriptionHtml = computed(() => renderProductDescription(product.value?.desc))

const normalizedPrice = computed(() => {
  const rawPrice = product.value?.price
  if (rawPrice == null) return ''
  return String(rawPrice).trim()
})

const hasPrice = computed(() => {
  return !!normalizedPrice.value
})

const priceText = computed(() => {
  return normalizedPrice.value || '暂无，请联系工作人员'
})

// 从 store 获取联系信息
const contactInfo = computed(() => ({
  phone1: siteStore.primaryPhone,
  phone2: siteStore.secondaryPhone,
  email: siteStore.contact.email,
  wechatQrcode: siteStore.contact.wechatQrcode,
  workTime: siteStore.contact.workTime
}))

// 导航到分类页面
const goToCategory = (categoryId: string) => {
  router.push(`/products?category=${categoryId}`)
}

// 返回产品中心
const goBack = () => {
  router.push('/products')
}

// 打开咨询弹窗
const openContactModal = () => {
  showContactModal.value = true
}

// 关闭咨询弹窗
const closeContactModal = () => {
  showContactModal.value = false
}

const handleImageError = () => {
  if (product.value?.detailImageUrl && !detailImageError.value) {
    detailImageError.value = true
    return
  }
  imageError.value = true
}

const handleDescriptionImageError = () => {
  descriptionImageError.value = true
}

watch(productId, () => {
  imageError.value = false
  detailImageError.value = false
  descriptionImageError.value = false
})

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      productStore.loadProducts(),
      categoryStore.ensureLoaded()
    ])
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="product-detail-page">
    <!-- 装饰背景 -->
    <GeometricBackground :shape-count="12" :min-size="12" :max-size="40" :min-opacity="0.04" :max-opacity="0.12" />

    <!-- 顶部横幅 -->
    <div class="top-banner-wrapper">
      <ShowcaseBanner
        :slogans="['专业科研试剂耗材供应', '为您的实验保驾护航']"
        :stats="[
          { number: '1000+', label: '产品种类' },
          { number: '50+', label: '合作品牌' },
          { number: '10+', label: '年行业经验' }
        ]"
      />
    </div>

    <!-- 主体内容 -->
    <div class="page-body">
      <div class="page-container">
        <!-- 面包屑导航 -->
        <div class="breadcrumb">
          <span class="breadcrumb-item" @click="goBack">产品中心</span>
          <i class="fas fa-chevron-right breadcrumb-sep"></i>
          <span class="breadcrumb-item" @click="goToCategory(currentCategoryId)">{{ productCategoryName }}</span>
          <i class="fas fa-chevron-right breadcrumb-sep"></i>
          <span class="breadcrumb-current">{{ product?.name || '产品详情' }}</span>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <LoadingSpinner text="加载产品详情..." />
        </div>

        <!-- 未找到 -->
        <div v-else-if="!product" class="not-found-card">
          <i class="fas fa-box-open not-found-icon"></i>
          <h3>产品未找到</h3>
          <p>抱歉，您查找的产品不存在或已下架</p>
          <button class="back-btn" @click="goBack">
            <i class="fas fa-arrow-left mr-2"></i>返回产品中心
          </button>
        </div>

        <!-- 产品详情主体 -->
        <div v-else class="detail-main">
          <!-- 左侧分类侧栏 -->
          <aside class="category-sidebar">
            <h3 class="sidebar-title">
              <i class="fas fa-th-list mr-2"></i>产品分类
            </h3>
            <ul class="category-list">
              <li
                v-for="cat in categories"
                :key="cat.id"
                class="category-item"
                :class="{ active: cat.id === currentCategoryId }"
                @click="goToCategory(cat.id)"
              >
                <i class="fas fa-angle-right category-arrow"></i>
                <span>{{ cat.name }}</span>
              </li>
            </ul>

          </aside>

          <!-- 右侧内容区 -->
          <div class="detail-content">
            <!-- 产品信息卡片 -->
            <div class="product-card">
              <div class="product-layout">
                <!-- 产品图片 -->
                <div class="product-image-area">
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

                <!-- 产品信息 -->
                <div class="product-info">
                  <h1 class="product-name">{{ product.name }}</h1>

                  <div class="price-row">
                    <span class="price-label">价格：</span>
                    <span class="price-value" v-if="hasPrice">¥{{ normalizedPrice }}</span>
                    <span class="price-empty" v-else>{{ priceText }}</span>
                  </div>

                  <div class="info-table">
                    <div class="info-row">
                      <span class="info-label">货号：</span>
                      <span class="info-value">{{ product.sku || '-' }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">品牌：</span>
                      <span class="info-value brand-value">{{ product.brand || '-' }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">分类：</span>
                      <span class="info-value">{{ productCategoryName }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">规格：</span>
                      <span class="info-value">{{ product.specs || '-' }}</span>
                    </div>
                    <div v-if="product.unit" class="info-row">
                      <span class="info-label">单位：</span>
                      <span class="info-value">{{ product.unit }}</span>
                    </div>
                  </div>

                  <button class="inquiry-btn" @click="openContactModal">
                    <i class="fas fa-phone-alt mr-2"></i>更多规格咨询
                  </button>
                </div>
              </div>

              <!-- 产品描述 -->
              <div v-if="hasDescription" class="product-desc-section">
                <h3 class="desc-title"><i class="fas fa-file-alt mr-2"></i>产品描述</h3>
                <div v-if="hasDescriptionText" class="desc-content product-markdown" v-html="descriptionHtml"></div>
                <img
                  v-if="product.descriptionImageUrl && !descriptionImageError"
                  :src="product.descriptionImageUrl"
                  :alt="`${product.name}产品描述`"
                  class="description-image"
                  @error="handleDescriptionImageError"
                />
              </div>
              <div v-else class="product-desc-section product-desc-empty">
                <h3 class="desc-title"><i class="fas fa-file-alt mr-2"></i>产品描述</h3>
                <p class="desc-content">目前没有详情资料</p>
              </div>
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
  background: linear-gradient(180deg, #f0f7fc 0%, #f5f7fa 30%, #f8fafc 100%);
  position: relative;
}

.page-body {
  padding: 24px 0 60px;
  position: relative;
  z-index: 1;
}

.top-banner-wrapper {
  margin-top: 80px;
}

.page-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

/* 面包屑 */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 12px 0;
  font-size: 0.85rem;
  color: #64748b;
}

.breadcrumb-item {
  cursor: pointer;
  transition: color 0.2s;
}

.breadcrumb-item:hover {
  color: #05548C;
}

.breadcrumb-sep {
  font-size: 0.65rem;
  color: #cbd5e1;
}

.breadcrumb-current {
  color: #1e293b;
  font-weight: 500;
}

/* 加载 & 未找到 */
.loading-container {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.not-found-card {
  text-align: center;
  padding: 80px 40px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(5, 84, 140, 0.06);
}

.not-found-icon {
  font-size: 3rem;
  color: #cbd5e1;
  margin-bottom: 16px;
}

.not-found-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.not-found-card p {
  color: #64748b;
  margin-bottom: 24px;
}

.back-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #05548C, #43CEED);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(5, 84, 140, 0.3);
}

/* 主体布局 */
.detail-main {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 40px;
}

/* 左侧分类侧栏 */
.category-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  border: 1px solid #e8eef3;
  align-self: flex-start;
  position: sticky;
  top: 96px;
}

.sidebar-title {
  padding: 16px 20px;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #05548C, #0d8ab3);
  margin: 0;
  display: flex;
  align-items: center;
}

.category-list {
  list-style: none;
  margin: 0;
  padding: 8px 0;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  font-size: 0.95rem;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
  border-left: 3px solid transparent;
}

.category-item:hover {
  color: #05548C;
  background: #f0f9ff;
  border-left-color: #43CEED;
}

.category-item.active {
  color: #05548C;
  background: #e8f4fa;
  border-left-color: #05548C;
  font-weight: 600;
}

.category-arrow {
  font-size: 0.7rem;
  color: #94a3b8;
}

.category-item:hover .category-arrow,
.category-item.active .category-arrow {
  color: #05548C;
}

/* 右侧内容区 */
.detail-content {
  flex: 1;
  min-width: 0;
}

/* 产品卡片 */
.product-card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  border: 1px solid #e8eef3;
}

.product-layout {
  display: flex;
}

/* 产品图片 */
.product-image-area {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafcfd;
  border-right: 1px solid #e8eef3;
  padding: 20px;
  min-height: 320px;
}

.product-image {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
}

.product-image-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #94a3b8;
  font-size: 0.85rem;
}

.product-image-fallback i {
  font-size: 2rem;
}

/* 产品信息 */
.product-info {
  flex: 1;
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
}

.product-name {
  font-size: 1.4rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px;
  line-height: 1.4;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.price-label {
  font-size: 0.85rem;
  color: #64748b;
}

.price-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: #dc2626;
}

.price-empty {
  font-size: 0.85rem;
  color: #64748b;
}

.info-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
  flex: 1;
}

.info-row {
  display: flex;
  align-items: baseline;
  font-size: 0.875rem;
}

.info-label {
  width: 56px;
  flex-shrink: 0;
  color: #64748b;
}

.info-value {
  color: #1e293b;
  font-weight: 500;
}

.brand-value {
  color: #05548C;
  cursor: pointer;
}

.brand-value:hover {
  text-decoration: underline;
}

/* 咨询按钮 */
.inquiry-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 11px 28px;
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-start;
}

.inquiry-btn:hover {
  background: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
}

/* 产品描述 */
.product-desc-section {
  padding: 20px 32px;
  border-top: 1px solid #f0f0f0;
}

.desc-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 10px;
  display: flex;
  align-items: center;
}

.desc-title i {
  color: #05548C;
}

.desc-content {
  color: #475569;
  line-height: 1.8;
  font-size: 0.875rem;
  margin: 0;
}

.product-markdown :deep(p) {
  margin: 0 0 14px;
}

.product-markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.product-markdown :deep(h1),
.product-markdown :deep(h2),
.product-markdown :deep(h3),
.product-markdown :deep(h4) {
  color: #1e293b;
  font-weight: 700;
  line-height: 1.4;
  margin: 22px 0 10px;
}

.product-markdown :deep(h1) { font-size: 1.35rem; }
.product-markdown :deep(h2) { font-size: 1.15rem; }
.product-markdown :deep(h3) { font-size: 1rem; }
.product-markdown :deep(h4) { font-size: 0.95rem; }

.product-markdown :deep(h1:first-child),
.product-markdown :deep(h2:first-child),
.product-markdown :deep(h3:first-child),
.product-markdown :deep(h4:first-child) {
  margin-top: 0;
}

.product-markdown :deep(ul),
.product-markdown :deep(ol) {
  margin: 10px 0 16px;
  padding-left: 24px;
}

.product-markdown :deep(li) {
  margin: 6px 0;
  padding-left: 4px;
}

.product-markdown :deep(strong) {
  color: #0f172a;
  font-weight: 700;
}

.product-markdown :deep(blockquote) {
  margin: 16px 0;
  padding: 10px 16px;
  color: #64748b;
  border-left: 3px solid #43ceed;
  background: #f0f9ff;
}

.product-markdown :deep(code) {
  padding: 2px 5px;
  color: #075985;
  background: #e0f2fe;
  border-radius: 3px;
}

.product-markdown :deep(pre) {
  overflow-x: auto;
  margin: 14px 0;
  padding: 14px;
  color: #e2e8f0;
  background: #1e293b;
  border-radius: 6px;
}

.product-markdown :deep(pre code) {
  padding: 0;
  color: inherit;
  background: transparent;
}

.product-markdown :deep(table) {
  width: 100%;
  margin: 16px 0;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.product-markdown :deep(th),
.product-markdown :deep(td) {
  padding: 9px 12px;
  text-align: left;
  border: 1px solid #dbe5ec;
}

.product-markdown :deep(th) {
  color: #1e293b;
  background: #f0f7fc;
  font-weight: 600;
}

.product-markdown :deep(a) {
  color: #056b9e;
  text-decoration: underline;
}

.description-image {
  display: block;
  max-width: 100%;
  height: auto;
  margin-top: 20px;
  object-fit: contain;
}

.product-desc-empty .desc-content {
  color: #94a3b8;
}

/* 响应式 */
@media (max-width: 1024px) {
  .detail-main {
    flex-direction: column;
  }

  .category-sidebar {
    width: 100%;
    position: static;
  }

  .category-list {
    display: flex;
    flex-wrap: wrap;
    padding: 10px 12px;
    gap: 6px;
  }

  .category-item {
    padding: 7px 14px;
    border-left: none;
    border-radius: 20px;
    background: #f1f5f9;
    font-size: 0.8rem;
  }

  .category-item:hover {
    border-left-color: transparent;
  }

  .category-item.active {
    background: #05548C;
    color: #fff;
    border-left-color: transparent;
  }

  .category-item.active .category-arrow {
    color: #fff;
  }

  .product-layout {
    flex-direction: column;
  }

  .product-image-area {
    width: 100%;
    min-height: 240px;
    border-right: none;
    border-bottom: 1px solid #e8eef3;
  }
}

@media (max-width: 768px) {
  .page-container {
    padding: 0 16px;
  }

  .product-info {
    padding: 20px;
  }

  .product-name {
    font-size: 1.2rem;
  }

  .price-value {
    font-size: 1.4rem;
  }

  .product-desc-section {
    padding: 16px 20px;
  }
}
</style>
