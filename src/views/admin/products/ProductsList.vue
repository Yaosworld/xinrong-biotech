<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useAdminStore } from '@/stores/adminStore'
import UnifiedTableEditor from '../components/UnifiedTableEditor.vue'
import { CATEGORIES, getCategoryImagePath } from '@/hooks/useCategoryImage'
import { ExcelProcessor } from '@/utils/excelProcessor'

const productStore = useProductStore()
const adminStore = useAdminStore()

// 产品数据 - 添加分类图片路径
const products = computed(() => 
  productStore.products.map(p => ({
    ...p,
    categoryImage: getCategoryImagePath(p.categoryId)
  }))
)

// 列配置
// 注意：sortable 列会自动增加24px给排序箭头
const columns = computed(() => [
  { key: 'id', label: 'ID', width: 65, editable: false, sortable: true, fixed: 'left' as const },
  { key: 'categoryImage', label: '分类图', width: 70, type: 'image' as const, editable: false, imageStyle: 'contain' as const, showInForm: false },
  { key: 'name', label: '产品名称', width: { min: 100, flex: 1.5 }, required: true },
  { key: 'sku', label: '货号', width: { min: 110, flex: 2 } },
  { key: 'brand', label: '品牌', width: { min: 100, flex: 1.5 } },
  { 
    key: 'categoryId', 
    label: '分类', 
    width: 120,
    type: 'select' as const,
    options: CATEGORIES.map(c => ({ label: c.name, value: c.id }))
  },
  { key: 'specs', label: '规格', width: 75, truncate: 12 },
  { key: 'unit', label: '单位', width: 55 },
  { key: 'desc', label: '描述', width: { min: 150, flex: 3 }, type: 'textarea' as const, truncate: 40 }
])

// Excel 导入处理
const handleExcelImport = async (file: File) => {
  const result = await ExcelProcessor.processProducts(file)
  if (!result.success) {
    throw new Error(result.validation.errors.join('\n'))
  }
  return result.data
}

// 保存前处理 - 移除 categoryImage
const beforeSave = (data: any[]) => {
  return data.map(({ categoryImage, ...rest }) => rest)
}

// 生成产品ID
const generateProductId = () => {
  const maxIdNum = productStore.products.reduce((max, item) => {
    const num = parseInt(item.id?.replace('P', '') || '0')
    return Math.max(max, num)
  }, 0)
  return `P${maxIdNum + 1}`
}

// 保存数据
const handleSave = (data: any[]) => {
  productStore.products.splice(0, productStore.products.length, ...data)
  adminStore.addActivity({
    type: 'modify',
    target: 'products',
    description: `保存了产品列表数据，共 ${data.length} 条`
  })
}

// 导入数据
const handleImport = (data: any[]) => {
  adminStore.addActivity({
    type: 'modify',
    target: 'products',
    description: `导入了 ${data.length} 条产品数据`
  })
}

onMounted(async () => {
  await productStore.loadProducts()
})
</script>

<template>
  <UnifiedTableEditor
    title="产品列表"
    :data="products"
    :columns="columns"
    row-key="id"
    search-placeholder="搜索产品名称、货号、品牌..."
    :page-size="12"
    :page-sizes="[12, 24, 48, 100]"
    :import-config="{ enabled: true, accept: '.xlsx,.xls', handler: handleExcelImport }"
    :before-save="beforeSave"
    :generate-id="generateProductId"
    @save="handleSave"
    @import="handleImport"
  />
</template>
