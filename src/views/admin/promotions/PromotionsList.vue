<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePromotionStore } from '@/stores/promotionStore'
import { useAdminStore } from '@/stores/adminStore'
import UnifiedTableEditor from '../components/UnifiedTableEditor.vue'

const promotionStore = usePromotionStore()
const adminStore = useAdminStore()

// 活动数据
const promotions = computed(() => promotionStore.promotions)

// 列配置
// 注意：sortable 列会自动增加24px给排序箭头
const columns = computed(() => [
  { key: 'id', label: 'ID', width: 60, editable: false, sortable: true, fixed: 'left' as const },
  { key: 'cover_url', label: '封面', width: 65, type: 'image' as const, imageStyle: 'contain' as const },
  { key: 'poster_url', label: '海报', width: 65, type: 'image' as const, imageStyle: 'contain' as const },
  { key: 'title', label: '标题', width: { min: 140, flex: 2 }, required: true },
  { key: 'summary', label: '摘要', width: { min: 120, flex: 3 }, truncate: 30 },
  { key: 'description', label: '详情', width: { min: 120, flex: 4 }, type: 'textarea' as const, truncate: 35 },
  { key: 'start_date', label: '开始日期', width: 95, type: 'date' as const, sortable: true },
  { key: 'end_date', label: '结束日期', width: 95, type: 'date' as const, sortable: true },
  { key: 'tags', label: '标签', width: { min: 100, flex: 1 }, type: 'tags' as const, truncate: 20 },
  { key: 'icon_class', label: '图标类名', showInTable: false, required: false },
  { key: 'publish_date', label: '发布日期', type: 'date' as const, showInTable: false }
])

// 保存前处理 - tags 转换
const beforeSave = (data: any[]) => {
  return data.map(item => ({
    ...item,
    tags: typeof item.tags === 'string' 
      ? item.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : item.tags || []
  }))
}

// 保存数据
const handleSave = (data: any[]) => {
  promotionStore.promotions.splice(0, promotionStore.promotions.length, ...data)
  adminStore.addActivity({
    type: 'modify',
    target: 'promotions',
    description: `保存了活动列表数据，共 ${data.length} 条`
  })
}

onMounted(async () => {
  await promotionStore.loadPromotions()
})
</script>

<template>
  <UnifiedTableEditor
    title="活动列表"
    :data="promotions"
    :columns="columns"
    row-key="id"
    search-placeholder="搜索活动标题、摘要..."
    :page-size="10"
    :page-sizes="[10, 20, 50]"
    :before-save="beforeSave"
    @save="handleSave"
  />
</template>
