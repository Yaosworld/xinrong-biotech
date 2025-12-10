<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAdminStore } from '@/stores/adminStore'
import { adminApi } from '@/api/contentApi'
import VersionHistoryDialog from './VersionHistoryDialog.vue'
import PublishDialog from './PublishDialog.vue'
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
  type?: 'text' | 'number' | 'select' | 'date' | 'boolean' | 'image' | 'textarea' | 'tags'
  options?: { label: string; value: string | number | boolean }[]
  truncate?: number
  showInTable?: boolean
  showInForm?: boolean
  required?: boolean
  imageStyle?: 'cover' | 'contain'
  placeholder?: string
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
  beforeAdd?: (item: any) => any
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
const publishSummary = ref('')

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
}

// 图片处理
const getImageUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return url.startsWith('/') ? url : `/${url}`
}

const handlePreviewImage = (url: string) => {
  previewUrl.value = getImageUrl(url)
  previewVisible.value = true
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
    editFormData.value = props.beforeAdd(editFormData.value)
  }
  
  editPanelVisible.value = true
}

const openEditPanel = (row: any) => {
  isAddMode.value = false
  editingItem.value = row
  editFormData.value = { ...row }
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
      ElMessage.success(props.publishConfig?.enabled ? '修改成功，请点击"保存草稿"保存到服务器' : '保存成功')
    }
  }
  
  closeEditPanel()
}

const deleteItem = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这条数据吗？', '提示', { type: 'warning' })
    const index = localData.value.findIndex(item => item[props.rowKey] === row[props.rowKey])
    if (index > -1) {
      localData.value.splice(index, 1)
      emit('delete', row)
      ElMessage.success('删除成功')
    }
  } catch { /* 用户取消 */ }
}

const batchDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 条数据吗？`, '提示', { type: 'warning' })
    const ids = selectedRows.value.map(row => row[props.rowKey])
    localData.value = localData.value.filter(item => !ids.includes(item[props.rowKey]))
    selectedRows.value = []
    ElMessage.success('批量删除成功')
  } catch { /* 用户取消 */ }
}

const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
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
      
      // 批量保存草稿
      const items = dataToSave.map(item => ({
        key: String(getKey(item)),
        data: item
      }))
      
      await adminApi.batchSaveDraft(contentType, items)
      
      // 更新状态
      originalDataString.value = currentDataString.value
      contentStatus.value = 'draft'
      editStatus.value = 'clean'
    } catch (error) {
      editStatus.value = hasUnsavedChanges.value ? 'dirty' : 'clean'
      console.error('保存草稿失败:', error)
      ElMessage.error('保存草稿失败')
      return
    }
  }
  
  emit('save', dataToSave)
  adminStore.addActivity({
    type: 'modify',
    target: props.title,
    description: `保存了 ${props.title} 的数据更改，共 ${dataToSave.length} 条`
  })
  ElMessage.success(props.publishConfig?.enabled ? '草稿已保存' : '保存成功')
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
    
    // 批量保存草稿
    const items = dataToSave.map(item => ({
      key: String(getKey(item)),
      data: item
    }))
    await adminApi.batchSaveDraft(contentType, items)
    
    // 批量发布
    const keys = items.map(item => item.key)
    const result = await adminApi.batchPublish(contentType, keys)
    
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
  const file = input.files?.[0]
  if (!file || !props.importConfig?.handler) return
  
  try {
    const importedData = await props.importConfig.handler(file)
    if (!importedData || importedData.length === 0) {
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
      importedData,
      localData.value,
      props.rowKey,
      compareFields
    )

    if (checkResult.hasDuplicates) {
      // 有重复，显示处理对话框
      await showDuplicateDialog(importedData, checkResult)
    } else {
      // 无重复，直接导入
      localData.value.push(...importedData)
      emit('import', importedData)
      ElMessage.success(
        props.publishConfig?.enabled 
          ? `成功导入 ${importedData.length} 条数据，请点击"保存草稿"保存到服务器` 
          : `成功导入 ${importedData.length} 条数据`
      )
    }
  } catch (error) {
    ElMessage.error('导入失败：' + (error as Error).message)
  }
  
  input.value = '' // 重置
}

// 显示重复数据处理对话框
const showDuplicateDialog = async (importedData: any[], checkResult: DuplicateCheckResult) => {
  const reportColumns = props.columns.slice(0, 4).map(col => ({ key: col.key, label: col.label }))
  const reportHtml = DuplicateDetector.generateReport(checkResult, reportColumns)
  
  try {
    const action = await ElMessageBox({
      title: '检测到重复数据',
      message: `
        ${reportHtml}
        <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #eee;">
          <strong>请选择处理方式：</strong>
        </div>
      `,
      dangerouslyUseHTMLString: true,
      distinguishCancelAndClose: true,
      showCancelButton: true,
      confirmButtonText: `跳过重复，导入 ${checkResult.stats.unique} 条`,
      cancelButtonText: '全部导入（保留重复）',
      type: 'warning'
    })
    
    // 点击确认：跳过重复
    if (action === 'confirm') {
      if (checkResult.uniqueData.length > 0) {
        localData.value.push(...checkResult.uniqueData)
        emit('import', checkResult.uniqueData)
        ElMessage.success(
          props.publishConfig?.enabled 
            ? `已跳过重复，成功导入 ${checkResult.uniqueData.length} 条数据，请点击"保存草稿"保存到服务器` 
            : `已跳过重复，成功导入 ${checkResult.uniqueData.length} 条数据`
        )
      } else {
        ElMessage.warning('所有数据都是重复的，没有导入任何数据')
      }
    }
  } catch (action) {
    // 点击取消：全部导入
    if (action === 'cancel') {
      localData.value.push(...importedData)
      emit('import', importedData)
      ElMessage.success(
        props.publishConfig?.enabled 
          ? `成功导入全部 ${importedData.length} 条数据（含重复），请点击"保存草稿"保存到服务器` 
          : `成功导入全部 ${importedData.length} 条数据（含重复）`
      )
    }
    // 点击关闭：取消导入，不做任何操作
  }
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
})

watch(() => props.data, () => {
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
        >
          <template #prefix><i class="fas fa-search"></i></template>
        </el-input>
      </div>
      
      <div class="toolbar-right">
        <!-- 状态标签 -->
        <el-tag v-if="publishConfig?.enabled" :type="statusConfig.type" size="small" :class="['status-tag', { pulse: statusConfig.pulse }]">
          <i :class="statusConfig.icon" class="mr-1"></i> {{ statusConfig.text }}
        </el-tag>
        <el-tag v-if="publishConfig?.enabled" type="info" size="small" class="version-tag">v{{ currentVersion }}</el-tag>
        
        <!-- 版本历史 -->
        <el-button v-if="publishConfig?.enabled" @click="showVersionHistory = true" :disabled="isOperating">
          <i class="fas fa-history mr-1"></i> 版本历史
        </el-button>
        
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

    <!-- 数据表格 -->
    <el-table
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
            <div v-if="row[col.key]" class="image-cell" :class="{ 'image-contain': col.imageStyle === 'contain' }" @click="handlePreviewImage(row[col.key])">
              <img :src="getImageUrl(row[col.key])" :alt="col.label" />
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
            
            <!-- 图片 -->
            <template v-else-if="col.type === 'image'">
              <div class="image-input-wrapper">
                <el-input v-model="editFormData[col.key]" :placeholder="col.placeholder || '输入图片路径'" />
                <div v-if="editFormData[col.key]" class="image-preview">
                  <img :src="getImageUrl(editFormData[col.key])" alt="预览" />
                </div>
              </div>
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
          <el-button type="primary" @click="saveEditForm">{{ isAddMode ? '添加' : '保存' }}</el-button>
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
  width: 200px;
  margin-left: 12px;
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
