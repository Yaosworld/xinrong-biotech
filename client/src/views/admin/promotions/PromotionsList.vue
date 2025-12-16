<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePromotionStore } from '@/stores/promotionStore'
import { useAdminStore } from '@/stores/adminStore'
import UnifiedTableEditor from '../components/UnifiedTableEditor.vue'
import { adminApi } from '@/api/contentApi'
import { 
  generatePromotionId, 
  extractPromotionIdNum,
  PROMOTION_PAGINATION_CONFIG 
} from '@/constants/promotions'

const promotionStore = usePromotionStore()
const adminStore = useAdminStore()

// 本地数据（从 Admin API 加载，包含草稿）
const localPromotions = ref<any[]>([])
const loading = ref(false)

// 活动数据
const promotions = computed(() => localPromotions.value)

// 列配置
const columns = computed(() => [
  { key: 'id', label: 'ID', width: 70, editable: false, sortable: true, fixed: 'left' as const },
  { 
    key: 'coverId', 
    label: '封面', 
    width: 70, 
    type: 'promotion-image' as const, 
    imageType: 'cover' as const,
    // 动态获取封面URL
    getValue: (row: any) => row.cover_url || ''
  },
  { 
    key: 'posterId', 
    label: '海报', 
    width: 70, 
    type: 'promotion-image' as const, 
    imageType: 'poster' as const,
    // 动态获取海报URL
    getValue: (row: any) => row.poster_url || ''
  },
  { key: 'title', label: '标题', width: { min: 140, flex: 2 }, required: true },
  { key: 'summary', label: '摘要', width: { min: 120, flex: 3 }, truncate: 30, required: true },
  { key: 'description', label: '详情', width: { min: 120, flex: 4 }, type: 'textarea' as const, truncate: 35 },
  { key: 'publish_date', label: '发布日期', width: 95, type: 'date' as const, sortable: true, required: true, placeholder: '前台展示日期' },
  { key: 'start_date', label: '开始日期', width: 95, type: 'date' as const, sortable: true, required: true },
  { key: 'end_date', label: '结束日期', width: 95, type: 'date' as const, sortable: true, required: true },
  { key: 'tags', label: '标签', width: { min: 100, flex: 1 }, type: 'tags' as const, truncate: 20 }
])

// 生成活动ID - 统一使用字符串格式 "A001"
const generateId = (currentData: any[]) => {
  const allPromotions = [...currentData, ...localPromotions.value, ...promotionStore.promotions]
  const maxIdNum = allPromotions.reduce((max, item) => {
    return Math.max(max, extractPromotionIdNum(item.id))
  }, 0)
  return generatePromotionId(maxIdNum + 1)
}

// 保存前处理 - tags 转换
const beforeSave = (data: any[]) => {
  return data.map(item => ({
    ...item,
    // 确保 ID 是字符串格式
    id: String(item.id),
    // tags 转换为数组
    tags: typeof item.tags === 'string' 
      ? item.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : item.tags || []
  }))
}

// 保存数据
const handleSave = (data: any[]) => {
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
    const result = await adminApi.getList('promotion', { pageSize: 9999 })
    // 过滤空数据并确保 ID 是字符串
    localPromotions.value = result.data
      .map(item => {
        const data = item.draftData || item.publishedData
        if (data) {
          return { ...data, id: String((data as any).id) }
        }
        return null
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  } catch (e) {
    console.warn('Admin API 加载失败，降级到前台 Store:', e)
    await promotionStore.loadPromotions()
    localPromotions.value = promotionStore.promotions.map(p => ({ ...p, id: String(p.id) }))
  } finally {
    loading.value = false
  }
}

// 重新加载数据（版本回滚后调用）
const handleReload = async () => {
  await loadAdminData()
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
    :page-size="PROMOTION_PAGINATION_CONFIG.ADMIN_PAGE_SIZE"
    :page-sizes="PROMOTION_PAGINATION_CONFIG.PAGE_SIZES"
    :publish-config="{ enabled: true, contentType: 'promotion' }"
    :before-save="beforeSave"
    :generate-id="generateId"
    @save="handleSave"
    @publish="handlePublish"
    @reload="handleReload"
  />
</template>
