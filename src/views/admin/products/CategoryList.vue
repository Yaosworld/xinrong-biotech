<script setup lang="ts">
/**
 * 分类管理页面
 * 使用 UnifiedTableEditor 组件，与其他管理页面保持一致的外观
 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAdminStore } from '@/stores/adminStore'
import UnifiedTableEditor from '../components/UnifiedTableEditor.vue'

interface Category {
  id: string
  name: string
  imageId: number | null
  description: string
  imageUrl: string
  imageName: string
  productCount: number
  _usedImagesMap?: Map<number, string>
}

const categoryStore = useCategoryStore()
const adminStore = useAdminStore()

// ========================================
// State
// ========================================
const categories = ref<Category[]>([])
const loading = ref(false)

// ========================================
// API Methods
// ========================================
const getToken = () => localStorage.getItem('admin_token') || ''

const loadCategories = async () => {
  loading.value = true
  try {
    const res = await fetch('/api/admin/category/with-count', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    if (!res.ok) throw new Error('加载失败')
    const result = await res.json()
    
    // 构建已使用图片映射
    const usedImagesMap = new Map<number, string>()
    result.data?.forEach((cat: Category) => {
      if (cat.imageId) {
        usedImagesMap.set(cat.imageId, cat.id)
      }
    })
    
    // 为每条数据添加 _usedImagesMap
    categories.value = (result.data || []).map((cat: Category) => ({
      ...cat,
      _usedImagesMap: usedImagesMap
    }))
  } catch (e) {
    ElMessage.error('加载分类数据失败')
  } finally {
    loading.value = false
  }
}

// 保存所有分类
const handleSave = async (data: Category[]) => {
  try {
    const dataToSave = data.map(({ id, name, imageId, description }) => ({
      id, name, imageId, description
    }))
    
    const res = await fetch('/api/admin/category/save-all', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ categories: dataToSave })
    })
    
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || '保存失败')
    }
    
    categoryStore.clearCache()
    ElMessage.success('保存成功')
    adminStore.addActivity({
      type: 'modify',
      target: 'categories',
      description: `保存了分类数据，共 ${data.length} 条`
    })
    
    // 重新加载以获取最新数据
    await loadCategories()
  } catch (e) {
    ElMessage.error('保存失败: ' + (e as Error).message)
    throw e
  }
}

// ========================================
// 列配置
// ========================================
const columns = computed(() => [
  { key: 'id', label: 'ID', width: 80, editable: false, fixed: 'left' as const },
  { 
    key: 'imageId', 
    label: '图片', 
    width: 100, 
    type: 'category-image' as const,
    required: true
  },
  { key: 'name', label: '分类名称', width: { min: 120, flex: 1 }, required: true },
  { key: 'description', label: '描述', width: { min: 200, flex: 2 }, type: 'textarea' as const, truncate: 50 },
  { key: 'productCount', label: '产品数量', width: 100, editable: false, showInForm: false }
])

// 生成新ID
const generateId = () => {
  const maxNum = categories.value.reduce((max, c) => {
    const num = parseInt(c.id.replace(/^C/, ''), 10)
    return isNaN(num) ? max : Math.max(max, num)
  }, 0)
  return `C${(maxNum + 1).toString().padStart(2, '0')}`
}

// 保存前处理
const beforeSave = (data: Category[]) => {
  // 移除临时字段
  return data.map(({ _usedImagesMap, ...rest }) => rest)
}

// 构建已使用图片映射（基于当前数据）
const buildUsedImagesMap = (allData: Category[], excludeId?: string): Map<number, string> => {
  const map = new Map<number, string>()
  allData.forEach(cat => {
    if (cat.imageId && cat.id !== excludeId) {
      map.set(cat.imageId, cat.id)
    }
  })
  return map
}

// 新增前处理
const beforeAdd = (item: any, allData?: Category[]) => {
  const data = allData || categories.value
  return {
    ...item,
    productCount: 0,
    _usedImagesMap: buildUsedImagesMap(data)
  }
}

// 编辑前处理（动态更新 _usedImagesMap）
const beforeEdit = (item: Category, allData: Category[]) => {
  return {
    ...item,
    _usedImagesMap: buildUsedImagesMap(allData, item.id)
  }
}

// 删除前验证（实时检查产品数量）
const beforeDelete = async (row: Category) => {
  // 实时从服务器检查该分类下的产品数量
  try {
    const res = await fetch(`/api/admin/category/${row.id}/can-delete`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    if (!res.ok) {
      ElMessage.error('检查分类状态失败')
      return false
    }
    const result = await res.json()
    if (!result.canDelete) {
      ElMessage.warning(`该分类下有 ${result.productCount} 个产品，无法删除`)
      return false
    }
    return true
  } catch (e) {
    // 降级到本地数据检查
    if (row.productCount > 0) {
      ElMessage.warning(`该分类下有 ${row.productCount} 个产品，无法删除`)
      return false
    }
    return true
  }
}

// 重置为默认
const resetToDefault = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重置为默认分类吗？这将删除所有现有分类。',
      '警告',
      { type: 'warning' }
    )
    
    const res = await fetch('/api/admin/category/reset-default', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    
    if (!res.ok) throw new Error('重置失败')
    
    categoryStore.clearCache()
    ElMessage.success('已重置为默认分类')
    await loadCategories()
  } catch (e) {
    if ((e as any).toString().includes('cancel')) return
    ElMessage.error('重置失败')
  }
}

// ========================================
// Lifecycle
// ========================================
onMounted(async () => {
  await loadCategories()
})
</script>

<template>
  <div class="category-page">
    <UnifiedTableEditor
      title="分类管理"
      :data="categories"
      :columns="columns"
      row-key="id"
      search-placeholder="搜索分类名称、描述..."
      :page-size="10"
      :page-sizes="[10, 20, 50]"
      :searchable="true"
      :addable="true"
      :editable="true"
      :deletable="true"
      :exportable="false"
      :before-save="beforeSave"
      :before-add="beforeAdd"
      :before-edit="beforeEdit"
      :before-delete="beforeDelete"
      :generate-id="generateId"
      @save="handleSave"
    >
      <!-- 自定义工具栏按钮 -->
      <template #toolbar-extra>
        <el-button @click="resetToDefault">
          <i class="fas fa-undo mr-1"></i> 重置默认
        </el-button>
      </template>
    </UnifiedTableEditor>
  </div>
</template>

<style scoped>
.category-page {
  height: 100%;
}

.mr-1 {
  margin-right: 4px;
}
</style>
