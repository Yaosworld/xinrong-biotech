<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBrandStore } from '@/stores/brandStore'
import { useAdminStore } from '@/stores/adminStore'
import UnifiedTableEditor from '../components/UnifiedTableEditor.vue'

const brandStore = useBrandStore()
const adminStore = useAdminStore()

// 品牌数据
const brands = computed(() => brandStore.brands)

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
  { key: 'logo_url', label: 'Logo', width: 70, type: 'image' as const, imageStyle: 'contain' as const },
  { key: 'certificate_url', label: '授权证书', width: 90, type: 'image' as const, imageStyle: 'contain' as const },
  { key: 'is_own_brand', label: '自有', width: 55, type: 'boolean' as const, placeholder: '切换后品牌将移动到对应分类' },
  { key: 'country', label: '国家', width: 65, type: 'select' as const, options: countryOptions },
  { key: 'description', label: '品牌简介', width: { min: 200, flex: 1 }, type: 'textarea' as const, truncate: 80 },
  { key: 'website', label: '官方网站', showInTable: false }
])

// 生成品牌ID
const generateBrandId = () => {
  const maxIdNum = brandStore.brands.reduce((max, item) => {
    const num = parseInt(item.id?.replace('B', '') || '0')
    return Math.max(max, num)
  }, 0)
  return `B${String(maxIdNum + 1).padStart(3, '0')}`
}

// 保存数据
const handleSave = (data: any[]) => {
  brandStore.brands.splice(0, brandStore.brands.length, ...data)
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

onMounted(async () => {
  await brandStore.loadBrands()
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
  />
</template>
