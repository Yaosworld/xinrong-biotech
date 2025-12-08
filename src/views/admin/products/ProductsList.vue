<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useAdminStore } from '@/stores/adminStore'
import AdvancedTableEditor from '../components/AdvancedTableEditor.vue'
import { CATEGORIES, getCategoryImagePath } from '@/hooks/useCategoryImage'

const productStore = useProductStore()
const adminStore = useAdminStore()

// 产品数据 - 添加分类图片路径
const products = computed(() => 
  productStore.products.map(p => ({
    ...p,
    categoryImage: getCategoryImagePath(p.categoryId)
  }))
)

// 列配置 - 产品名称更窄，品牌更宽
const columns = computed(() => [
  { key: 'id', label: 'ID', width: 70, editable: false, sortable: true, fixed: 'left' as const },
  { key: 'categoryImage', label: '分类图', width: 70, type: 'image' as const, editable: false, imageStyle: 'contain' as const },
  { key: 'name', label: '产品名称', width: 150, required: true },
  { key: 'sku', label: '货号', minWidth: 120 },
  { key: 'brand', label: '品牌', width: 170 },
  { 
    key: 'categoryId', 
    label: '分类', 
    width: 120,
    type: 'select' as const,
    options: CATEGORIES.map(c => ({ label: c.name, value: c.id }))
  },
  { key: 'specs', label: '规格', width: 100, truncate: 15 },
  { key: 'unit', label: '单位', width: 70 },
  { key: 'desc', label: '描述', minWidth: 180, type: 'textarea' as const, truncate: 35 }
])

// 保存数据
const handleSave = (data: any[]) => {
  // 移除临时添加的 categoryImage 字段
  const cleanData = data.map(({ categoryImage, ...rest }) => rest)
  productStore.products.splice(0, productStore.products.length, ...cleanData)
  
  adminStore.addActivity({
    type: 'modify',
    target: 'products',
    description: `保存了产品列表数据，共 ${data.length} 条`
  })
}

// 添加产品
const handleAdd = (item: any) => {
  adminStore.addActivity({
    type: 'modify',
    target: 'products',
    description: `添加了新产品: ${item.name}`
  })
}

// 更新产品
const handleUpdate = (item: any) => {
  adminStore.addActivity({
    type: 'modify',
    target: 'products',
    description: `更新了产品: ${item.name}`
  })
}

// 删除产品
const handleDelete = (item: any) => {
  adminStore.addActivity({
    type: 'modify',
    target: 'products',
    description: `删除了产品: ${item.name}`
  })
}

onMounted(async () => {
  await productStore.loadProducts()
})
</script>

<template>
  <AdvancedTableEditor
    title="产品列表"
    :data="products"
    :columns="columns"
    row-key="id"
    searchable
    search-placeholder="搜索产品名称、货号、品牌..."
    addable
    editable
    deletable
    :page-size="12"
    :page-sizes="[12, 24, 48, 100]"
    @save="handleSave"
    @add="handleAdd"
    @update="handleUpdate"
    @delete="handleDelete"
  />
</template>
