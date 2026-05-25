<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useProductStore } from '@/stores/productStore'
import { useAdminStore } from '@/stores/adminStore'
import { useCategoryStore } from '@/stores/categoryStore'
import UnifiedTableEditor from '../components/UnifiedTableEditor.vue'
import NewCategoryDialog from './NewCategoryDialog.vue'
import { getCategoryImagePath } from '@/hooks/useCategoryImage'
import { ExcelProcessor, PendingCategoryError } from '@/utils/excelProcessor'
import { adminApi } from '@/api/contentApi'

const productStore = useProductStore()
const adminStore = useAdminStore()
const categoryStore = useCategoryStore()

// 本地数据（从 Admin API 加载，包含草稿）
const localProducts = ref<any[]>([])
const loading = ref(false)

// 新分类弹窗状态
const newCategoryDialogVisible = ref(false)
const pendingUndefinedCategories = ref<string[]>([])
const pendingImportFile = ref<File | null>(null)
const tableEditorRef = ref<InstanceType<typeof UnifiedTableEditor> | null>(null)

// 产品数据 - 直接使用 localProducts，不再预计算 categoryImage
// categoryImage 改为通过列配置的 getValue 函数动态获取
const products = computed(() => localProducts.value)

// 分类选项（从 store 动态获取）
const categoryOptions = computed(() => {
  return categoryStore.categories.map(c => ({ label: c.name, value: c.id }))
})

// 列配置
// 注意：sortable 列会自动增加24px给排序箭头
// required 标记与 ExcelProcessor.validateProductData 中的必填字段保持一致
// 修复：categoryOptions 直接使用 computed 引用，确保响应性更新
const columns = computed(() => [
  { key: 'id', label: 'ID', width: 65, editable: false, sortable: true, fixed: 'left' as const },
  { 
    key: 'categoryImage', 
    label: '分类图', 
    width: 70, 
    type: 'image' as const, 
    editable: false, 
    imageStyle: 'contain' as const, 
    showInForm: false,
    // 动态获取分类图片，确保修改 categoryId 后图片立即更新
    getValue: (row: any) => getCategoryImagePath(row.categoryId)
  },
  { key: 'name', label: '产品名称', width: { min: 100, flex: 1.5 }, required: true },
  { key: 'sku', label: '货号', width: { min: 110, flex: 2 } },
  { key: 'brand', label: '品牌', width: { min: 100, flex: 1.5 } },
  { 
    key: 'price', 
    label: '价格', 
    width: { min: 140, flex: 1.2 },
    placeholder: '如：¥299/盒 或 面议'
  },
  { 
    key: 'categoryId', 
    label: '分类', 
    width: 120,
    type: 'select' as const,
    required: true,
    // 直接在 computed 内部访问 categoryOptions.value，确保响应性
    options: [...categoryOptions.value]
  },
  { key: 'specs', label: '规格', width: 75, truncate: 12, required: true },
  { key: 'unit', label: '单位', width: 55 },
  { key: 'desc', label: '描述', width: { min: 150, flex: 3 }, type: 'textarea' as const, truncate: 40, required: true }
])

// Excel 导入处理 - 返回包含 warnings 的结果，并传入已存在的 ID 避免冲突
const handleExcelImport = async (file: File) => {
  // 先解析文件检测未定义分类
  const parseResult = await ExcelProcessor.parseExcelFile(file)
  if (!parseResult.success) {
    throw new Error(parseResult.error || '文件解析失败')
  }
  
  // 提取分类值并检测未定义分类
  const categoryValues = ExcelProcessor.extractCategoryValues(parseResult.data)
  const undefinedCategories = await ExcelProcessor.detectUndefinedCategories(categoryValues)
  
  // 如果有未定义分类，显示弹窗让用户处理
  if (undefinedCategories.length > 0) {
    pendingUndefinedCategories.value = undefinedCategories
    pendingImportFile.value = file
    newCategoryDialogVisible.value = true
    // 使用自定义错误类替代特殊字符串
    throw new PendingCategoryError(undefinedCategories)
  }
  
  // 没有未定义分类，正常处理
  return await processImportFile(file)
}

// 实际处理导入文件
const processImportFile = async (file: File, newCategoryMap?: Map<string, string>) => {
  const existingIds = localProducts.value.map(p => p.id).filter(Boolean)
  
  const result = await ExcelProcessor.processProducts(file, existingIds, { 
    skipCategoryValidation: !!newCategoryMap,
    newCategoryMap 
  })
  
  if (!result.success) {
    throw new Error(result.validation.errors.join('\n'))
  }
  
  // 如果有警告，显示给用户
  if (result.validation.warnings.length > 0) {
    ElMessage.warning({
      message: `导入成功，但有以下警告：\n${result.validation.warnings.slice(0, 3).join('\n')}${result.validation.warnings.length > 3 ? `\n...还有 ${result.validation.warnings.length - 3} 条警告` : ''}`,
      duration: 5000,
      showClose: true
    })
  }
  
  return result.data
}

// 处理新分类确认
const handleNewCategoryConfirm = async (categories: Array<{ originalName: string; name: string; imageId: number | null; description: string }>) => {
  if (!pendingImportFile.value) return
  
  try {
    // 批量创建新分类
    const token = localStorage.getItem('admin_token') || ''
    const newCategoryMap = new Map<string, string>()
    
    // 调用批量创建分类 API（使用 imageId 而不是 imageName）
    const res = await fetch('/api/admin/category/batch-create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        categories: categories.map(cat => ({
          name: cat.name,
          imageId: cat.imageId,  // 使用 imageId
          description: cat.description || ''
        }))
      })
    })
    
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || '创建分类失败')
    }
    
    const result = await res.json()
    
    // 建立原始名称到新ID的映射
    if (result.data && Array.isArray(result.data)) {
      result.data.forEach((created: { id: string; name: string }, index: number) => {
        const originalName = categories[index].originalName
        newCategoryMap.set(originalName, created.id)
        console.log(`分类映射: "${originalName}" -> ${created.id}`)
      })
    }
    
    // 刷新分类数据（确保 categoryStore 和 ExcelProcessor 能获取到新分类）
    await categoryStore.loadCategories()
    
    // 继续处理导入，传入新分类映射
    const importedData = await processImportFile(pendingImportFile.value, newCategoryMap)
    
    // 手动触发导入完成
    if (tableEditorRef.value && importedData.length > 0) {
      // 合并到本地数据
      localProducts.value = [...localProducts.value, ...importedData]
      ElMessage.success(`成功创建 ${categories.length} 个分类，导入 ${importedData.length} 条产品`)
    }
  } catch (e) {
    ElMessage.error('创建分类失败: ' + (e as Error).message)
  } finally {
    pendingImportFile.value = null
    pendingUndefinedCategories.value = []
  }
}

// 处理跳过新分类
const handleNewCategorySkip = async () => {
  if (!pendingImportFile.value) return
  
  try {
    // 跳过时，未定义分类的产品将被设为"未分类"(C00)
    const importedData = await processImportFile(pendingImportFile.value)
    
    if (tableEditorRef.value && importedData.length > 0) {
      localProducts.value = [...localProducts.value, ...importedData]
      ElMessage.success(`导入 ${importedData.length} 条产品，未定义分类已设为"未分类"`)
    }
  } catch (e) {
    ElMessage.error('导入失败: ' + (e as Error).message)
  } finally {
    pendingImportFile.value = null
    pendingUndefinedCategories.value = []
  }
}

// 处理取消导入
const handleNewCategoryCancel = () => {
  pendingImportFile.value = null
  pendingUndefinedCategories.value = []
  ElMessage.info('已取消导入')
}

// 保存前处理 - 移除 categoryImage
const beforeSave = (data: any[]) => {
  return data.map(({ categoryImage, ...rest }) => rest)
}

// 生成产品ID - 基于当前编辑器数据和 store 数据，避免 ID 冲突
// 使用 ExcelProcessor 中的统一方法，确保格式一致（P + 6位数字）
const generateProductId = (currentData: any[]) => {
  // 合并当前编辑器数据和本地管理数据，取最大值
  const allProducts = [...currentData, ...localProducts.value]
  const maxIdNum = allProducts.reduce((max, item) => {
    return Math.max(max, ExcelProcessor.extractProductIdNum(item.id))
  }, 0)
  return ExcelProcessor.generateProductId(maxIdNum + 1)
}

// 保存数据
const handleSave = (data: any[]) => {
  // 更新本地数据
  localProducts.value = [...data]
  adminStore.addActivity({
    type: 'modify',
    target: 'products',
    description: `保存了产品列表数据，共 ${data.length} 条`
  })
}

// 导入数据
const handleImport = (data: any[]) => {
  adminStore.addActivity({
    type: 'modify',
    target: 'products',
    description: `导入了 ${data.length} 条产品数据`
  })
}

// 发布后清除缓存
const handlePublish = () => {
  productStore.clearCache()
}

// 重新加载数据（版本回滚后调用）
const handleReload = async () => {
  await loadAdminData()
}

// 从 Admin API 加载数据（包含草稿）
const loadAdminData = async () => {
  loading.value = true
  try {
    // 从 Admin API 加载（优先使用草稿数据）
    const result = await adminApi.getList('product', { pageSize: 9999 })
    console.log(`[loadAdminData] API 返回 ${result.data.length} 条记录`)
    // 过滤掉空数据
    const products = result.data
      .map(item => item.draftData || item.publishedData)
      .filter(Boolean)
    console.log(`[loadAdminData] 过滤后 ${products.length} 条有效数据`)
    localProducts.value = products
  } catch (e) {
    console.error('Admin API 加载失败:', e)
    localProducts.value = []
    ElMessage.error('加载产品数据失败，请检查后台接口')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 每次进入页面都重新加载分类数据，确保获取最新的分类信息
  await categoryStore.loadCategories()
  await loadAdminData()
})
</script>

<template>
  <div>
    <UnifiedTableEditor
      ref="tableEditorRef"
      title="产品列表"
      :data="products"
      :columns="columns"
      row-key="id"
      search-placeholder="搜索名称、货号、品牌、规格、描述..."
      :page-size="12"
      :page-sizes="[12, 24, 48, 100]"
      :import-config="{ enabled: true, accept: '.xlsx,.xls', handler: handleExcelImport }"
      :publish-config="{ enabled: true, contentType: 'product' }"
      :before-save="beforeSave"
      :generate-id="generateProductId"
      @save="handleSave"
      @import="handleImport"
      @publish="handlePublish"
      @reload="handleReload"
    />
    
    <!-- 新分类定义弹窗 -->
    <NewCategoryDialog
      v-model:visible="newCategoryDialogVisible"
      :undefined-categories="pendingUndefinedCategories"
      @confirm="handleNewCategoryConfirm"
      @skip="handleNewCategorySkip"
      @cancel="handleNewCategoryCancel"
    />
  </div>
</template>
