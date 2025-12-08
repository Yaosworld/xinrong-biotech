<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBrandStore } from '@/stores/brandStore'
import { useAdminStore } from '@/stores/adminStore'
import AdvancedTableEditor from '../components/AdvancedTableEditor.vue'

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

// 列配置 - 优先级列更宽
const columns = computed(() => [
  { key: 'id', label: 'ID', width: 70, editable: false, sortable: true, fixed: 'left' as const },
  { key: 'logo_url', label: 'Logo', width: 80, type: 'image' as const, imageStyle: 'contain' as const },
  { key: 'name', label: '品牌名称', width: 240, required: true },
  { key: 'english_name', label: '英文名', width: 120, showInTable: false },
  { 
    key: 'country', 
    label: '国家', 
    width: 80,
    type: 'select' as const,
    options: countryOptions
  },
  { 
    key: 'is_own_brand', 
    label: '自有', 
    width: 65,
    type: 'boolean' as const
  },
  { key: 'priority', label: '优先级', width: 100, type: 'number' as const, sortable: true },
  { key: 'description', label: '品牌简介', minWidth: 130, type: 'textarea' as const, truncate: 50 },
  // 以下字段在表格中不显示，但在编辑面板中可编辑
  { key: 'certificate_url', label: '授权证书', type: 'image' as const, showInTable: false },
  { key: 'website', label: '官方网站', showInTable: false, required: false }
])

// 保存数据
const handleSave = (data: any[]) => {
  brandStore.brands.splice(0, brandStore.brands.length, ...data)
  
  adminStore.addActivity({
    type: 'modify',
    target: 'brands',
    description: `保存了品牌列表数据，共 ${data.length} 条`
  })
}

// 添加品牌
const handleAdd = (item: any) => {
  adminStore.addActivity({
    type: 'modify',
    target: 'brands',
    description: `添加了新品牌: ${item.name}`
  })
}

// 更新品牌
const handleUpdate = (item: any) => {
  adminStore.addActivity({
    type: 'modify',
    target: 'brands',
    description: `更新了品牌: ${item.name}`
  })
}

// 删除品牌
const handleDelete = (item: any) => {
  adminStore.addActivity({
    type: 'modify',
    target: 'brands',
    description: `删除了品牌: ${item.name}`
  })
}

onMounted(async () => {
  await brandStore.loadBrands()
})
</script>

<template>
  <AdvancedTableEditor
    title="品牌列表"
    :data="brands"
    :columns="columns"
    row-key="id"
    searchable
    search-placeholder="搜索品牌名称、国家..."
    addable
    editable
    deletable
    :page-size="10"
    :page-sizes="[10, 20, 50]"
    @save="handleSave"
    @add="handleAdd"
    @update="handleUpdate"
    @delete="handleDelete"
  />
</template>
