<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

interface CategoryDefinition {
  originalName: string  // Excel中的原始名称
  name: string          // 用户定义的分类名称
  imageName: string     // 图片文件名
  description: string   // 描述
}

const props = defineProps<{
  visible: boolean
  undefinedCategories: string[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm', categories: CategoryDefinition[]): void
  (e: 'skip'): void
  (e: 'cancel'): void
}>()

// 分类定义表单
const categoryForms = ref<CategoryDefinition[]>([])

// 初始化表单
watch(() => props.undefinedCategories, (newVal) => {
  if (newVal && newVal.length > 0) {
    categoryForms.value = newVal.map(name => ({
      originalName: name,
      name: name,  // 默认使用原始名称
      imageName: '',
      description: ''
    }))
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
  emit('confirm', categoryForms.value)
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
            <span class="category-index">{{ index + 1 }}</span>
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
            <el-form-item label="图片文件">
              <el-input
                v-model="form.imageName"
                placeholder="如: new-category.png（可选）"
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
  border: 1px solid #e8e8e8;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #ddd;
}

.category-index {
  width: 24px;
  height: 24px;
  background: #667eea;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
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
