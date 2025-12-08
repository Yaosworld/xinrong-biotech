<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAdminStore } from '@/stores/adminStore'

// 定义列配置类型
interface ColumnConfig {
  key: string
  label: string
  width?: number
  sortable?: boolean
  editable?: boolean
  type?: 'text' | 'number' | 'select' | 'date' | 'boolean'
  options?: { label: string; value: string | number | boolean }[]
}

// Props
const props = defineProps<{
  title: string
  data: any[]
  columns: ColumnConfig[]
  rowKey?: string
  searchable?: boolean
  searchPlaceholder?: string
  addable?: boolean
  editable?: boolean
  deletable?: boolean
}>()

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

// 编辑状态
const editingRow = ref<any>(null)
const editingData = ref<any>({})

// 新增状态
const isAdding = ref(false)
const newItemData = ref<any>({})

// 选中的行
const selectedRows = ref<any[]>([])

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

// 初始化本地数据
const initLocalData = () => {
  localData.value = JSON.parse(JSON.stringify(props.data))
}

// 开始编辑行
const startEdit = (row: any) => {
  editingRow.value = row
  editingData.value = { ...row }
}

// 取消编辑
const cancelEdit = () => {
  editingRow.value = null
  editingData.value = {}
}

// 保存编辑
const saveEdit = () => {
  const index = localData.value.findIndex(item => item[props.rowKey || 'id'] === editingRow.value[props.rowKey || 'id'])
  if (index > -1) {
    localData.value[index] = { ...editingData.value }
    emit('update', editingData.value)
    ElMessage.success('保存成功')
  }
  cancelEdit()
}

// 开始新增
const startAdd = () => {
  isAdding.value = true
  // 初始化新项数据
  newItemData.value = {}
  props.columns.forEach(col => {
    if (col.type === 'boolean') {
      newItemData.value[col.key] = false
    } else if (col.type === 'number') {
      newItemData.value[col.key] = 0
    } else {
      newItemData.value[col.key] = ''
    }
  })
  // 生成唯一 ID
  newItemData.value[props.rowKey || 'id'] = `new_${Date.now()}`
}

// 取消新增
const cancelAdd = () => {
  isAdding.value = false
  newItemData.value = {}
}

// 确认新增
const confirmAdd = () => {
  // 验证必填字段
  const hasEmpty = props.columns.some(col => {
    if (col.editable !== false && col.type !== 'boolean') {
      return !newItemData.value[col.key]
    }
    return false
  })
  
  if (hasEmpty) {
    ElMessage.warning('请填写所有必填字段')
    return
  }
  
  localData.value.unshift({ ...newItemData.value })
  emit('add', newItemData.value)
  ElMessage.success('添加成功')
  cancelAdd()
}

// 删除行
const deleteRow = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这条数据吗？', '提示', {
      type: 'warning'
    })
    
    const index = localData.value.findIndex(item => item[props.rowKey || 'id'] === row[props.rowKey || 'id'])
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
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 条数据吗？`, '提示', {
      type: 'warning'
    })
    
    const ids = selectedRows.value.map(row => row[props.rowKey || 'id'])
    localData.value = localData.value.filter(item => !ids.includes(item[props.rowKey || 'id']))
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

// 监听数据变化
watch(() => props.data, () => {
  initLocalData()
}, { deep: true })

onMounted(() => {
  initLocalData()
})
</script>

<template>
  <div class="data-table-editor">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <h3>{{ title }}</h3>
        <span class="data-count">共 {{ filteredData.length }} 条数据</span>
      </div>
      <div class="toolbar-right">
        <!-- 搜索框 -->
        <el-input
          v-if="searchable"
          v-model="searchQuery"
          :placeholder="searchPlaceholder || '搜索...'"
          clearable
          style="width: 200px"
        >
          <template #prefix>
            <i class="fas fa-search"></i>
          </template>
        </el-input>
        
        <!-- 操作按钮 -->
        <el-button v-if="addable" type="primary" @click="startAdd">
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

    <!-- 新增表单 -->
    <div v-if="isAdding" class="add-form">
      <div class="form-header">
        <h4>新增数据</h4>
        <div class="form-actions">
          <el-button size="small" @click="cancelAdd">取消</el-button>
          <el-button size="small" type="primary" @click="confirmAdd">确认添加</el-button>
        </div>
      </div>
      <div class="form-body">
        <div v-for="col in columns" :key="col.key" class="form-item">
          <label>{{ col.label }}</label>
          <template v-if="col.type === 'select' && col.options">
            <el-select v-model="newItemData[col.key]" style="width: 100%">
              <el-option
                v-for="opt in col.options"
                :key="String(opt.value)"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </template>
          <template v-else-if="col.type === 'boolean'">
            <el-switch v-model="newItemData[col.key]" />
          </template>
          <template v-else-if="col.type === 'number'">
            <el-input-number v-model="newItemData[col.key]" style="width: 100%" />
          </template>
          <template v-else>
            <el-input v-model="newItemData[col.key]" />
          </template>
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <el-table
      :data="filteredData"
      :row-key="rowKey || 'id'"
      border
      stripe
      @selection-change="handleSelectionChange"
    >
      <!-- 选择列 -->
      <el-table-column v-if="deletable" type="selection" width="50" />
      
      <!-- 数据列 -->
      <el-table-column
        v-for="col in columns"
        :key="col.key"
        :prop="col.key"
        :label="col.label"
        :width="col.width"
        :sortable="col.sortable"
      >
        <template #default="{ row }">
          <!-- 编辑模式 -->
          <template v-if="editingRow && editingRow[rowKey || 'id'] === row[rowKey || 'id'] && col.editable !== false">
            <template v-if="col.type === 'select' && col.options">
              <el-select v-model="editingData[col.key]" size="small" style="width: 100%">
                <el-option
                  v-for="opt in col.options"
                  :key="String(opt.value)"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </template>
            <template v-else-if="col.type === 'boolean'">
              <el-switch v-model="editingData[col.key]" size="small" />
            </template>
            <template v-else-if="col.type === 'number'">
              <el-input-number v-model="editingData[col.key]" size="small" style="width: 100%" />
            </template>
            <template v-else>
              <el-input v-model="editingData[col.key]" size="small" />
            </template>
          </template>
          
          <!-- 显示模式 -->
          <template v-else>
            <template v-if="col.type === 'boolean'">
              <el-tag :type="row[col.key] ? 'success' : 'info'" size="small">
                {{ row[col.key] ? '是' : '否' }}
              </el-tag>
            </template>
            <template v-else-if="col.type === 'select' && col.options">
              {{ col.options.find(o => o.value === row[col.key])?.label || row[col.key] }}
            </template>
            <template v-else>
              {{ row[col.key] }}
            </template>
          </template>
        </template>
      </el-table-column>
      
      <!-- 操作列 -->
      <el-table-column v-if="editable || deletable" label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <template v-if="editingRow && editingRow[rowKey || 'id'] === row[rowKey || 'id']">
            <el-button type="primary" text size="small" @click="saveEdit">保存</el-button>
            <el-button text size="small" @click="cancelEdit">取消</el-button>
          </template>
          <template v-else>
            <el-button v-if="editable" type="primary" text size="small" @click="startEdit(row)">编辑</el-button>
            <el-button v-if="deletable" type="danger" text size="small" @click="deleteRow(row)">删除</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.data-table-editor {
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

/* 新增表单 */
.add-form {
  border-bottom: 1px solid #f0f0f0;
  background: #f9fafb;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #e8e8e8;
}

.form-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.form-body {
  padding: 16px 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

/* 表格样式 */
:deep(.el-table) {
  border-radius: 0 0 12px 12px;
}

:deep(.el-table th) {
  background: #f9fafb !important;
  font-weight: 600;
}

.mr-1 {
  margin-right: 4px;
}
</style>
