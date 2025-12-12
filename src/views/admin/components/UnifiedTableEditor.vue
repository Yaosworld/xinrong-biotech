<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAdminStore } from '@/stores/adminStore'
import { adminApi } from '@/api/contentApi'
import { uploadApi, type UploadCategory } from '@/api/uploadApi'
import VersionHistoryDialog from './VersionHistoryDialog.vue'
import PublishDialog from './PublishDialog.vue'
import DuplicateReportDialog from './DuplicateReportDialog.vue'
import ImageUploader from '@/components/admin/ImageUploader.vue'
import CategoryImagePicker from '@/components/admin/CategoryImagePicker.vue'
import { ExcelExporter, type ExportColumn, type ExportMode } from '@/utils/excelExporter'
import { DuplicateDetector, type DuplicateCheckResult } from '@/utils/duplicateDetector'

// ========================================
// 类型定义
// ========================================

// 列宽度类型：固定像素 | 弹性比例 | 自动计算
type ColumnWidth = 
  | number                          // 固定像素
  | { flex: number }                // 弹性比例（占剩余空间的比例）
  | { min: number; flex?: number }  // 最小宽度 + 可选弹性

interface ColumnConfig {
  key: string
  label: string
  width?: ColumnWidth
  sortable?: boolean
  editable?: boolean
  fixed?: 'left' | 'right'
  type?: 'text' | 'number' | 'select' | 'date' | 'boolean' | 'image' | 'textarea' | 'tags' | 'category-image'
  options?: { label: string; value: string | number | boolean }[]
  truncate?: number
  showInTable?: boolean
  showInForm?: boolean
  required?: boolean
  imageStyle?: 'cover' | 'contain'
  placeholder?: string
  uploadCategory?: UploadCategory  // 图片上传分类
}

interface CategoryConfig {
  key: string
  label: string
  filter: (item: any) => boolean
}

interface SortConfig {
  enabled: boolean
  field: string  // 排序字段名
}

interface ImportConfig {
  enabled: boolean
  accept?: string
  multiple?: boolean  // 是否支持多文件导入
  handler?: (file: File) => Promise<any[]>
}

interface PublishConfig {
  enabled: boolean
  contentType: string  // API 内容类型，如 'products', 'brands'
  getContentKey?: (item: any) => string  // 获取内容 key 的函数
}

// ========================================
// Props
// ========================================

const props = withDefaults(defineProps<{
  title: string
  data: any[]
  columns: ColumnConfig[]
  rowKey?: string
  // 功能开关
  searchable?: boolean
  searchPlaceholder?: string
  addable?: boolean
  editable?: boolean
  deletable?: boolean
  exportable?: boolean
  // 分页
  paginated?: boolean
  pageSize?: number
  pageSizes?: number[]
  // 分类切换
  categories?: CategoryConfig[]
  defaultCategory?: string
  // 排序功能
  sortConfig?: SortConfig
  // Excel导入
  importConfig?: ImportConfig
  // 发布配置
  publishConfig?: PublishConfig
  // 数据处理钩子
  beforeSave?: (data: any[]) => any[]
  beforeAdd?: (item: any, allData?: any[]) => any  // 新增前处理
  beforeEdit?: (item: any, allData: any[]) => any  // 编辑前处理，可用于动态更新数据
  beforeDelete?: (item: any) => boolean | Promise<boolean>  // 删除前验证，返回 false 阻止删除
  generateId?: () => string | number
}>(), {
  rowKey: 'id',
  searchable: true,
  addable: true,
  editable: true,
  deletable: true,
  exportable: true,
  paginated: true,
  pageSize: 10,
  pageSizes: () => [10, 20, 50, 100]
})

// ========================================
// Emits
// ========================================

const emit = defineEmits<{
  save: [data: any[]]
  add: [item: any]
  update: [item: any]
  delete: [item: any]
  import: [data: any[]]
  publish: [data: any[]]
  reload: []
}>()

const adminStore = useAdminStore()


// ========================================
// State
// ========================================

const localData = ref<any[]>([])
const searchQuery = ref('')
const currentPage = ref(1)
const currentPageSize = ref(props.pageSize)
const currentCategory = ref(props.defaultCategory || props.categories?.[0]?.key || '')
const selectedRows = ref<any[]>([])
const isAllSelected = ref(false)  // 是否选择了所有数据（跨页）
const tableRef = ref<any>(null)

// 编辑面板
const editPanelVisible = ref(false)
const editingItem = ref<any>(null)
const editFormData = ref<any>({})
const isAddMode = ref(false)

// 图片预览
const previewVisible = ref(false)
const previewUrl = ref('')

// 文件上传
const fileInputRef = ref<HTMLInputElement | null>(null)

// ==================== 状态管理 ====================
type EditStatus = 'clean' | 'dirty' | 'saving' | 'publishing'
const editStatus = ref<EditStatus>('clean')

type ContentStatus = 'draft' | 'published' | 'unpublished'
const contentStatus = ref<ContentStatus>('unpublished')

// 版本历史
const showVersionHistory = ref(false)
const currentVersion = ref(1)

// 发布对话框
const showPublishDialog = ref(false)

// 已删除的数据 keys（用于保存时同步删除到后端）
const deletedKeys = ref<string[]>([])
const publishSummary = ref('')

// 保存进度（用于大数据量分批保存）
const saveProgress = ref({ saved: 0, total: 0, show: false })

// 原始数据快照（用于变更检测）
const originalDataString = ref<string>('')

// 当前数据字符串
const currentDataString = computed(() => JSON.stringify(localData.value))

// 是否有未保存的更改
const hasUnsavedChanges = computed(() => 
  originalDataString.value !== '' && currentDataString.value !== originalDataString.value
)

// 是否正在操作中
const isOperating = computed(() => 
  editStatus.value === 'saving' || editStatus.value === 'publishing'
)

// 监听数据变化，自动更新编辑状态
watch(currentDataString, () => {
  if (!isOperating.value) {
    editStatus.value = hasUnsavedChanges.value ? 'dirty' : 'clean'
  }
})

// 状态标签配置
const statusConfig = computed(() => {
  if (editStatus.value === 'dirty') {
    return { type: 'danger' as const, icon: 'fas fa-pen', text: '编辑中 · 未保存', pulse: true }
  }
  if (editStatus.value === 'saving') {
    return { type: 'warning' as const, icon: 'fas fa-spinner fa-spin', text: '保存中...', pulse: false }
  }
  if (editStatus.value === 'publishing') {
    return { type: 'warning' as const, icon: 'fas fa-spinner fa-spin', text: '发布中...', pulse: false }
  }
  if (contentStatus.value === 'draft') {
    return { type: 'warning' as const, icon: 'fas fa-file-alt', text: '草稿 · 待发布', pulse: false }
  }
  if (contentStatus.value === 'published') {
    return { type: 'success' as const, icon: 'fas fa-check-circle', text: '已发布', pulse: false }
  }
  return { type: 'info' as const, icon: 'fas fa-file', text: '未发布', pulse: false }
})

// ========================================
// 计算属性
// ========================================

// 表格中显示的列
const tableColumns = computed(() => 
  props.columns.filter(col => col.showInTable !== false)
)

// 表单中显示的列
const formColumns = computed(() =>
  props.columns.filter(col => col.showInForm !== false)
)

// 计算列宽度
// 固定宽度列：直接返回宽度值（可排序列需要额外空间给排序箭头）
// 弹性宽度列：返回 undefined，让表格自动分配
const getColumnWidth = (col: ColumnConfig): number | undefined => {
  if (!col.width) return undefined
  if (typeof col.width === 'number') {
    // 可排序列需要额外24px给排序箭头
    return col.sortable ? col.width + 24 : col.width
  }
  // 弹性宽度列不设置固定宽度
  return undefined
}

// 获取最小宽度（用于弹性列）
const getColumnMinWidth = (col: ColumnConfig): number | undefined => {
  if (!col.width) return 100
  if (typeof col.width === 'number') {
    // 固定宽度列不需要 minWidth
    return undefined
  }
  if ('min' in col.width) return col.width.min
  if ('flex' in col.width) return 80
  return 100
}



// 搜索框宽度（根据 placeholder 长度动态计算）
const searchInputWidth = computed(() => {
  const placeholder = props.searchPlaceholder || '搜索...'
  // 中文字符约 14px，英文/数字约 8px，加上图标和 padding
  const chineseCount = (placeholder.match(/[\u4e00-\u9fa5]/g) || []).length
  const otherCount = placeholder.length - chineseCount
  const textWidth = chineseCount * 14 + otherCount * 8
  // 最小 160px，最大 400px，加上图标(20px) + padding(24px) + clearable按钮(20px)
  return Math.min(400, Math.max(160, textWidth + 64))
})

// 按分类和排序过滤数据
const categoryFilteredData = computed(() => {
  let result = [...localData.value]
  
  // 分类过滤
  if (props.categories && currentCategory.value) {
    const category = props.categories.find(c => c.key === currentCategory.value)
    if (category) {
      result = result.filter(category.filter)
    }
  }
  
  // 排序
  if (props.sortConfig?.enabled && props.sortConfig.field) {
    result.sort((a, b) => (a[props.sortConfig!.field] || 999) - (b[props.sortConfig!.field] || 999))
  }
  
  return result
})

// 搜索过滤
const filteredData = computed(() => {
  if (!searchQuery.value.trim()) return categoryFilteredData.value
  
  const query = searchQuery.value.toLowerCase()
  return categoryFilteredData.value.filter(item => {
    return props.columns.some(col => {
      const value = item[col.key]
      if (value == null) return false
      if (Array.isArray(value)) return value.some(v => String(v).toLowerCase().includes(query))
      return String(value).toLowerCase().includes(query)
    })
  })
})

// 分页数据
const paginatedData = computed(() => {
  if (!props.paginated) return filteredData.value
  const start = (currentPage.value - 1) * currentPageSize.value
  return filteredData.value.slice(start, start + currentPageSize.value)
})

const total = computed(() => filteredData.value.length)

// 各分类数量
const categoryCounts = computed(() => {
  if (!props.categories) return {}
  const counts: Record<string, number> = {}
  props.categories.forEach(cat => {
    counts[cat.key] = localData.value.filter(cat.filter).length
  })
  return counts
})


// ========================================
// 方法
// ========================================

const initLocalData = () => {
  localData.value = JSON.parse(JSON.stringify(props.data))
  // 保存原始数据快照
  originalDataString.value = JSON.stringify(localData.value)
  editStatus.value = 'clean'
  // 清空已删除记录
  deletedKeys.value = []
}

// 图片处理
const getImageUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return url.startsWith('/') ? url : `/${url}`
}

// 从 URL 中提取文件名
const getFilenameFromUrl = (url: string) => {
  return uploadApi.getFilenameFromUrl(url)
}

const handlePreviewImage = (url: string) => {
  previewUrl.value = getImageUrl(url)
  previewVisible.value = true
}

// 图片加载失败时的处理
const handleImageError = (e: Event, row: any, col: ColumnConfig) => {
  const img = e.target as HTMLImageElement
  // 如果列配置了 imageFallback，使用它
  if ((col as any).imageFallback) {
    const fallbackUrl = typeof (col as any).imageFallback === 'function' 
      ? (col as any).imageFallback(row) 
      : (col as any).imageFallback
    if (fallbackUrl && img.src !== fallbackUrl) {
      img.src = fallbackUrl
      return
    }
  }
  // 默认 fallback
  img.src = '/images/common/placeholder.png'
}

// 文本截断
const truncateText = (text: string | any[], length: number) => {
  if (Array.isArray(text)) text = text.join(', ')
  if (!text || text.length <= length) return text
  return text.substring(0, length) + '...'
}

// 格式化显示值
const formatDisplayValue = (value: any, col: ColumnConfig) => {
  if (value == null) return ''
  if (col.type === 'tags' && Array.isArray(value)) return value.join(', ')
  if (col.type === 'select' && col.options) {
    const opt = col.options.find(o => o.value === value)
    return opt?.label || value
  }
  return value
}

// ========================================
// 排序功能
// ========================================

const canMoveUp = (index: number) => index > 0
const canMoveDown = (index: number) => index < paginatedData.value.length - 1

const moveItem = (item: any, direction: 'up' | 'down') => {
  if (!props.sortConfig?.enabled) return
  
  const list = categoryFilteredData.value
  const index = list.findIndex(i => i[props.rowKey] === item[props.rowKey])
  if (index === -1) return
  
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= list.length) return
  
  const field = props.sortConfig.field
  const targetItem = list[targetIndex]
  const temp = item[field]
  item[field] = targetItem[field]
  targetItem[field] = temp
  
  ElMessage.success(direction === 'up' ? '上移成功' : '下移成功')
}

// 重新计算排序值
const recalculateSortOrder = () => {
  if (!props.sortConfig?.enabled) return
  
  const field = props.sortConfig.field
  
  if (props.categories) {
    // 分类独立排序
    props.categories.forEach(cat => {
      const items = localData.value
        .filter(cat.filter)
        .sort((a, b) => (a[field] || 999) - (b[field] || 999))
      items.forEach((item, index) => {
        item[field] = index + 1
      })
    })
  } else {
    // 全局排序
    const items = [...localData.value].sort((a, b) => (a[field] || 999) - (b[field] || 999))
    items.forEach((item, index) => {
      item[field] = index + 1
    })
  }
}


// ========================================
// CRUD 操作
// ========================================

const openAddPanel = () => {
  isAddMode.value = true
  editingItem.value = null
  editFormData.value = {}
  
  // 初始化默认值
  props.columns.forEach(col => {
    if (col.type === 'boolean') editFormData.value[col.key] = false
    else if (col.type === 'number') editFormData.value[col.key] = 0
    else if (col.type === 'tags') editFormData.value[col.key] = []
    else editFormData.value[col.key] = ''
  })
  
  // 从现有数据中获取 _usedImagesMap（用于图片选择器显示已使用状态）
  if (localData.value.length > 0 && localData.value[0]._usedImagesMap) {
    editFormData.value._usedImagesMap = localData.value[0]._usedImagesMap
  }
  
  // 生成ID
  if (props.generateId) {
    editFormData.value[props.rowKey] = props.generateId()
  } else {
    const maxId = localData.value.reduce((max, item) => {
      const id = typeof item[props.rowKey] === 'number' ? item[props.rowKey] : 0
      return Math.max(max, id)
    }, 0)
    editFormData.value[props.rowKey] = maxId + 1
  }
  
  // 如果有分类，设置当前分类的默认值
  if (props.categories && currentCategory.value) {
    const cat = props.categories.find(c => c.key === currentCategory.value)
    if (cat?.key === 'own') editFormData.value.is_own_brand = true
    else if (cat?.key === 'agent') editFormData.value.is_own_brand = false
  }
  
  // 如果有排序，设置排序值
  if (props.sortConfig?.enabled) {
    const field = props.sortConfig.field
    const maxOrder = categoryFilteredData.value.reduce((max, item) => 
      Math.max(max, item[field] || 0), 0)
    editFormData.value[field] = maxOrder + 1
  }
  
  // 调用 beforeAdd 钩子
  if (props.beforeAdd) {
    editFormData.value = props.beforeAdd(editFormData.value, localData.value)
  }
  
  editPanelVisible.value = true
}

const openEditPanel = (row: any) => {
  isAddMode.value = false
  editingItem.value = row
  
  // 调用 beforeEdit 钩子（可用于动态更新数据，如 _usedImagesMap）
  let processedRow = { ...row }
  if (props.beforeEdit) {
    processedRow = props.beforeEdit(processedRow, localData.value)
  }
  
  editFormData.value = processedRow
  // 处理 tags 类型
  props.columns.forEach(col => {
    if (col.type === 'tags' && Array.isArray(editFormData.value[col.key])) {
      editFormData.value[col.key] = editFormData.value[col.key].join(', ')
    }
  })
  editPanelVisible.value = true
}

const closeEditPanel = () => {
  editPanelVisible.value = false
  editingItem.value = null
  editFormData.value = {}
}

// 处理分类图片变更，同步更新 imageUrl 和 imageName
const handleCategoryImageChange = (imageInfo: { id: number | null; url: string; filename: string } | null) => {
  if (imageInfo) {
    editFormData.value.imageUrl = imageInfo.url
    editFormData.value.imageName = imageInfo.filename
  } else {
    editFormData.value.imageUrl = ''
    editFormData.value.imageName = ''
  }
}

const saveEditForm = () => {
  // 验证必填字段
  const requiredCols = props.columns.filter(col => col.required && col.editable !== false)
  for (const col of requiredCols) {
    if (col.type !== 'boolean' && !editFormData.value[col.key]) {
      ElMessage.warning(`请填写 ${col.label}`)
      return
    }
  }
  
  // 处理 tags 类型
  const processedData = { ...editFormData.value }
  props.columns.forEach(col => {
    if (col.type === 'tags' && typeof processedData[col.key] === 'string') {
      processedData[col.key] = processedData[col.key]
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean)
    }
  })
  
  if (isAddMode.value) {
    // 检测新增数据是否与现有数据重复
    const compareFields = props.columns
      .filter(col => col.editable !== false && col.showInForm !== false)
      .map(col => col.key)
    
    const { isDuplicate, duplicateItem } = DuplicateDetector.checkSingle(
      processedData,
      localData.value,
      props.rowKey,
      compareFields
    )
    
    if (isDuplicate) {
      const previewFields = props.columns.slice(0, 3)
      const preview = previewFields
        .map(col => duplicateItem?.[col.key])
        .filter(Boolean)
        .join(' / ')
      ElMessage.warning(`数据重复！已存在相同内容的条目：${preview}`)
      return
    }
    
    localData.value.push(processedData)
    emit('add', processedData)
    ElMessage.success(props.publishConfig?.enabled ? '添加成功，请点击"保存草稿"保存到服务器' : '添加成功')
  } else {
    const index = localData.value.findIndex(item => item[props.rowKey] === editingItem.value[props.rowKey])
    if (index > -1) {
      // 检测编辑后的数据是否与其他数据重复（排除自身）
      const compareFields = props.columns
        .filter(col => col.editable !== false && col.showInForm !== false)
        .map(col => col.key)
      
      const { isDuplicate, duplicateItem } = DuplicateDetector.checkSingle(
        processedData,
        localData.value,
        props.rowKey,
        compareFields,
        index // 排除当前编辑项
      )
      
      if (isDuplicate) {
        const previewFields = props.columns.slice(0, 3)
        const preview = previewFields
          .map(col => duplicateItem?.[col.key])
          .filter(Boolean)
          .join(' / ')
        ElMessage.warning(`数据重复！已存在相同内容的条目：${preview}`)
        return
      }
      
      // 处理分类变更时的排序
      if (props.sortConfig?.enabled && props.categories) {
        const oldItem = localData.value[index]
        const categoryChanged = props.categories.some(cat => {
          const wasInCat = cat.filter(oldItem)
          const nowInCat = cat.filter(processedData)
          return wasInCat !== nowInCat
        })
        if (categoryChanged) {
          // 移到新分类末尾
          const newCat = props.categories.find(cat => cat.filter(processedData))
          if (newCat) {
            const maxOrder = localData.value
              .filter(newCat.filter)
              .reduce((max, item) => Math.max(max, item[props.sortConfig!.field] || 0), 0)
            processedData[props.sortConfig.field] = maxOrder + 1
          }
        }
      }
      localData.value[index] = processedData
      emit('update', processedData)
      ElMessage.success(props.publishConfig?.enabled ? '修改成功，请点击"保存草稿"保存到服务器' : '修改成功，请点击"保存全部"保存更改')
    }
  }
  
  closeEditPanel()
}

const deleteItem = async (row: any) => {
  try {
    // 调用 beforeDelete 钩子验证
    if (props.beforeDelete) {
      const canDelete = await props.beforeDelete(row)
      if (!canDelete) return
    }
    
    await ElMessageBox.confirm('确定要删除这条数据吗？', '提示', { type: 'warning' })
    const index = localData.value.findIndex(item => item[props.rowKey] === row[props.rowKey])
    if (index > -1) {
      const key = String(row[props.rowKey])
      localData.value.splice(index, 1)
      // 记录已删除的 key，保存时同步到后端
      if (props.publishConfig?.enabled) {
        deletedKeys.value.push(key)
      }
      emit('delete', row)
      ElMessage.success(props.publishConfig?.enabled ? '删除成功，请点击"保存草稿"同步到服务器' : '删除成功')
    }
  } catch { /* 用户取消 */ }
}

const batchDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }
  const deleteCount = selectedRows.value.length
  const confirmMsg = isAllSelected.value 
    ? `确定要删除全部 ${deleteCount} 条数据吗？此操作不可恢复！`
    : `确定要删除选中的 ${deleteCount} 条数据吗？`
  
  try {
    await ElMessageBox.confirm(confirmMsg, '提示', { type: 'warning' })
    const keys = selectedRows.value.map(row => String(row[props.rowKey]))
    localData.value = localData.value.filter(item => !keys.includes(String(item[props.rowKey])))
    // 记录已删除的 keys
    if (props.publishConfig?.enabled) {
      deletedKeys.value.push(...keys)
    }
    // 重置选择状态
    isAllSelected.value = false
    selectedRows.value = []
    tableRef.value?.clearSelection()
    ElMessage.success(props.publishConfig?.enabled ? '批量删除成功，请点击"保存草稿"同步到服务器' : '批量删除成功')
  } catch { /* 用户取消 */ }
}

// 全选对话框状态
const showSelectAllDialog = ref(false)
const pendingSelectAll = ref(false)

const handleSelectionChange = (rows: any[]) => {
  // 检测是否是点击表头全选（从0变为当前页全部）
  const wasEmpty = selectedRows.value.length === 0
  const isNowFullPage = rows.length === paginatedData.value.length && rows.length > 0
  const hasMorePages = props.paginated && filteredData.value.length > currentPageSize.value
  
  // 如果是点击全选且有多页数据，弹出选择对话框
  if (wasEmpty && isNowFullPage && hasMorePages && !isAllSelected.value) {
    pendingSelectAll.value = true
    showSelectAllDialog.value = true
    // 先临时设置为当前页选中
    selectedRows.value = rows
    return
  }
  
  selectedRows.value = rows
  // 如果取消了部分选择，重置全选状态
  if (isAllSelected.value && rows.length < paginatedData.value.length) {
    isAllSelected.value = false
  }
}

// 选择当前页
const selectCurrentPage = () => {
  showSelectAllDialog.value = false
  pendingSelectAll.value = false
  // 已经选中当前页了，不需要额外操作
}

// 选择所有数据（跨页）
const selectAllData = () => {
  showSelectAllDialog.value = false
  pendingSelectAll.value = false
  isAllSelected.value = true
  selectedRows.value = [...filteredData.value]
}

// 取消全选
const clearSelection = () => {
  isAllSelected.value = false
  selectedRows.value = []
  tableRef.value?.clearSelection()
}

// 关闭对话框时的处理
const handleSelectDialogClose = () => {
  if (pendingSelectAll.value) {
    // 用户关闭对话框，默认保持当前页选中
    pendingSelectAll.value = false
  }
}


// ========================================
// 保存和导出
// ========================================

const saveAll = async () => {
  // 重新计算排序值
  recalculateSortOrder()
  
  // 调用 beforeSave 钩子
  let dataToSave = [...localData.value]
  if (props.beforeSave) {
    dataToSave = props.beforeSave(dataToSave)
  }
  
  // 如果启用了发布功能，保存到后端草稿
  if (props.publishConfig?.enabled) {
    try {
      editStatus.value = 'saving'
      const contentType = props.publishConfig.contentType
      const getKey = props.publishConfig.getContentKey || ((item: any) => item[props.rowKey])
      
      // 先批量删除已删除的数据
      if (deletedKeys.value.length > 0) {
        console.log(`[saveAll] 准备删除 ${deletedKeys.value.length} 条数据:`, deletedKeys.value.slice(0, 10))
        try {
          await adminApi.batchDelete(contentType, deletedKeys.value)
        } catch (e) {
          console.warn('批量删除失败:', e)
        }
        deletedKeys.value = []
      }
      
      // 批量保存草稿（大数据量时显示进度）
      const items = dataToSave.map(item => ({
        key: String(getKey(item)),
        data: item
      }))
      
      // 超过 500 条时显示进度
      if (items.length > 500) {
        saveProgress.value = { saved: 0, total: items.length, show: true }
      }
      
      await adminApi.batchSaveDraft(contentType, items, {
        batchSize: 500,
        onProgress: (saved, total) => {
          saveProgress.value.saved = saved
          saveProgress.value.total = total
        }
      })
      
      saveProgress.value.show = false
      
      // 更新状态
      originalDataString.value = currentDataString.value
      contentStatus.value = 'draft'
      editStatus.value = 'clean'
      
      emit('save', dataToSave)
      adminStore.addActivity({
        type: 'modify',
        target: props.title,
        description: `保存了 ${props.title} 的数据更改，共 ${dataToSave.length} 条`
      })
      ElMessage.success('草稿已保存')
    } catch (error) {
      editStatus.value = hasUnsavedChanges.value ? 'dirty' : 'clean'
      console.error('保存草稿失败:', error)
      ElMessage.error('保存草稿失败')
      return
    }
  } else {
    // 未启用发布功能时，直接触发 save 事件，由父组件处理保存逻辑
    // 父组件需要自己处理成功/失败的提示和状态更新
    emit('save', dataToSave)
    // 更新原始数据快照，使 hasUnsavedChanges 变为 false
    originalDataString.value = currentDataString.value
    editStatus.value = 'clean'
  }
}

// 打开发布对话框
const openPublishDialog = async () => {
  if (!props.publishConfig?.enabled) return
  
  if (hasUnsavedChanges.value) {
    try {
      await ElMessageBox.confirm(
        '您有未保存的更改，发布前需要先保存。是否继续？',
        '提示',
        { confirmButtonText: '保存并发布', cancelButtonText: '取消', type: 'warning' }
      )
    } catch { return }
  }
  publishSummary.value = ''
  showPublishDialog.value = true
}

// 发布数据
const publishAll = async () => {
  if (!props.publishConfig?.enabled) return
  
  try {
    editStatus.value = 'publishing'
    showPublishDialog.value = false
    
    // 先保存当前数据
    recalculateSortOrder()
    let dataToSave = [...localData.value]
    if (props.beforeSave) {
      dataToSave = props.beforeSave(dataToSave)
    }
    
    const contentType = props.publishConfig.contentType
    const getKey = props.publishConfig.getContentKey || ((item: any) => item[props.rowKey])
    
    // 批量保存草稿（大数据量时显示进度）
    const items = dataToSave.map(item => ({
      key: String(getKey(item)),
      data: item
    }))
    
    if (items.length > 500) {
      saveProgress.value = { saved: 0, total: items.length, show: true }
    }
    
    await adminApi.batchSaveDraft(contentType, items, {
      batchSize: 500,
      onProgress: (saved, total) => {
        saveProgress.value.saved = saved
        saveProgress.value.total = total
      }
    })
    
    saveProgress.value.show = false
    
    // 批量发布（传递变更说明）
    const keys = items.map(item => item.key)
    const result = await adminApi.batchPublish(contentType, keys, publishSummary.value || undefined)
    
    // 更新状态
    originalDataString.value = currentDataString.value
    currentVersion.value += 1
    contentStatus.value = 'published'
    editStatus.value = 'clean'
    
    emit('save', dataToSave)
    emit('publish', dataToSave)
    adminStore.addActivity({
      type: 'modify',
      target: props.title,
      description: `发布了 ${props.title} v${currentVersion.value}，共 ${result.publishedCount} 条`
    })
    
    ElMessage.success(`发布成功！当前版本 v${currentVersion.value}`)
  } catch (error) {
    editStatus.value = hasUnsavedChanges.value ? 'dirty' : 'clean'
    console.error('发布失败:', error)
    ElMessage.error('发布失败')
  }
}

// 重置数据
const resetData = async () => {
  if (!hasUnsavedChanges.value) {
    ElMessage.info('没有需要重置的更改')
    return
  }
  try {
    await ElMessageBox.confirm('确定要放弃当前的更改吗？', '确认重置',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    initLocalData()
    ElMessage.success('已重置为上次保存的内容')
  } catch {}
}

// 版本回滚
const handleVersionRollback = async () => {
  // 重新加载数据
  emit('reload')
  ElMessage.info('数据已回滚，请检查后重新发布')
}

// ==================== 离开页面保护 ====================
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (hasUnsavedChanges.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onBeforeRouteLeave(async (_to, _from, next) => {
  if (hasUnsavedChanges.value) {
    try {
      await ElMessageBox.confirm('您有未保存的更改，确定要离开吗？', '提示',
        { confirmButtonText: '离开', cancelButtonText: '留下', type: 'warning' })
      next()
    } catch { next(false) }
  } else { next() }
})

// ========================================
// Excel 导出
// ========================================

// 获取可导出的列配置
const exportColumns = computed<ExportColumn[]>(() => {
  return props.columns
    .filter(col => col.editable !== false || col.key === props.rowKey) // 包含ID和可编辑列
    .filter(col => col.showInForm !== false) // 排除仅显示列
    .map(col => ({
      key: col.key,
      label: col.label,
      type: col.type,
      required: col.required,
      options: col.options,
      description: col.placeholder
    }))
})

// 导出处理
const handleExport = async (mode: ExportMode) => {
  const dateStr = new Date().toISOString().split('T')[0]
  const baseFilename = props.title.replace('列表', '')
  
  let filename: string
  let description: string
  
  switch (mode) {
    case 'data':
      filename = `${baseFilename}-数据-${dateStr}`
      description = `导出了 ${props.title} 的数据（${localData.value.length} 条）`
      break
    case 'template':
      filename = `${baseFilename}-导入模板（带示例）`
      description = `导出了 ${props.title} 的导入模板（带示例）`
      break
    case 'blank':
      filename = `${baseFilename}-空白模板`
      description = `导出了 ${props.title} 的空白模板`
      break
  }
  
  try {
    await ExcelExporter.export({
      mode,
      filename,
      columns: exportColumns.value,
      data: mode === 'data' ? localData.value : undefined,
      sheetName: mode === 'data' ? props.title : undefined
    })
    
    adminStore.addActivity({
      type: 'download',
      target: props.title,
      description
    })
    
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

// ========================================
// Excel 导入
// ========================================

const triggerImport = () => {
  fileInputRef.value?.click()
}

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0 || !props.importConfig?.handler) return
  
  try {
    // 支持多文件导入
    const allImportedData: any[] = []
    const errors: string[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const data = await props.importConfig.handler(file)
        if (data && data.length > 0) {
          allImportedData.push(...data)
        }
      } catch (e) {
        const errMsg = (e as Error).message
        // 跳过待处理分类的特殊错误
        if (errMsg === '__PENDING_CATEGORY_DEFINITION__') {
          input.value = ''
          return
        }
        errors.push(`${file.name}: ${errMsg}`)
      }
    }
    
    // 显示部分失败的警告
    if (errors.length > 0 && allImportedData.length > 0) {
      ElMessage.warning(`部分文件导入失败：\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...还有 ${errors.length - 3} 个错误` : ''}`)
    } else if (errors.length > 0 && allImportedData.length === 0) {
      ElMessage.error('导入失败：' + errors[0])
      input.value = ''
      return
    }
    
    if (allImportedData.length === 0) {
      ElMessage.warning('导入文件中没有有效数据')
      input.value = ''
      return
    }

    // 获取用于比较的字段（排除不可编辑的字段如分类图片）
    const compareFields = props.columns
      .filter(col => col.editable !== false && col.showInForm !== false)
      .map(col => col.key)

    // 检测重复
    const checkResult = DuplicateDetector.check(
      allImportedData,
      localData.value,
      props.rowKey,
      compareFields
    )

    if (checkResult.hasDuplicates) {
      // 有重复，保存数据并显示对话框
      pendingImportData.value = allImportedData
      duplicateCheckResult.value = checkResult
      showDuplicateDialog.value = true
    } else {
      // 无重复，直接导入
      localData.value.push(...allImportedData)
      emit('import', allImportedData)
      const fileCount = files.length > 1 ? `（${files.length} 个文件）` : ''
      ElMessage.success(
        props.publishConfig?.enabled 
          ? `成功导入 ${allImportedData.length} 条数据${fileCount}，请点击"保存草稿"保存到服务器` 
          : `成功导入 ${allImportedData.length} 条数据${fileCount}`
      )
    }
  } catch (error) {
    ElMessage.error('导入失败：' + (error as Error).message)
  }
  
  input.value = '' // 重置
}

// 重复检测对话框状态
const showDuplicateDialog = ref(false)
const duplicateCheckResult = ref<DuplicateCheckResult | null>(null)
const pendingImportData = ref<any[]>([])
const duplicateReportColumns = computed(() => 
  props.columns.slice(0, 4).map(col => ({ key: col.key, label: col.label }))
)

// 跳过重复，只导入唯一数据
const handleSkipDuplicates = () => {
  if (duplicateCheckResult.value && duplicateCheckResult.value.uniqueData.length > 0) {
    localData.value.push(...duplicateCheckResult.value.uniqueData)
    emit('import', duplicateCheckResult.value.uniqueData)
    ElMessage.success(
      props.publishConfig?.enabled 
        ? `已跳过重复，成功导入 ${duplicateCheckResult.value.uniqueData.length} 条数据，请点击"保存草稿"保存到服务器` 
        : `已跳过重复，成功导入 ${duplicateCheckResult.value.uniqueData.length} 条数据`
    )
  } else {
    ElMessage.warning('所有数据都是重复的，没有导入任何数据')
  }
  pendingImportData.value = []
  duplicateCheckResult.value = null
}

// 全部导入（包含重复）
const handleImportAll = () => {
  if (pendingImportData.value.length > 0) {
    localData.value.push(...pendingImportData.value)
    emit('import', pendingImportData.value)
    ElMessage.success(
      props.publishConfig?.enabled 
        ? `成功导入全部 ${pendingImportData.value.length} 条数据（含重复），请点击"保存草稿"保存到服务器` 
        : `成功导入全部 ${pendingImportData.value.length} 条数据（含重复）`
    )
  }
  pendingImportData.value = []
  duplicateCheckResult.value = null
}

// 取消导入
const handleCancelImport = () => {
  pendingImportData.value = []
  duplicateCheckResult.value = null
}

// ========================================
// 分页
// ========================================

const handlePageChange = (page: number) => {
  currentPage.value = page
}

const handleSizeChange = (size: number) => {
  currentPageSize.value = size
  currentPage.value = 1
}

// ========================================
// 监听和生命周期
// ========================================

watch(searchQuery, () => {
  currentPage.value = 1
})

watch(currentCategory, () => {
  currentPage.value = 1
  selectedRows.value = []
  isAllSelected.value = false
  tableRef.value?.clearSelection()
})

// 监听 props.data 变化，但只在数据长度变化或首次加载时重新初始化
// 避免在编辑过程中因为 computed 重新计算而覆盖用户的编辑
watch(() => props.data, (newData, oldData) => {
  // 如果正在保存或发布中，不要重新初始化
  if (editStatus.value === 'saving' || editStatus.value === 'publishing') {
    return
  }
  // 如果数据长度相同且不是首次加载，可能只是 computed 重新计算，不需要重新初始化
  if (oldData && newData.length === oldData.length && newData.length === localData.value.length) {
    return
  }
  initLocalData()
}, { deep: true })

onMounted(() => {
  initLocalData()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>


<template>
  <div class="unified-table-editor">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <h3>{{ title }}</h3>
        
        <!-- 分类切换 -->
        <el-radio-group v-if="categories" v-model="currentCategory" size="default">
          <el-radio-button v-for="cat in categories" :key="cat.key" :value="cat.key">
            {{ cat.label }} ({{ categoryCounts[cat.key] || 0 }})
          </el-radio-button>
        </el-radio-group>
        
        <span v-if="!categories" class="data-count">共 {{ total }} 条数据</span>
        
        <!-- 搜索 -->
        <el-input
          v-if="searchable"
          v-model="searchQuery"
          :placeholder="searchPlaceholder || '搜索...'"
          clearable
          class="search-input"
          :style="{ width: searchInputWidth + 'px' }"
        >
          <template #prefix><i class="fas fa-search"></i></template>
        </el-input>
      </div>
      
      <div class="toolbar-right">
        <!-- 保存进度（大数据量时显示） -->
        <div v-if="saveProgress.show" class="save-progress">
          <el-progress 
            :percentage="Math.round(saveProgress.saved / saveProgress.total * 100)" 
            :stroke-width="6"
            style="width: 120px"
          />
          <span class="progress-text">{{ saveProgress.saved }}/{{ saveProgress.total }}</span>
        </div>
        
        <!-- 状态标签 -->
        <el-tag v-if="publishConfig?.enabled" :type="statusConfig.type" size="small" :class="['status-tag', { pulse: statusConfig.pulse }]">
          <i :class="statusConfig.icon" class="mr-1"></i> {{ statusConfig.text }}
        </el-tag>
        <el-tag v-if="publishConfig?.enabled" type="info" size="small" class="version-tag">v{{ currentVersion }}</el-tag>
        
        <!-- 版本历史 -->
        <el-button v-if="publishConfig?.enabled" @click="showVersionHistory = true" :disabled="isOperating">
          <i class="fas fa-history mr-1"></i> 版本历史
        </el-button>
        
        <!-- 自定义工具栏按钮插槽 -->
        <slot name="toolbar-extra"></slot>
        
        <!-- 新增 -->
        <el-button v-if="addable" type="primary" @click="openAddPanel">
          <i class="fas fa-plus mr-1"></i> 新增
        </el-button>
        
        <!-- Excel导入 -->
        <el-button v-if="importConfig?.enabled" @click="triggerImport">
          <i class="fas fa-upload mr-1"></i> 导入
        </el-button>
        <input
          v-if="importConfig?.enabled"
          ref="fileInputRef"
          type="file"
          :accept="importConfig.accept || '.xlsx,.xls'"
          :multiple="importConfig.multiple !== false"
          style="display: none"
          @change="handleFileChange"
        />
        
        <!-- 批量删除 -->
        <el-button v-if="deletable && selectedRows.length > 0" type="danger" @click="batchDelete">
          <i class="fas fa-trash mr-1"></i> 批量删除 ({{ selectedRows.length }})
        </el-button>
        
        <!-- 重置 -->
        <el-button v-if="publishConfig?.enabled" @click="resetData" :disabled="!hasUnsavedChanges || isOperating">
          <i class="fas fa-undo mr-1"></i> 重置
        </el-button>
        
        <!-- 导出下拉菜单 -->
        <el-dropdown v-if="exportable" trigger="click" @command="handleExport">
          <el-button>
            <i class="fas fa-download mr-1"></i> 导出 <i class="fas fa-caret-down ml-1"></i>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="data">
                <i class="fas fa-table mr-2"></i> 导出当前数据
              </el-dropdown-item>
              <el-dropdown-item command="template" divided>
                <i class="fas fa-file-excel mr-2"></i> 导出模板（带示例）
              </el-dropdown-item>
              <el-dropdown-item command="blank">
                <i class="fas fa-file mr-2"></i> 导出空白模板
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <!-- 保存 -->
        <el-button :loading="editStatus === 'saving'" :disabled="publishConfig?.enabled && (!hasUnsavedChanges || editStatus === 'publishing')" @click="saveAll">
          <i class="fas fa-save mr-1"></i> {{ publishConfig?.enabled ? '保存草稿' : '保存全部' }}
        </el-button>
        
        <!-- 发布 -->
        <el-button v-if="publishConfig?.enabled" type="primary" :loading="editStatus === 'publishing'" :disabled="editStatus === 'saving'" @click="openPublishDialog">
          <i class="fas fa-cloud-upload-alt mr-1"></i> 发布
        </el-button>
      </div>
    </div>

    <!-- 排序提示 -->
    <div v-if="sortConfig?.enabled" class="sort-tip">
      <i class="fas fa-info-circle"></i>
      使用上移/下移按钮调整显示顺序，调整后请点击"保存全部"
    </div>

    <!-- 已全选提示条 -->
    <div v-if="isAllSelected" class="select-all-tip selected">
      <i class="fas fa-check-circle"></i>
      <span>已选择全部 {{ selectedRows.length }} 条数据</span>
      <el-button type="primary" link @click="clearSelection">取消选择</el-button>
    </div>

    <!-- 数据表格 -->
    <el-table
      ref="tableRef"
      :data="paginatedData"
      :row-key="rowKey"
      border
      stripe
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <!-- 选择列 -->
      <el-table-column v-if="deletable" type="selection" width="50" fixed="left" />
      
      <!-- 排序列 -->
      <el-table-column v-if="sortConfig?.enabled" label="排序" width="90" header-align="left" align="center">
        <template #default="{ row, $index }">
          <div class="sort-buttons">
            <el-button :disabled="!canMoveUp($index)" size="small" circle @click="moveItem(row, 'up')">
              <i class="fas fa-arrow-up"></i>
            </el-button>
            <el-button :disabled="!canMoveDown($index)" size="small" circle @click="moveItem(row, 'down')">
              <i class="fas fa-arrow-down"></i>
            </el-button>
          </div>
        </template>
      </el-table-column>
      
      <!-- 数据列 -->
      <el-table-column
        v-for="col in tableColumns"
        :key="col.key"
        :prop="col.key"
        :label="col.label"
        :width="getColumnWidth(col)"
        :min-width="getColumnMinWidth(col)"
        :sortable="col.sortable"
        :fixed="col.fixed"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <!-- 图片 -->
          <template v-if="col.type === 'image'">
            <div v-if="row[col.key] || (col as any).imageFallback" class="image-cell" :class="{ 'image-contain': col.imageStyle === 'contain' }" @click="handlePreviewImage(row[col.key] || (typeof (col as any).imageFallback === 'function' ? (col as any).imageFallback(row) : (col as any).imageFallback))">
              <img 
                :src="getImageUrl(row[col.key]) || (typeof (col as any).imageFallback === 'function' ? (col as any).imageFallback(row) : (col as any).imageFallback)" 
                :alt="col.label"
                @error="(e: Event) => handleImageError(e, row, col)"
              />
            </div>
            <span v-else class="no-image">暂无</span>
          </template>
          
          <!-- 分类图片（通过 imageUrl 显示） -->
          <template v-else-if="col.type === 'category-image'">
            <div v-if="row.imageUrl" class="image-cell image-contain" @click="handlePreviewImage(row.imageUrl)">
              <img :src="row.imageUrl" :alt="row.name || col.label" @error="(e: Event) => handleImageError(e, row, col)" />
            </div>
            <span v-else class="no-image">暂无</span>
          </template>
          
          <!-- 布尔 -->
          <template v-else-if="col.type === 'boolean'">
            <el-tag :type="row[col.key] ? 'success' : 'info'" size="small">
              {{ row[col.key] ? '是' : '否' }}
            </el-tag>
          </template>
          
          <!-- 标签数组 -->
          <template v-else-if="col.type === 'tags'">
            <span class="truncate-text">{{ truncateText(row[col.key], col.truncate || 30) }}</span>
          </template>
          
          <!-- 截断文本 -->
          <template v-else-if="col.truncate">
            <span class="truncate-text">{{ truncateText(row[col.key], col.truncate) }}</span>
          </template>
          
          <!-- 默认 -->
          <template v-else>{{ formatDisplayValue(row[col.key], col) }}</template>
        </template>
      </el-table-column>
      
      <!-- 操作列 -->
      <el-table-column v-if="editable || deletable" label="操作" width="110" fixed="right" align="center">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button v-if="editable" type="primary" link size="small" @click="openEditPanel(row)">编辑</el-button>
            <el-button v-if="deletable" type="danger" link size="small" @click="deleteItem(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>


    <!-- 分页 -->
    <div v-if="paginated" class="pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="currentPageSize"
        :page-sizes="pageSizes"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 编辑面板 -->
    <el-drawer
      v-model="editPanelVisible"
      :title="isAddMode ? `新增${title.replace('列表', '')}` : `编辑${title.replace('列表', '')}`"
      size="520px"
      :close-on-click-modal="false"
    >
      <div class="edit-form">
        <el-form label-position="top">
          <el-form-item
            v-for="col in formColumns"
            :key="col.key"
            :label="col.label"
            :required="col.required"
          >
            <!-- 不可编辑 -->
            <template v-if="col.editable === false">
              <template v-if="col.type === 'image'">
                <div v-if="editFormData[col.key]" class="image-preview">
                  <img :src="getImageUrl(editFormData[col.key])" alt="预览" />
                </div>
                <span v-else class="no-image">暂无图片</span>
              </template>
              <el-input v-else v-model="editFormData[col.key]" disabled />
            </template>
            
            <!-- 选择 -->
            <template v-else-if="col.type === 'select' && col.options">
              <el-select v-model="editFormData[col.key]" style="width: 100%">
                <el-option v-for="opt in col.options" :key="String(opt.value)" :label="opt.label" :value="opt.value" />
              </el-select>
            </template>
            
            <!-- 布尔 -->
            <template v-else-if="col.type === 'boolean'">
              <el-switch v-model="editFormData[col.key]" />
              <span v-if="col.placeholder" class="switch-tip">{{ col.placeholder }}</span>
            </template>
            
            <!-- 数字 -->
            <template v-else-if="col.type === 'number'">
              <el-input-number v-model="editFormData[col.key]" style="width: 100%" />
            </template>
            
            <!-- 日期 -->
            <template v-else-if="col.type === 'date'">
              <el-date-picker v-model="editFormData[col.key]" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </template>
            
            <!-- 多行文本 -->
            <template v-else-if="col.type === 'textarea'">
              <el-input v-model="editFormData[col.key]" type="textarea" :rows="5" :placeholder="col.placeholder" />
            </template>
            
            <!-- 标签 -->
            <template v-else-if="col.type === 'tags'">
              <el-input v-model="editFormData[col.key]" :placeholder="col.placeholder || '多个标签用逗号分隔'" />
            </template>
            
            <!-- 图片（支持上传） -->
            <template v-else-if="col.type === 'image'">
              <div class="image-upload-wrapper">
                <!-- 有上传分类时使用上传组件 -->
                <ImageUploader
                  v-if="col.uploadCategory"
                  v-model="editFormData[col.key]"
                  :category="col.uploadCategory"
                  :placeholder="col.placeholder || '点击或拖拽上传图片'"
                />
                <!-- 无上传分类时显示只读信息 -->
                <div v-else class="image-readonly">
                  <div v-if="editFormData[col.key]" class="image-info">
                    <div class="image-preview-small">
                      <img :src="getImageUrl(editFormData[col.key])" alt="预览" />
                    </div>
                    <div class="image-filename">
                      <i class="fas fa-image"></i>
                      <span>{{ getFilenameFromUrl(editFormData[col.key]) }}</span>
                    </div>
                  </div>
                  <div v-else class="no-image-tip">
                    <i class="fas fa-image"></i>
                    <span>暂无图片</span>
                  </div>
                </div>
              </div>
            </template>
            
            <!-- 分类图片选择器 -->
            <template v-else-if="col.type === 'category-image'">
              <CategoryImagePicker
                v-model="editFormData[col.key]"
                :placeholder="col.placeholder || '点击选择分类图片'"
                :used-images-map="editFormData._usedImagesMap"
                :current-category-id="editFormData.id"
                @image-change="handleCategoryImageChange"
              />
            </template>
            
            <!-- 默认文本 -->
            <template v-else>
              <el-input v-model="editFormData[col.key]" :placeholder="col.placeholder" />
            </template>
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="closeEditPanel">取消</el-button>
          <el-button type="primary" @click="saveEditForm">{{ isAddMode ? '添加' : '确定' }}</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 图片预览 -->
    <el-dialog v-model="previewVisible" title="图片预览" width="600px">
      <div class="image-preview-dialog">
        <img :src="previewUrl" alt="预览" />
      </div>
    </el-dialog>
    
    <!-- 版本历史对话框 -->
    <VersionHistoryDialog
      v-if="publishConfig?.enabled"
      v-model:visible="showVersionHistory"
      :content-type="publishConfig.contentType"
      content-key="list"
      :title="`${title} - 版本历史`"
      @rollback="handleVersionRollback"
    />
    
    <!-- 发布对话框 -->
    <PublishDialog
      v-if="publishConfig?.enabled"
      v-model:visible="showPublishDialog"
      v-model:publish-summary="publishSummary"
      :current-version="currentVersion"
      :is-publishing="editStatus === 'publishing'"
      @confirm="publishAll"
    />
    
    <!-- 重复数据检测对话框 -->
    <DuplicateReportDialog
      v-model:visible="showDuplicateDialog"
      :result="duplicateCheckResult"
      :columns="duplicateReportColumns"
      @skip="handleSkipDuplicates"
      @import-all="handleImportAll"
      @cancel="handleCancelImport"
    />
    
    <!-- 全选范围选择对话框 -->
    <el-dialog
      v-model="showSelectAllDialog"
      title="选择范围"
      width="420px"
      :close-on-click-modal="false"
      @close="handleSelectDialogClose"
    >
      <div class="select-scope-dialog">
        <p class="dialog-desc">请选择要操作的数据范围：</p>
        <div class="scope-options">
          <div class="scope-option" @click="selectCurrentPage">
            <div class="option-icon current-page">
              <i class="fas fa-file-alt"></i>
            </div>
            <div class="option-content">
              <div class="option-title">当前页</div>
              <div class="option-count">{{ paginatedData.length }} 条数据</div>
            </div>
          </div>
          <div class="scope-option" @click="selectAllData">
            <div class="option-icon all-data">
              <i class="fas fa-database"></i>
            </div>
            <div class="option-content">
              <div class="option-title">全部数据</div>
              <div class="option-count">{{ filteredData.length }} 条数据</div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>


<style scoped>
.unified-table-editor {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toolbar-left h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.data-count {
  font-size: 13px;
  color: #999;
}

.search-input {
  margin-left: 12px;
}

.save-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 12px;
}
.progress-text {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}
.status-tag { margin-right: 4px; }
.status-tag.pulse { animation: pulse-animation 1.5s infinite; }
@keyframes pulse-animation { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
.version-tag { margin-right: 8px; }

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sort-tip {
  padding: 10px 20px;
  background: #f0f9ff;
  color: #0369a1;
  font-size: 13px;
  border-bottom: 1px solid #e0f2fe;
}

.sort-tip i { margin-right: 6px; }

.select-all-tip.selected {
  padding: 10px 20px;
  background: #dcfce7;
  color: #166534;
  font-size: 13px;
  border-bottom: 1px solid #bbf7d0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.select-all-tip.selected i {
  font-size: 14px;
}

/* 全选范围选择对话框 */
.select-scope-dialog {
  padding: 10px 0;
}

.dialog-desc {
  margin: 0 0 20px;
  color: #606266;
  font-size: 14px;
}

.scope-options {
  display: flex;
  gap: 16px;
}

.scope-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.scope-option:hover {
  border-color: #409eff;
  background: #f0f9ff;
}

.option-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  font-size: 24px;
}

.option-icon.current-page {
  background: #e0f2fe;
  color: #0284c7;
}

.option-icon.all-data {
  background: #fef3c7;
  color: #d97706;
}

.option-content {
  text-align: center;
}

.option-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.option-count {
  font-size: 13px;
  color: #909399;
}

.publish-tip {
  padding: 10px 20px;
  background: #fffbeb;
  color: #b45309;
  font-size: 13px;
  border-bottom: 1px solid #fef3c7;
}

.publish-tip i { margin-right: 6px; }

.sort-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.sort-buttons .el-button {
  padding: 4px;
  width: 28px;
  height: 28px;
}

:deep(.el-table) {
  width: 100% !important;
}

:deep(.el-table th) {
  background: #f9fafb !important;
  font-weight: 600;
  white-space: nowrap;
}

:deep(.el-table th .cell) {
  white-space: nowrap;
}

.image-cell {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #e8e8e8;
  background: #f9f9f9;
}

.image-cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}

.image-cell.image-contain img {
  object-fit: contain;
  padding: 2px;
}

.image-cell:hover img { transform: scale(1.1); }

.no-image {
  color: #ccc;
  font-size: 12px;
}

.truncate-text {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.pagination-wrapper {
  padding: 16px 20px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #f0f0f0;
}

.edit-form { padding: 0 10px; }

.switch-tip {
  margin-left: 10px;
  font-size: 12px;
  color: #999;
}

.image-input-wrapper { width: 100%; }

.image-upload-wrapper { width: 100%; }

.image-readonly {
  width: 100%;
}

.image-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.image-preview-small {
  width: 100%;
  max-height: 150px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
  background: #f9f9f9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview-small img {
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
}

.image-filename {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
}

.image-filename i {
  color: #909399;
}

.image-filename span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-image-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  background: #fafafa;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  color: #c0c4cc;
}

.no-image-tip i {
  font-size: 32px;
  margin-bottom: 8px;
}

.no-image-tip span {
  font-size: 13px;
}

.image-preview {
  margin-top: 10px;
  max-width: 100%;
  max-height: 150px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
  display: inline-block;
}

.image-preview img {
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.image-preview-dialog {
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-preview-dialog img {
  max-width: 100%;
  max-height: 500px;
  object-fit: contain;
}

.mr-1 { margin-right: 4px; }
.mr-2 { margin-right: 8px; }
.ml-1 { margin-left: 4px; }
</style>
