<script setup lang="ts">
/**
 * 新分类定义对话框
 * 
 * 用于在导入产品时，为 Excel 中未定义的分类创建新分类
 * 
 * 关键逻辑：
 * 1. 使用 imageId 而不是 imageName 来关联图片
 * 2. 图片选择需要排除：
 *    - 现有分类已使用的图片（从 API 获取）
 *    - 当前对话框中其他新分类已选择的图片
 * 3. 每个图片只能被一个分类使用（一对一关系）
 */
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import CategoryImagePicker from '@/components/admin/CategoryImagePicker.vue'

interface CategoryDefinition {
  originalName: string  // Excel中的原始名称
  name: string          // 用户定义的分类名称
  imageId: number | null // 图片ID（新架构）
  description: string   // 描述
  previewId?: string    // 预览ID（将要分配的ID）
}

const props = defineProps<{
  visible: boolean
  undefinedCategories: string[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm', categories: Array<{ originalName: string; name: string; imageId: number | null; description: string }>): void
  (e: 'skip'): void
  (e: 'cancel'): void
}>()

// 分类定义表单
const categoryForms = ref<CategoryDefinition[]>([])
const loadingIds = ref(false)

// 现有分类已使用的图片映射（从 API 获取）
const existingUsedImages = ref<Map<number, string>>(new Map())

// 加载现有分类的图片使用情况
const loadExistingUsedImages = async () => {
  try {
    const token = localStorage.getItem('admin_token') || ''
    const res = await fetch('/api/admin/category/with-count', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      const result = await res.json()
      const map = new Map<number, string>()
      result.data?.forEach((cat: { id: string; imageId: number | null }) => {
        if (cat.imageId) {
          map.set(cat.imageId, cat.id)
        }
      })
      existingUsedImages.value = map
    }
  } catch (e) {
    console.warn('加载现有分类图片使用情况失败:', e)
  }
}

// 计算某个分类的已使用图片映射（包括现有分类 + 当前对话框中其他新分类已选择的）
const getUsedImagesMapForCategory = (currentIndex: number): Map<number, string> => {
  const map = new Map(existingUsedImages.value)
  
  // 添加当前对话框中其他新分类已选择的图片
  categoryForms.value.forEach((form, index) => {
    if (index !== currentIndex && form.imageId) {
      map.set(form.imageId, form.previewId || `新分类${index + 1}`)
    }
  })
  
  return map
}

// 获取预览ID
const fetchPreviewIds = async () => {
  loadingIds.value = true
  try {
    const token = localStorage.getItem('admin_token') || ''
    const res = await fetch('/api/admin/category/generate-id', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      const result = await res.json()
      const baseId = result.id // 如 "C06"
      const baseNum = parseInt(baseId.replace('C', ''), 10)
      
      // 为每个分类分配预览ID
      categoryForms.value.forEach((form, index) => {
        form.previewId = `C${(baseNum + index).toString().padStart(2, '0')}`
      })
    }
  } catch (e) {
    console.warn('获取预览ID失败:', e)
  } finally {
    loadingIds.value = false
  }
}

// 初始化表单
watch(() => props.undefinedCategories, async (newVal) => {
  if (newVal && newVal.length > 0) {
    categoryForms.value = newVal.map(name => ({
      originalName: name,
      name: name,  // 默认使用原始名称
      imageId: null,
      description: '',
      previewId: '...'
    }))
    // 加载现有分类的图片使用情况
    await loadExistingUsedImages()
    // 获取预览ID
    await fetchPreviewIds()
  }
}, { immediate: true })

// 是否所有分类都已填写名称
const isValid = computed(() => {
  return categoryForms.value.every(form => form.name.trim().length > 0)
})

// 确认创建分类
const handleConfirm = () => {
  if (!isValid.value) {
    ElMessage.warning('请填写所有分类名称')
    return
  }
  
  // 转换为输出格式
  const categories = categoryForms.value.map(form => ({
    originalName: form.originalName,
    name: form.name,
    imageId: form.imageId,
    description: form.description
  }))
  
  emit('confirm', categories)
  emit('update:visible', false)
}

// 跳过（将产品设为未分类）
const handleSkip = () => {
  emit('skip')
  emit('update:visible', false)
}

// 取消导入
const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}

// 关闭弹窗
const handleClose = () => {
  emit('update:visible', false)
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="检测到新分类"
    width="600px"
    :close-on-click-modal="false"
    @update:model-value="handleClose"
  >
    <div class="dialog-content">
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        class="mb-4"
      >
        <template #title>
          Excel文件中包含 {{ undefinedCategories.length }} 个未定义的分类
        </template>
        <template #default>
          您可以选择：创建这些分类、跳过（产品将设为"未分类"）、或取消导入
        </template>
      </el-alert>

      <div class="category-list">
        <div
          v-for="(form, index) in categoryForms"
          :key="form.originalName"
          class="category-item"
        >
          <div class="category-header">
            <span class="category-id" :class="{ loading: loadingIds }">
              {{ form.previewId || '...' }}
            </span>
            <span class="original-name">原始值: "{{ form.originalName }}"</span>
          </div>
          
          <el-form :model="form" label-width="80px" size="small">
            <el-form-item label="分类名称" required>
              <el-input
                v-model="form.name"
                placeholder="请输入分类名称"
                maxlength="20"
                show-word-limit
              />
            </el-form-item>
            <el-form-item label="分类图片">
              <CategoryImagePicker
                v-model="form.imageId"
                placeholder="点击选择分类图片（可选）"
                :used-images-map="getUsedImagesMapForCategory(index)"
                :current-category-id="form.previewId"
              />
            </el-form-item>
            <el-form-item label="描述">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="2"
                placeholder="分类描述（可选）"
                maxlength="100"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消导入</el-button>
        <el-button type="warning" @click="handleSkip">
          跳过（设为未分类）
        </el-button>
        <el-button type="primary" @click="handleConfirm" :disabled="!isValid">
          创建分类并继续
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-content {
  max-height: 60vh;
  overflow-y: auto;
}

.mb-4 {
  margin-bottom: 16px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category-item {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--admin-border);
}

.category-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #ddd;
}

.category-id {
  padding: 4px 10px;
  background: #05548C;
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  font-family: monospace;
  min-width: 40px;
  text-align: center;
}

.category-id.loading {
  background: #c0c4cc;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.original-name {
  color: #666;
  font-size: 13px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
