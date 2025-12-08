<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePromotionStore } from '@/stores/promotionStore'
import { useAdminStore } from '@/stores/adminStore'
import AdvancedTableEditor from '../components/AdvancedTableEditor.vue'

const promotionStore = usePromotionStore()
const adminStore = useAdminStore()

// 活动数据
const promotions = computed(() => promotionStore.promotions)

// 列配置
const columns = computed(() => [
  { key: 'id', label: 'ID', width: 60, editable: false, sortable: true, fixed: 'left' as const },
  { key: 'cover_url', label: '封面', width: 80, type: 'image' as const, imageStyle: 'contain' as const },
  { key: 'poster_url', label: '海报', width: 80, type: 'image' as const, imageStyle: 'contain' as const },
  { key: 'title', label: '活动标题', minWidth: 180, required: true },
  { key: 'summary', label: '摘要', minWidth: 160, truncate: 30 },
  { key: 'description', label: '详情', minWidth: 160, type: 'textarea' as const, truncate: 30 },
  { key: 'start_date', label: '开始', width: 100, type: 'date' as const, sortable: true },
  { key: 'end_date', label: '结束', width: 100, type: 'date' as const, sortable: true },
  { key: 'tags', label: '标签', minWidth: 120, truncate: 20 },
  // 以下字段在表格中不显示，但在编辑面板中可编辑
  { key: 'icon_class', label: '图标类名', showInTable: false, required: false },
  { key: 'publish_date', label: '发布日期', type: 'date' as const, showInTable: false }
])

// 保存数据
const handleSave = (data: any[]) => {
  // 处理标签字段 - 如果是字符串则转换为数组
  const processedData = data.map(item => ({
    ...item,
    tags: typeof item.tags === 'string' 
      ? item.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : item.tags || []
  }))
  
  promotionStore.promotions.splice(0, promotionStore.promotions.length, ...processedData)
  
  adminStore.addActivity({
    type: 'modify',
    target: 'promotions',
    description: `保存了活动列表数据，共 ${data.length} 条`
  })
}

// 添加活动
const handleAdd = (item: any) => {
  adminStore.addActivity({
    type: 'modify',
    target: 'promotions',
    description: `添加了新活动: ${item.title}`
  })
}

// 更新活动
const handleUpdate = (item: any) => {
  adminStore.addActivity({
    type: 'modify',
    target: 'promotions',
    description: `更新了活动: ${item.title}`
  })
}

// 删除活动
const handleDelete = (item: any) => {
  adminStore.addActivity({
    type: 'modify',
    target: 'promotions',
    description: `删除了活动: ${item.title}`
  })
}

onMounted(async () => {
  await promotionStore.loadPromotions()
})
</script>

<template>
  <AdvancedTableEditor
    title="活动列表"
    :data="promotions"
    :columns="columns"
    row-key="id"
    searchable
    search-placeholder="搜索活动标题、摘要、分类..."
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
