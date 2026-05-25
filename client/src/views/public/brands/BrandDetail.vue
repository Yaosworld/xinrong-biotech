<script setup lang="ts">
/**
 * 品牌详情页
 * 
 * 使用 DetailPageLayout 通用布局组件
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useBrandStore } from '@/stores/brandStore'
import { BRAND_TYPE_CONFIG, type BrandType } from '@/types'
import DetailPageLayout from '@/components/common/DetailPageLayout.vue'

const route = useRoute()
const brandStore = useBrandStore()

const brandId = computed(() => route.params.id as string)
const imageError = ref(false)
const certificateImageError = ref(false)
const loading = ref(true)

// 当前品牌
const brand = computed(() => {
  return brandStore.getBrandById(brandId.value)
})

// 获取品牌类型（兼容旧数据）
const brandType = computed((): BrandType => {
  if (brand.value?.brand_type) return brand.value.brand_type
  return brand.value?.is_own_brand === true ? 'own' : 'partner'
})

// 品牌类型标签
const brandTypeBadge = computed(() => {
  return BRAND_TYPE_CONFIG[brandType.value]?.label || ''
})

// 判断是否有有效的证书图片
const hasValidCertificate = computed(() => {
  return brand.value?.certificate_url && !certificateImageError.value
})

// 品牌描述分段（支持多段落）
const descriptionParagraphs = computed(() => {
  if (!brand.value?.description) return []
  return brand.value.description.split(/\n\n+/).filter(p => p.trim())
})

// Logo加载错误处理
const handleImageError = () => {
  imageError.value = true
}

// 证书图片加载错误处理
const handleCertificateImageError = () => {
  certificateImageError.value = true
}

onMounted(async () => {
  loading.value = true
  try {
    await brandStore.loadBrands()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <DetailPageLayout
    title="品牌介绍"
    back-text="返回品牌中心"
    back-path="/brands"
    :loading="loading"
    loading-text="加载品牌详情..."
    :not-found="!loading && !brand"
    not-found-icon="fas fa-exclamation-triangle"
    not-found-title="品牌未找到"
    not-found-description="抱歉，您查找的品牌不存在或已被移除"
  >
    <div class="detail-layout" :class="{ 'single-column': !hasValidCertificate }">
      <!-- 左侧内容面板 -->
      <div class="left-panel glass-card">
        <!-- 品牌头部 -->
        <div class="brand-header">
          <div class="logo-and-title">
            <div class="brand-logo">
              <img
                v-if="!imageError && brand?.logo_url"
                :src="brand.logo_url"
                :alt="brand?.name"
                @error="handleImageError"
              />
              <div v-else class="logo-fallback">
                {{ brand?.name?.charAt(0) }}
              </div>
            </div>
            <div class="brand-titles">
              <div class="flex items-center gap-3 flex-wrap">
                <h1 class="brand-title">{{ brand?.name }}</h1>
                <span v-if="brandTypeBadge" class="own-brand-badge">
                  <i class="fas fa-star mr-1"></i>
                  {{ brandTypeBadge }}
                </span>
              </div>
              <p v-if="brand?.country" class="brand-subtitle">
                <i class="fas fa-globe mr-2"></i>
                {{ brand.country }}
              </p>
            </div>
          </div>
        </div>

        <!-- 品牌介绍 -->
        <div v-if="brand?.description" class="brand-description">
          <h3 class="section-title-inner">
            <i class="fas fa-file-alt text-gradient-600"></i>
            品牌介绍
          </h3>
          <div class="description-content">
            <p
              v-for="(paragraph, index) in descriptionParagraphs"
              :key="index"
              class="paragraph"
              v-html="paragraph.replace(/\n/g, '<br>')"
            ></p>
            <p v-if="descriptionParagraphs.length === 0" class="paragraph">
              {{ brand.description }}
            </p>
          </div>
        </div>
      </div>

      <!-- 右侧授权证书面板 -->
      <div v-if="hasValidCertificate" class="right-panel glass-card">
        <h3 class="section-title-inner">
          <i class="fas fa-certificate text-gradient-600"></i>
          代理授权证书
        </h3>
        <div class="certificate-container">
          <img
            :src="brand?.certificate_url"
            :alt="`${brand?.name} 代理授权证书`"
            class="certificate-image"
            @error="handleCertificateImageError"
          />
        </div>
      </div>
    </div>
  </DetailPageLayout>
</template>

<style scoped>
@import '@/styles/detail-page.css';

/* 品牌特有样式 */
.brand-header {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(5, 84, 140, 0.1);
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
  border: 2px solid rgba(5, 84, 140, 0.2);
  box-shadow: 0 4px 12px rgba(5, 84, 140, 0.1);
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
  background: linear-gradient(135deg, #05548C, #43CEED);
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
  background: linear-gradient(135deg, #05548C, #43CEED);
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

.certificate-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 84, 140, 0.03);
  border-radius: 16px;
  border: 2px dashed rgba(5, 84, 140, 0.15);
  position: relative;
  overflow: hidden;
}

.certificate-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 响应式 */
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
}
</style>
