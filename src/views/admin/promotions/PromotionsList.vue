<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePromotionStore } from '@/stores/promotionStore'
import { useAdminStore } from '@/stores/adminStore'
import UnifiedTableEditor from '../components/UnifiedTableEditor.vue'
import { adminApi } from '@/api/contentApi'

const promotionStore = usePromotionStore()
const adminStore = useAdminStore()

// 本地数据（从 Admin API 加载，包含草稿）
const localPromotions = ref<any[]>([])
const loading = ref(false)

// 活动数据
const promotions = computed(() => localPromotions.value)

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
  // 更新本地数据
  localPromotions.value = [...data]
  adminStore.addActivity({
    type: 'modify',
    target: 'promotions',
    description: `保存了活动列表数据，共 ${data.length} 条`
  })
}

// 发布后清除缓存
const handlePublish = () => {
  promotionStore.clearCache()
}

// 从 Admin API 加载数据（包含草稿）
const loadAdminData = async () => {
  loading.value = true
  try {
    // 从 Admin API 加载（优先使用草稿数据）
    const result = await adminApi.getList('promotion', { pageSize: 9999 })
    localPromotions.value = result.data.map(item => item.draftData || item.publishedData)
  } catch (e) {
    console.warn('Admin API 加载失败，降级到前台 Store:', e)
    // 降级到前台 Store
    await promotionStore.loadPromotions()
    localPromotions.value = [...promotionStore.promotions]
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
    title="活动列表"
    :data="promotions"
    :columns="columns"
    row-key="id"
    search-placeholder="搜索活动标题、摘要..."
    :page-size="10"
    :page-sizes="[10, 20, 50]"
    :publish-config="{ enabled: true, contentType: 'promotion' }"
    :before-save="beforeSave"
    @save="handleSave"
    @publish="handlePublish"
  />
</template>
