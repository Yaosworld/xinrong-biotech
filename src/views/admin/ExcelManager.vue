<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAdminStore } from '@/stores/adminStore'

const adminStore = useAdminStore()

// 文件类型选项
const fileTypes = [
  { value: 'products', label: '产品数据', icon: 'Box' },
  { value: 'categories', label: '分类数据', icon: 'Folder' },
  { value: 'brands', label: '品牌数据', icon: 'Star' },
  { value: 'promotions', label: '促销活动', icon: 'Bell' }
]

// 当前选择的文件类型
const selectedType = ref('products')

// 上传的文件
const uploadedFile = ref<File | null>(null)

// 解析后的数据
const parsedData = ref<any[]>([])

// 是否正在处理
const isProcessing = ref(false)

// 处理文件上传
const handleFileChange = async (uploadFile: any) => {
  if (!uploadFile?.raw) return
  
  uploadedFile.value = uploadFile.raw
  isProcessing.value = true
  
  try {
    // 动态导入xlsx库
    const XLSX = await import('xlsx')
    
    // 读取文件
    const arrayBuffer = await uploadedFile.value.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer)
    
    // 获取第一个工作表
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    
    // 转换为JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet)
    parsedData.value = jsonData
    
    ElMessage.success(`成功解析 ${jsonData.length} 条数据`)
    
    // 记录活动
    adminStore.addActivity({
      type: 'upload',
      target: selectedType.value,
      description: `上传了 ${selectedType.value} Excel文件，包含 ${jsonData.length} 条数据`
    })
  } catch (error) {
    ElMessage.error('文件解析失败，请检查文件格式')
    console.error(error)
  } finally {
    isProcessing.value = false
  }
}

// 下载JSON文件
const downloadJson = () => {
  if (parsedData.value.length === 0) {
    ElMessage.warning('没有可下载的数据')
    return
  }
  
  const jsonStr = JSON.stringify(parsedData.value, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `${selectedType.value}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  
  ElMessage.success('JSON文件已下载')
  
  // 记录活动
  adminStore.addActivity({
    type: 'download',
    target: selectedType.value,
    description: `下载了 ${selectedType.value}.json 文件`
  })
}

// 清空数据
const clearData = async () => {
  try {
    await ElMessageBox.confirm('确定要清空当前解析的数据吗？', '提示', {
      type: 'warning'
    })
    
    uploadedFile.value = null
    parsedData.value = []
    ElMessage.success('数据已清空')
  } catch {
    // 用户取消
  }
}

// 获取表格列
const getColumns = () => {
  if (parsedData.value.length === 0) return []
  return Object.keys(parsedData.value[0])
}
</script>

<template>
  <div class="excel-manager">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-gray-800 mb-2">Excel数据管理</h2>
      <p class="text-gray-500">上传Excel文件，转换为JSON数据并下载</p>
    </div>
    
    <!-- 操作区 -->
    <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div class="flex flex-wrap items-center gap-4 mb-6">
        <!-- 数据类型选择 -->
        <el-select v-model="selectedType" placeholder="选择数据类型" style="width: 200px">
          <el-option
            v-for="type in fileTypes"
            :key="type.value"
            :label="type.label"
            :value="type.value"
          >
            <div class="flex items-center">
              <el-icon class="mr-2"><component :is="type.icon" /></el-icon>
              <span>{{ type.label }}</span>
            </div>
          </el-option>
        </el-select>
        
        <!-- 文件上传 -->
        <el-upload
          :show-file-list="false"
          accept=".xlsx,.xls"
          :auto-upload="false"
          :on-change="handleFileChange"
        >
          <el-button type="primary" :loading="isProcessing">
            <el-icon class="mr-1"><Upload /></el-icon>
            上传Excel文件
          </el-button>
        </el-upload>
        
        <!-- 下载JSON -->
        <el-button
          type="success"
          :disabled="parsedData.length === 0"
          @click="downloadJson"
        >
          <el-icon class="mr-1"><Download /></el-icon>
          下载JSON
        </el-button>
        
        <!-- 清空数据 -->
        <el-button
          type="danger"
          plain
          :disabled="parsedData.length === 0"
          @click="clearData"
        >
          <el-icon class="mr-1"><Delete /></el-icon>
          清空
        </el-button>
      </div>
      
      <!-- 上传说明 -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex items-start">
          <el-icon class="text-blue-500 mt-1 mr-3"><InfoFilled /></el-icon>
          <div class="text-sm text-blue-700">
            <p class="font-medium mb-1">上传说明</p>
            <ul class="list-disc list-inside space-y-1 text-blue-600">
              <li>支持 .xlsx 和 .xls 格式的Excel文件</li>
              <li>将读取第一个工作表的数据</li>
              <li>第一行应为表头，后续行为数据</li>
              <li>下载后的JSON文件需手动替换到 public/data/ 目录</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 数据预览 -->
    <div v-if="parsedData.length > 0" class="bg-white rounded-xl shadow-sm p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-800">
          数据预览 (共 {{ parsedData.length }} 条)
        </h3>
      </div>
      
      <el-table
        :data="parsedData.slice(0, 50)"
        stripe
        border
        max-height="500"
        style="width: 100%"
      >
        <el-table-column
          v-for="col in getColumns()"
          :key="col"
          :prop="col"
          :label="col"
          min-width="150"
          show-overflow-tooltip
        />
      </el-table>
      
      <div v-if="parsedData.length > 50" class="mt-4 text-center text-gray-500">
        仅显示前50条数据，共 {{ parsedData.length }} 条
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="bg-white rounded-xl shadow-sm p-12 text-center">
      <el-icon class="text-6xl text-gray-300 mb-4"><Document /></el-icon>
      <p class="text-gray-500">上传Excel文件后，数据将在此处预览</p>
    </div>
  </div>
</template>

