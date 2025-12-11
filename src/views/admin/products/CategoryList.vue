<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAdminStore } from '@/stores/adminStore'
import UnifiedTableEditor from '../components/UnifiedTableEditor.vue'
import { adminApi } from '@/api/contentApi'

const categoryStore = useCategoryStore()
const adminStore = useAdminStore()

// 本地数据（从 Admin API 加载，包含草稿）
const localCategories = ref<any[]>([])
const loading = ref(false)

// 分类数据 - 添加图片完整路径
const categories = computed(() => 
  localCategories.value.map(c => ({
    ...c,
    imageUrl: c.imageName ? `/images/products/${c.imageName}` : '/images/common/placeholder.png'
  }))
)

// 列配置
const columns = computed(() => [
  { key: 'id', label: 'ID', width: 80, editable: false, sortable: true, fixed: 'left' as const },
  { 
    key: 'imageUrl', 
    label: '分类图片', 
    width: 100, 
    type: 'image' as const, 
    editable: false, 
    imageStyle: 'contain' as const, 
    showInForm: false 
  },
  { 
    key: 'imageName', 
    label: '图片文件名', 
    width: 180, 
    showInTable: false,
    placeholder: '如: lab-instruments.png'
  },
  { key: 'name', label: '分类名称', width: { min: 120, flex: 1 }, required: true },
  { key: 'description', label: '描述', width: { min: 200, flex: 2 }, type: 'textarea' as const, truncate: 50 },
  { key: 'productCount', label: '产品数量', width: 100, editable: false, showInForm: false }
])

// 生成分类ID
const generateCategoryId = () => {
  const allCategories = localCategories.value
  const maxIdNum = allCategories.reduce((max, item) => {
    const idStr = item.id?.replace(/^C/, '') || '0'
    const num = parseInt(idStr, 10)
    return isNaN(num) ? max : Math.max(max, num)
  }, 0)
  return `C${(maxIdNum + 1).toString().padStart(2, '0')}`
}

// 保存前处理 - 移除 imageUrl 和 productCount
const beforeSave = (data: any[]) => {
  return data.map(({ imageUrl, productCount, ...rest }) => rest)
}

// 保存数据
const handleSave = (data: any[]) => {
  localCategories.value = [...data]
  adminStore.addActivity({
    type: 'modify',
    target: 'categories',
    description: `保存了分类列表数据，共 ${data.length} 条`
  })
}

// 发布后清除缓存
const handlePublish = () => {
  categoryStore.clearCache()
}

// 重新加载数据（版本回滚后调用）
const handleReload = async () => {
  await loadAdminData()
}

// 从 Admin API 加载数据（包含草稿和产品数量）
const loadAdminData = async () => {
  loading.value = true
  try {
    // 获取分类及产品数量
    const token = localStorage.getItem('admin_token') || ''
    const res = await fetch('/api/admin/category/with-count', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (!res.ok) throw new Error('获取分类数据失败')
    
    const result = await res.json()
    localCategories.value = result.data || []
  } catch (e) {
    console.warn('Admin API 加载失败，降级到前台 Store:', e)
    // 降级到前台 Store
    await categoryStore.loadCategories()
    localCategories.value = categoryStore.categories.map(c => ({ ...c, productCount: 0 }))
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
    title="分类管理"
    :data="categories"
    :columns="columns"
    row-key="id"
    search-placeholder="搜索分类名称、描述..."
    :page-size="10"
    :page-sizes="[10, 20, 50]"
    :publish-config="{ enabled: true, contentType: 'category' }"
    :before-save="beforeSave"
    :generate-id="generateCategoryId"
    :exportable="false"
    :import-config="{ enabled: false }"
    @save="handleSave"
    @publish="handlePublish"
    @reload="handleReload"
  />
</template>
