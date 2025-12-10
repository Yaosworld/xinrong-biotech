<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBrandStore } from '@/stores/brandStore'
import { useAdminStore } from '@/stores/adminStore'
import UnifiedTableEditor from '../components/UnifiedTableEditor.vue'
import { adminApi } from '@/api/contentApi'

const brandStore = useBrandStore()
const adminStore = useAdminStore()

// 本地数据（从 Admin API 加载，包含草稿）
const localBrands = ref<any[]>([])
const loading = ref(false)

// 品牌数据
const brands = computed(() => localBrands.value)

// 国家选项
const countryOptions = [
  { label: '中国', value: '中国' },
  { label: '美国', value: '美国' },
  { label: '日本', value: '日本' },
  { label: '德国', value: '德国' },
  { label: '英国', value: '英国' },
  { label: '法国', value: '法国' },
  { label: '瑞士', value: '瑞士' },
  { label: '韩国', value: '韩国' }
]

// 分类配置
const categories = [
  { key: 'own', label: '自主品牌', filter: (item: any) => item.is_own_brand === true },
  { key: 'agent', label: '代理品牌', filter: (item: any) => item.is_own_brand !== true }
]

// 列配置
const columns = computed(() => [
  { key: 'id', label: 'ID', width: 70, editable: false, fixed: 'left' as const },
  { key: 'name', label: '品牌名称', width: 120, required: true },
  { 
    key: 'logo_url', 
    label: 'Logo', 
    width: 70, 
    type: 'image' as const, 
    imageStyle: 'contain' as const,
    uploadCategory: 'brand-logo' as const,
    placeholder: '上传品牌 Logo 图片'
  },
  { 
    key: 'certificate_url', 
    label: '授权证书', 
    width: 90, 
    type: 'image' as const, 
    imageStyle: 'contain' as const,
    uploadCategory: 'brand-cert' as const,
    placeholder: '上传品牌授权证书'
  },
  { key: 'is_own_brand', label: '自有', width: 55, type: 'boolean' as const, placeholder: '切换后品牌将移动到对应分类' },
  { key: 'country', label: '国家', width: 65, type: 'select' as const, options: countryOptions },
  { key: 'description', label: '品牌简介', width: { min: 200, flex: 1 }, type: 'textarea' as const, truncate: 80 },
  { key: 'website', label: '官方网站', showInTable: false }
])

// 生成品牌ID - 基于所有数据避免冲突
const generateBrandId = () => {
  const allBrands = [...localBrands.value, ...brandStore.brands]
  const maxIdNum = allBrands.reduce((max, item) => {
    const num = parseInt(item.id?.replace('B', '') || '0')
    return Math.max(max, num)
  }, 0)
  return `B${String(maxIdNum + 1).padStart(3, '0')}`
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
    localBrands.value = result.data.map(item => item.draftData || item.publishedData)
  } catch (e) {
    console.warn('Admin API 加载失败，降级到前台 Store:', e)
    // 降级到前台 Store
    await brandStore.loadBrands()
    localBrands.value = [...brandStore.brands]
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
    :paginated="false"
    search-placeholder="搜索品牌名称、国家..."
    :generate-id="generateBrandId"
    @save="handleSave"
    @publish="handlePublish"
    @reload="handleReload"
  />
</template>
