<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useBrandStore } from '@/stores/brandStore'
import { useAdminStore } from '@/stores/adminStore'
import UnifiedTableEditor from '../components/UnifiedTableEditor.vue'
import { adminApi } from '@/api/contentApi'
import { COUNTRY_OPTIONS, BRAND_CATEGORIES, BRAND_TYPE_OPTIONS, generateBrandId } from '@/constants/brands'

const brandStore = useBrandStore()
const adminStore = useAdminStore()

// 本地数据（从 Admin API 加载，包含草稿）
const localBrands = ref<any[]>([])
const loading = ref(false)

// 品牌数据
const brands = computed(() => localBrands.value)

// 使用常量配置
const countryOptions = [...COUNTRY_OPTIONS]
const brandTypeOptions = [...BRAND_TYPE_OPTIONS]
const categories = [...BRAND_CATEGORIES]

// 列配置
const columns = computed(() => [
  { key: 'id', label: 'ID', width: 70, editable: false, fixed: 'left' as const },
  { key: 'name', label: '品牌名称', width: 120, required: true },
  { 
    key: 'logoId', 
    label: 'Logo', 
    width: 70, 
    type: 'brand-image' as const, 
    imageType: 'logo' as const,
    // 动态获取 Logo URL
    getValue: (row: any) => row.logo_url || ''
  },
  { 
    key: 'certificateId', 
    label: '授权证书', 
    width: 90, 
    type: 'brand-image' as const, 
    imageType: 'certificate' as const,
    // 动态获取证书 URL
    getValue: (row: any) => row.certificate_url || ''
  },
  { key: 'brand_type', label: '品牌分类', width: 100, type: 'select' as const, options: brandTypeOptions, placeholder: '选择品牌分类' },
  { key: 'country', label: '国家', width: 65, type: 'select' as const, options: countryOptions },
  { key: 'description', label: '品牌简介', width: { min: 200, flex: 1 }, type: 'textarea' as const, truncate: 80 },
  { key: 'website', label: '官方网站', showInTable: false }
])

// 生成品牌ID - 基于当前编辑器数据和 store 数据，避免 ID 冲突
const handleGenerateBrandId = (currentData: any[]) => {
  const allBrands = [...currentData, ...localBrands.value]
  return generateBrandId(allBrands)
}

// 保存数据
const handleSave = (data: any[]) => {
  // 更新本地数据
  localBrands.value = [...data]
  adminStore.addActivity({
    type: 'modify',
    target: 'brands',
    description: `保存了品牌列表数据，共 ${data.length} 条`
  })
}

// 发布后清除缓存
const handlePublish = () => {
  brandStore.clearCache()
}

// 重新加载数据（版本回滚后调用）
const handleReload = async () => {
  await loadAdminData()
}

// 从 Admin API 加载数据（包含草稿）
const loadAdminData = async () => {
  loading.value = true
  try {
    // 从 Admin API 加载（优先使用草稿数据）
    const result = await adminApi.getList('brand', { pageSize: 9999 })
    localBrands.value = result.data.map(item => {
      const data = item.draftData || item.publishedData
      // 兼容旧数据：将 is_own_brand 转换为 brand_type
      if (data && !(data as any).brand_type && (data as any).is_own_brand !== undefined) {
        (data as any).brand_type = (data as any).is_own_brand === true ? 'own' : 'partner'
      }
      return data
    }).filter(Boolean)
  } catch (e) {
    console.error('Admin API 加载失败:', e)
    localBrands.value = []
    ElMessage.error('加载品牌数据失败，请检查后台接口')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadAdminData()
})
</script>

<template>
  <UnifiedTableEditor
    title="品牌列表"
    :data="brands"
    :columns="columns"
    row-key="id"
    :categories="categories"
    default-category="own"
    :sort-config="{ enabled: true, field: 'sort_order' }"
    :publish-config="{ enabled: true, contentType: 'brand' }"
    :page-size="12"
    :page-sizes="[12, 24, 48, 100]"
    search-placeholder="搜索品牌名称、国家..."
    :generate-id="handleGenerateBrandId"
    @save="handleSave"
    @publish="handlePublish"
    @reload="handleReload"
  />
</template>
