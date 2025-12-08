<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useBrandStore } from '@/stores/brandStore'
import { useAdminStore } from '@/stores/adminStore'
import { ElMessage, ElMessageBox } from 'element-plus'

const brandStore = useBrandStore()
const adminStore = useAdminStore()

// 本地数据副本
const localData = ref<any[]>([])

// 当前显示的分类
const currentCategory = ref<'own' | 'agent'>('own')

// 搜索关键词
const searchQuery = ref('')

// 编辑面板状态
const editPanelVisible = ref(false)
const editingItem = ref<any>(null)
const editFormData = ref<any>({})
const isAddMode = ref(false)

// 图片预览
const previewVisible = ref(false)
const previewUrl = ref('')

// 选中的行
const selectedRows = ref<any[]>([])

// 选择变化
const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

// 批量删除
const batchDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的品牌')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 个品牌吗？`,
      '提示',
      { type: 'warning' }
    )
    
    const ids = selectedRows.value.map(row => row.id)
    localData.value = localData.value.filter(item => !ids.includes(item.id))
    selectedRows.value = []
    ElMessage.success('批量删除成功')
    
    adminStore.addActivity({
      type: 'modify',
      target: 'brands',
      description: `批量删除了 ${ids.length} 个品牌`
    })
  } catch {
    // 用户取消
  }
}

// 国家选项
const countryOptions = [
  { label: '中国', value: '中国' },
  { label: '美国', value: '美国' },
  { label: '日本', value: '日本' },
  { label: '德国', value: '德国' },
  { label: '英国', value: '英国' },
  { label: '法国', value: '法国' },
  { label: '瑞士', value: '瑞士' },
  { label: '韩国', value: '韩国' }
]

// 初始化本地数据
const initLocalData = () => {
  localData.value = JSON.parse(JSON.stringify(brandStore.brands))
}

// 自主品牌列表（按 sort_order 排序）
const ownBrands = computed(() => {
  return localData.value
    .filter(b => b.is_own_brand === true)
    .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999))
})

// 代理品牌列表（按 sort_order 排序）
const agentBrands = computed(() => {
  return localData.value
    .filter(b => b.is_own_brand !== true)
    .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999))
})


// 当前显示的品牌列表
const currentBrands = computed(() => {
  const list = currentCategory.value === 'own' ? ownBrands.value : agentBrands.value
  if (!searchQuery.value.trim()) return list
  
  const query = searchQuery.value.toLowerCase()
  return list.filter(item => 
    item.name?.toLowerCase().includes(query) ||
    item.country?.toLowerCase().includes(query) ||
    item.description?.toLowerCase().includes(query)
  )
})

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

// 上移品牌
const moveBrandUp = (brand: any) => {
  const list = currentCategory.value === 'own' ? ownBrands.value : agentBrands.value
  const index = list.findIndex(b => b.id === brand.id)
  if (index <= 0) return
  
  // 交换 sort_order
  const prevBrand = list[index - 1]
  const tempOrder = brand.sort_order
  brand.sort_order = prevBrand.sort_order
  prevBrand.sort_order = tempOrder
  
  ElMessage.success('上移成功')
}

// 下移品牌
const moveBrandDown = (brand: any) => {
  const list = currentCategory.value === 'own' ? ownBrands.value : agentBrands.value
  const index = list.findIndex(b => b.id === brand.id)
  if (index < 0 || index >= list.length - 1) return
  
  // 交换 sort_order
  const nextBrand = list[index + 1]
  const tempOrder = brand.sort_order
  brand.sort_order = nextBrand.sort_order
  nextBrand.sort_order = tempOrder
  
  ElMessage.success('下移成功')
}

// 重新计算排序值（确保连续且不重复）
const recalculateSortOrder = () => {
  ownBrands.value.forEach((brand, index) => {
    brand.sort_order = index + 1
  })
  agentBrands.value.forEach((brand, index) => {
    brand.sort_order = index + 1
  })
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
  
  // 生成新ID
  const maxIdNum = localData.value.reduce((max, item) => {
    const num = parseInt(item.id?.replace('B', '') || '0')
    return Math.max(max, num)
  }, 0)
  
  // 计算新的 sort_order
  const currentList = currentCategory.value === 'own' ? ownBrands.value : agentBrands.value
  const maxSortOrder = currentList.reduce((max, item) => Math.max(max, item.sort_order || 0), 0)
  
  editFormData.value = {
    id: `B${String(maxIdNum + 1).padStart(3, '0')}`,
    name: '',
    logo_url: '',
    certificate_url: '',
    is_own_brand: currentCategory.value === 'own',
    description: '',
    country: '中国',
    sort_order: maxSortOrder + 1,
    website: ''
  }
  
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
  if (!editFormData.value.name) {
    ElMessage.warning('请填写品牌名称')
    return
  }
  
  if (isAddMode.value) {
    localData.value.push({ ...editFormData.value })
    ElMessage.success('添加成功')
    
    adminStore.addActivity({
      type: 'modify',
      target: 'brands',
      description: `添加了新品牌: ${editFormData.value.name}`
    })
  } else {
    const index = localData.value.findIndex(item => item.id === editingItem.value.id)
    if (index > -1) {
      // 如果 is_own_brand 改变了，需要重新计算 sort_order
      const oldIsOwn = localData.value[index].is_own_brand
      const newIsOwn = editFormData.value.is_own_brand
      
      if (oldIsOwn !== newIsOwn) {
        // 分类改变，放到新分类的最后
        const targetList = newIsOwn ? ownBrands.value : agentBrands.value
        const maxSortOrder = targetList.reduce((max, item) => Math.max(max, item.sort_order || 0), 0)
        editFormData.value.sort_order = maxSortOrder + 1
      }
      
      localData.value[index] = { ...editFormData.value }
      ElMessage.success('保存成功')
      
      adminStore.addActivity({
        type: 'modify',
        target: 'brands',
        description: `更新了品牌: ${editFormData.value.name}`
      })
    }
  }
  
  closeEditPanel()
}

// 删除品牌
const deleteBrand = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这个品牌吗？', '提示', {
      type: 'warning'
    })
    
    const index = localData.value.findIndex(item => item.id === row.id)
    if (index > -1) {
      localData.value.splice(index, 1)
      ElMessage.success('删除成功')
      
      adminStore.addActivity({
        type: 'modify',
        target: 'brands',
        description: `删除了品牌: ${row.name}`
      })
    }
  } catch {
    // 用户取消
  }
}

// 保存所有更改
const saveAll = () => {
  // 重新计算排序值确保不重复
  recalculateSortOrder()
  
  // 更新 store
  brandStore.brands.splice(0, brandStore.brands.length, ...localData.value)
  
  adminStore.addActivity({
    type: 'modify',
    target: 'brands',
    description: `保存了品牌列表数据，共 ${localData.value.length} 条`
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
  link.download = `brands-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
}

// 监听 store 数据变化
watch(() => brandStore.brands, () => {
  initLocalData()
}, { deep: true })

onMounted(async () => {
  await brandStore.loadBrands()
  initLocalData()
})
</script>


<template>
  <div class="brands-list-editor">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <h3>品牌列表</h3>
        <el-radio-group v-model="currentCategory" size="default">
          <el-radio-button value="own">
            自主品牌 ({{ ownBrands.length }})
          </el-radio-button>
          <el-radio-button value="agent">
            代理品牌 ({{ agentBrands.length }})
          </el-radio-button>
        </el-radio-group>
      </div>
      <div class="toolbar-right">
        <el-input
          v-model="searchQuery"
          placeholder="搜索品牌名称、国家..."
          clearable
          style="width: 200px"
        >
          <template #prefix>
            <i class="fas fa-search"></i>
          </template>
        </el-input>
        
        <el-button type="primary" @click="openAddPanel">
          <i class="fas fa-plus mr-1"></i> 新增
        </el-button>
        <el-button v-if="selectedRows.length > 0" type="danger" @click="batchDelete">
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

    <!-- 提示信息 -->
    <div class="sort-tip">
      <i class="fas fa-info-circle"></i>
      使用上移/下移按钮调整品牌显示顺序，调整后请点击"保存全部"
    </div>

    <!-- 品牌表格 -->
    <el-table :data="currentBrands" border stripe style="width: 100%" @selection-change="handleSelectionChange">
      <!-- 选择列 -->
      <el-table-column type="selection" width="50" fixed="left" />
      
      <!-- 排序列 -->
      <el-table-column label="排序" width="100" header-align="left" align="center">
        <template #default="{ row, $index }">
          <div class="sort-buttons">
            <el-button
              :disabled="$index === 0"
              size="small"
              circle
              @click="moveBrandUp(row)"
            >
              <i class="fas fa-arrow-up"></i>
            </el-button>
            <el-button
              :disabled="$index === currentBrands.length - 1"
              size="small"
              circle
              @click="moveBrandDown(row)"
            >
              <i class="fas fa-arrow-down"></i>
            </el-button>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column prop="id" label="ID" width="70" />
      
      <el-table-column prop="name" label="品牌名称" width="120" />
      
      <el-table-column label="Logo" width="70">
        <template #default="{ row }">
          <div 
            v-if="row.logo_url" 
            class="image-cell"
            @click="handlePreviewImage(row.logo_url)"
          >
            <img :src="getImageUrl(row.logo_url)" alt="Logo" />
          </div>
          <span v-else class="no-image">暂无</span>
        </template>
      </el-table-column>
      
      <el-table-column label="授权证书" width="90">
        <template #default="{ row }">
          <div 
            v-if="row.certificate_url" 
            class="image-cell"
            @click="handlePreviewImage(row.certificate_url)"
          >
            <img :src="getImageUrl(row.certificate_url)" alt="授权证书" />
          </div>
          <span v-else class="no-image">暂无</span>
        </template>
      </el-table-column>
      
      <el-table-column label="自有" width="60" align="center">
        <template #default="{ row }">
          <el-tag :type="row.is_own_brand ? 'success' : 'info'" size="small">
            {{ row.is_own_brand ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="country" label="国家" width="70" />
      
      <el-table-column prop="description" label="品牌简介" min-width="250" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="truncate-text">
            {{ row.description?.substring(0, 80) }}{{ row.description?.length > 80 ? '...' : '' }}
          </span>
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="120" fixed="right" align="center">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button type="primary" link size="small" @click="openEditPanel(row)">
              编辑
            </el-button>
            <el-button type="danger" link size="small" @click="deleteBrand(row)">
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>


    <!-- 编辑面板 -->
    <el-drawer
      v-model="editPanelVisible"
      :title="isAddMode ? '新增品牌' : '编辑品牌'"
      size="520px"
      :close-on-click-modal="false"
    >
      <div class="edit-form">
        <el-form label-position="top">
          <el-form-item label="品牌ID">
            <el-input v-model="editFormData.id" disabled />
          </el-form-item>
          
          <el-form-item label="品牌名称" required>
            <el-input v-model="editFormData.name" placeholder="请输入品牌名称" />
          </el-form-item>
          
          <el-form-item label="国家">
            <el-select v-model="editFormData.country" style="width: 100%">
              <el-option
                v-for="opt in countryOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="自有品牌">
            <el-switch v-model="editFormData.is_own_brand" />
            <span class="switch-tip">切换后品牌将移动到对应分类</span>
          </el-form-item>
          
          <el-form-item label="Logo图片">
            <div class="image-input-wrapper">
              <el-input v-model="editFormData.logo_url" placeholder="输入图片路径" />
              <div v-if="editFormData.logo_url" class="image-preview">
                <img :src="getImageUrl(editFormData.logo_url)" alt="预览" />
              </div>
            </div>
          </el-form-item>
          
          <el-form-item label="授权证书">
            <div class="image-input-wrapper">
              <el-input v-model="editFormData.certificate_url" placeholder="输入图片路径" />
              <div v-if="editFormData.certificate_url" class="image-preview">
                <img :src="getImageUrl(editFormData.certificate_url)" alt="预览" />
              </div>
            </div>
          </el-form-item>
          
          <el-form-item label="官方网站">
            <el-input v-model="editFormData.website" placeholder="输入官方网站地址" />
          </el-form-item>
          
          <el-form-item label="品牌简介">
            <el-input
              v-model="editFormData.description"
              type="textarea"
              :rows="6"
              placeholder="请输入品牌简介"
            />
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
.brands-list-editor {
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

.sort-tip i {
  margin-right: 6px;
}

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
  object-fit: contain;
  padding: 2px;
}

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

.edit-form {
  padding: 0 10px;
}

.switch-tip {
  margin-left: 10px;
  font-size: 12px;
  color: #999;
}

.image-input-wrapper {
  width: 100%;
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

.mr-1 {
  margin-right: 4px;
}

:deep(.el-table th) {
  background: #f9fafb !important;
  font-weight: 600;
}
</style>
