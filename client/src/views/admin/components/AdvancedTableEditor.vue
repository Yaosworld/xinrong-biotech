<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAdminStore } from '@/stores/adminStore'

// 定义列配置类型
interface ColumnConfig {
  key: string
  label: string
  width?: number
  minWidth?: number
  sortable?: boolean
  editable?: boolean
  fixed?: 'left' | 'right' | boolean
  type?: 'text' | 'number' | 'select' | 'date' | 'boolean' | 'image' | 'textarea'
  options?: { label: string; value: string | number | boolean }[]
  truncate?: number // 文本截断长度
  showInTable?: boolean // 是否在表格中显示
  required?: boolean
  imageStyle?: 'cover' | 'contain' // 图片显示方式
}

// Props
const props = withDefaults(defineProps<{
  title: string
  data: any[]
  columns: ColumnConfig[]
  rowKey?: string
  searchable?: boolean
  searchPlaceholder?: string
  addable?: boolean
  editable?: boolean
  deletable?: boolean
  pageSize?: number
  pageSizes?: number[]
}>(), {
  rowKey: 'id',
  pageSize: 10,
  pageSizes: () => [10, 20, 50, 100]
})

// Emits
const emit = defineEmits<{
  save: [data: any[]]
  add: [item: any]
  update: [item: any]
  delete: [item: any]
}>()

const adminStore = useAdminStore()

// 本地数据副本
const localData = ref<any[]>([])

// 搜索关键词
const searchQuery = ref('')

// 分页状态
const currentPage = ref(1)
const currentPageSize = ref(props.pageSize)

// 编辑面板状态
const editPanelVisible = ref(false)
const editingItem = ref<any>(null)
const editFormData = ref<any>({})
const isAddMode = ref(false)

// 选中的行
const selectedRows = ref<any[]>([])

// 图片预览
const previewVisible = ref(false)
const previewUrl = ref('')

// 表格中显示的列
const tableColumns = computed(() => 
  props.columns.filter(col => col.showInTable !== false)
)

// 过滤后的数据
const filteredData = computed(() => {
  if (!searchQuery.value.trim()) {
    return localData.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return localData.value.filter(item => {
    return props.columns.some(col => {
      const value = item[col.key]
      if (value == null) return false
      return String(value).toLowerCase().includes(query)
    })
  })
})

// 分页后的数据
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * currentPageSize.value
  const end = start + currentPageSize.value
  return filteredData.value.slice(start, end)
})

// 总数
const total = computed(() => filteredData.value.length)

// 初始化本地数据
const initLocalData = () => {
  localData.value = JSON.parse(JSON.stringify(props.data))
}

// 截断文本
const truncateText = (text: string, length: number) => {
  if (!text || text.length <= length) return text
  return text.substring(0, length) + '...'
}

// 获取图片URL
const getImageUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return url.startsWith('/') ? url : `/${url}`
}

// 预览图片
const handlePreviewImage = (url: string) => {
  previewUrl.value = getImageUrl(url)
  previewVisible.value = true
}

// 打开编辑面板
const openEditPanel = (row: any) => {
  isAddMode.value = false
  editingItem.value = row
  editFormData.value = { ...row }
  editPanelVisible.value = true
}

// 打开新增面板
const openAddPanel = () => {
  isAddMode.value = true
  editingItem.value = null
  editFormData.value = {}
  
  // 初始化默认值
  props.columns.forEach(col => {
    if (col.type === 'boolean') {
      editFormData.value[col.key] = false
    } else if (col.type === 'number') {
      editFormData.value[col.key] = 0
    } else {
      editFormData.value[col.key] = ''
    }
  })
  
  // 生成唯一 ID
  const maxId = localData.value.reduce((max, item) => {
    const id = typeof item[props.rowKey] === 'number' ? item[props.rowKey] : 0
    return Math.max(max, id)
  }, 0)
  editFormData.value[props.rowKey] = maxId + 1
  
  editPanelVisible.value = true
}

// 关闭编辑面板
const closeEditPanel = () => {
  editPanelVisible.value = false
  editingItem.value = null
  editFormData.value = {}
}

// 保存编辑
const saveEditForm = () => {
  // 验证必填字段
  const requiredFields = props.columns.filter(col => col.required !== false && col.editable !== false)
  for (const field of requiredFields) {
    if (field.type !== 'boolean' && !editFormData.value[field.key]) {
      ElMessage.warning(`请填写 ${field.label}`)
      return
    }
  }
  
  if (isAddMode.value) {
    localData.value.unshift({ ...editFormData.value })
    emit('add', editFormData.value)
    ElMessage.success('添加成功')
  } else {
    const index = localData.value.findIndex(
      item => item[props.rowKey] === editingItem.value[props.rowKey]
    )
    if (index > -1) {
      localData.value[index] = { ...editFormData.value }
      emit('update', editFormData.value)
      ElMessage.success('保存成功')
    }
  }
  
  closeEditPanel()
}

// 删除行
const deleteRow = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这条数据吗？', '提示', {
      type: 'warning'
    })
    
    const index = localData.value.findIndex(
      item => item[props.rowKey] === row[props.rowKey]
    )
    if (index > -1) {
      localData.value.splice(index, 1)
      emit('delete', row)
      ElMessage.success('删除成功')
    }
  } catch {
    // 用户取消
  }
}

// 批量删除
const batchDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条数据吗？`,
      '提示',
      { type: 'warning' }
    )
    
    const ids = selectedRows.value.map(row => row[props.rowKey])
    localData.value = localData.value.filter(
      item => !ids.includes(item[props.rowKey])
    )
    selectedRows.value = []
    ElMessage.success('批量删除成功')
  } catch {
    // 用户取消
  }
}

// 保存所有更改
const saveAll = () => {
  emit('save', localData.value)
  adminStore.addActivity({
    type: 'modify',
    target: props.title,
    description: `保存了 ${props.title} 的数据更改`
  })
  ElMessage.success('保存成功')
}

// 导出数据
const exportData = () => {
  const data = JSON.stringify(localData.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${props.title}-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
  
  adminStore.addActivity({
    type: 'download',
    target: props.title,
    description: `导出了 ${props.title} 的数据`
  })
}

// 选择变化
const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

// 分页变化
const handlePageChange = (page: number) => {
  currentPage.value = page
}

const handleSizeChange = (size: number) => {
  currentPageSize.value = size
  currentPage.value = 1
}

// 搜索时重置页码
watch(searchQuery, () => {
  currentPage.value = 1
})

// 监听数据变化
watch(() => props.data, () => {
  initLocalData()
}, { deep: true })

onMounted(() => {
  initLocalData()
})
</script>

<template>
  <div class="advanced-table-editor">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <h3>{{ title }}</h3>
        <span class="data-count">共 {{ total }} 条数据</span>
      </div>
      <div class="toolbar-right">
        <!-- 搜索框 -->
        <el-input
          v-if="searchable"
          v-model="searchQuery"
          :placeholder="searchPlaceholder || '搜索...'"
          clearable
          style="width: 220px"
        >
          <template #prefix>
            <i class="fas fa-search"></i>
          </template>
        </el-input>
        
        <!-- 操作按钮 -->
        <el-button v-if="addable" type="primary" @click="openAddPanel">
          <i class="fas fa-plus mr-1"></i> 新增
        </el-button>
        <el-button v-if="deletable && selectedRows.length > 0" type="danger" @click="batchDelete">
          <i class="fas fa-trash mr-1"></i> 批量删除 ({{ selectedRows.length }})
        </el-button>
        <el-button @click="exportData">
          <i class="fas fa-download mr-1"></i> 导出
        </el-button>
        <el-button type="success" @click="saveAll">
          <i class="fas fa-save mr-1"></i> 保存全部
        </el-button>
      </div>
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
      <!-- 选择列 - 固定左侧 -->
      <el-table-column v-if="deletable" type="selection" width="50" fixed="left" />
      
      <!-- 数据列 -->
      <el-table-column
        v-for="col in tableColumns"
        :key="col.key"
        :prop="col.key"
        :label="col.label"
        :width="col.width"
        :min-width="col.minWidth || 100"
        :sortable="col.sortable"
        :fixed="col.fixed"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <!-- 图片类型 -->
          <template v-if="col.type === 'image'">
            <div 
              v-if="row[col.key]" 
              class="image-cell" 
              :class="{ 'image-contain': col.imageStyle === 'contain' }"
              @click="handlePreviewImage(row[col.key])"
            >
              <img :src="getImageUrl(row[col.key])" :alt="col.label" />
            </div>
            <span v-else class="no-image">暂无</span>
          </template>
          
          <!-- 布尔类型 -->
          <template v-else-if="col.type === 'boolean'">
            <el-tag :type="row[col.key] ? 'success' : 'info'" size="small">
              {{ row[col.key] ? '是' : '否' }}
            </el-tag>
          </template>
          
          <!-- 选择类型 -->
          <template v-else-if="col.type === 'select' && col.options">
            {{ col.options.find(o => o.value === row[col.key])?.label || row[col.key] }}
          </template>
          
          <!-- 文本截断 -->
          <template v-else-if="col.truncate">
            <span class="truncate-text">
              {{ truncateText(row[col.key], col.truncate) }}
            </span>
          </template>
          
          <!-- 默认显示 -->
          <template v-else>
            {{ row[col.key] }}
          </template>
        </template>
      </el-table-column>
      
      <!-- 操作列 - 固定右侧 -->
      <el-table-column v-if="editable || deletable" label="操作" width="120" fixed="right" align="center">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button v-if="editable" type="primary" link size="small" @click="openEditPanel(row)">
              编辑
            </el-button>
            <el-button v-if="deletable" type="danger" link size="small" @click="deleteRow(row)">
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
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
      :title="isAddMode ? '新增数据' : '编辑数据'"
      size="520px"
      :close-on-click-modal="false"
    >
      <div class="edit-form">
        <el-form label-position="top">
          <el-form-item
            v-for="col in columns"
            :key="col.key"
            :label="col.label"
            :required="col.required !== false && col.editable !== false"
          >
            <!-- 不可编辑字段 -->
            <template v-if="col.editable === false">
              <!-- 不可编辑的图片字段显示预览 -->
              <template v-if="col.type === 'image'">
                <div v-if="editFormData[col.key]" class="image-preview">
                  <img :src="getImageUrl(editFormData[col.key])" alt="预览" />
                </div>
                <span v-else class="no-image">暂无图片</span>
              </template>
              <el-input v-else v-model="editFormData[col.key]" disabled />
            </template>
            
            <!-- 选择类型 -->
            <template v-else-if="col.type === 'select' && col.options">
              <el-select v-model="editFormData[col.key]" style="width: 100%">
                <el-option
                  v-for="opt in col.options"
                  :key="String(opt.value)"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </template>
            
            <!-- 布尔类型 -->
            <template v-else-if="col.type === 'boolean'">
              <el-switch v-model="editFormData[col.key]" />
            </template>
            
            <!-- 数字类型 -->
            <template v-else-if="col.type === 'number'">
              <el-input-number v-model="editFormData[col.key]" style="width: 100%" />
            </template>
            
            <!-- 日期类型 -->
            <template v-else-if="col.type === 'date'">
              <el-date-picker
                v-model="editFormData[col.key]"
                type="date"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </template>
            
            <!-- 多行文本 -->
            <template v-else-if="col.type === 'textarea'">
              <el-input
                v-model="editFormData[col.key]"
                type="textarea"
                :rows="5"
              />
            </template>
            
            <!-- 图片类型 -->
            <template v-else-if="col.type === 'image'">
              <div class="image-input-wrapper">
                <el-input v-model="editFormData[col.key]" placeholder="输入图片路径" />
                <div v-if="editFormData[col.key]" class="image-preview">
                  <img :src="getImageUrl(editFormData[col.key])" alt="预览" />
                </div>
              </div>
            </template>
            
            <!-- 默认文本输入 -->
            <template v-else>
              <el-input v-model="editFormData[col.key]" />
            </template>
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="closeEditPanel">取消</el-button>
          <el-button type="primary" @click="saveEditForm">
            {{ isAddMode ? '添加' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 图片预览 -->
    <el-dialog v-model="previewVisible" title="图片预览" width="600px">
      <div class="image-preview-dialog">
        <img :src="previewUrl" alt="预览" />
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.advanced-table-editor {
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
  gap: 12px;
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

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* 表格样式 */
:deep(.el-table) {
  border-radius: 0;
}

:deep(.el-table th) {
  background: #f9fafb !important;
  font-weight: 600;
  white-space: nowrap;
}

:deep(.el-table th .cell) {
  white-space: nowrap;
}

/* 图片单元格 */
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

.image-cell:hover img {
  transform: scale(1.1);
}

.no-image {
  color: #ccc;
  font-size: 12px;
}

/* 文本截断 */
.truncate-text {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.action-buttons .el-button {
  padding: 4px 0;
  margin: 0;
}

/* 分页 */
.pagination-wrapper {
  padding: 16px 20px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #f0f0f0;
}

/* 编辑表单 */
.edit-form {
  padding: 0 10px;
}

.image-input-wrapper {
  width: 100%;
}

.image-preview {
  margin-top: 10px;
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
  display: inline-block;
}

.image-preview img {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 图片预览对话框 */
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

.mr-1 {
  margin-right: 4px;
}
</style>
