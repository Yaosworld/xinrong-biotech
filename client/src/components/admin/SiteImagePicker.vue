<script setup lang="ts">
/**
 * 网站图片选择器
 * 
 * 功能：
 * 1. 从网站图片库中选择图片（Logo、二维码等）
 * 2. 支持上传新图片
 * 3. 显示图片预览
 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface ImageItem {
  id: number
  filename: string
  url: string
  usageCount: number
}

const props = defineProps<{
  modelValue: string  // 图片URL路径
  placeholder?: string
  label?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const imageLibrary = ref<ImageItem[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const uploadingFiles = ref<File[]>([])
const isUploading = ref(false)

// 当前选中的图片URL
const selectedUrl = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 当前选中的图片信息
const selectedImage = computed(() => {
  if (!selectedUrl.value) return null
  return imageLibrary.value.find(img => img.url === selectedUrl.value)
})

// 加载图片库
const loadImageLibrary = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('admin_token') || ''
    const res = await fetch('/api/admin/site-images/list', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (!res.ok) throw new Error('加载失败')
    const result = await res.json()
    imageLibrary.value = result.data || []
  } catch (e) {
    console.error('加载图片库失败:', e)
    imageLibrary.value = []
  } finally {
    loading.value = false
  }
}

// 选择图片
const selectImage = (img: ImageItem) => {
  selectedUrl.value = img.url
  dialogVisible.value = false
}

// 打开选择器
const openPicker = () => {
  dialogVisible.value = true
  loadImageLibrary()
}

// 清除选择
const clearSelection = () => {
  selectedUrl.value = ''
}

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files) {
    uploadingFiles.value = Array.from(input.files)
  }
  input.value = ''
}

// 上传文件
const uploadFiles = async () => {
  if (uploadingFiles.value.length === 0) return
  
  isUploading.value = true
  try {
    const token = localStorage.getItem('admin_token') || ''
    const formData = new FormData()
    
    for (const file of uploadingFiles.value) {
      formData.append('files', file)
    }
    
    const res = await fetch('/api/admin/site-images/batch-upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    
    const result = await res.json()
    
    if (result.successCount > 0) {
      ElMessage.success(`成功上传 ${result.successCount} 张图片`)
      uploadingFiles.value = []
      await loadImageLibrary()
    }
    
    if (result.errorCount > 0) {
      ElMessage.warning(`${result.errorCount} 张图片上传失败`)
    }
  } catch (e) {
    ElMessage.error('上传失败')
  } finally {
    isUploading.value = false
  }
}

// 删除图片
const deleteImage = async (img: ImageItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除图片「${img.filename}」吗？`,
      '删除确认',
      { type: 'warning' }
    )
    
    const token = localStorage.getItem('admin_token') || ''
    const res = await fetch(`/api/admin/site-images/${img.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (res.ok) {
      ElMessage.success('删除成功')
      if (selectedUrl.value === img.url) {
        selectedUrl.value = ''
      }
      await loadImageLibrary()
    } else {
      ElMessage.error('删除失败')
    }
  } catch {
    // 用户取消
  }
}

// 取消上传
const cancelUpload = () => {
  uploadingFiles.value = []
}

// 初始加载
onMounted(() => {
  loadImageLibrary()
})
</script>

<template>
  <div class="site-image-picker">
    <!-- 当前选中的图片预览 -->
    <div class="picker-preview" @click="openPicker">
      <div v-if="selectedUrl" class="preview-image">
        <img :src="selectedUrl" alt="已选图片" />
        <span class="image-name">{{ selectedImage?.filename || '已选择' }}</span>
        <el-button 
          class="clear-btn" 
          type="danger" 
          size="small" 
          circle 
          @click.stop="clearSelection"
        >
          <i class="fas fa-times"></i>
        </el-button>
      </div>
      <div v-else class="preview-placeholder">
        <i class="fas fa-image"></i>
        <span>{{ placeholder || '点击选择图片' }}</span>
      </div>
    </div>

    <!-- 图片选择对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="label || '选择图片'"
      width="700px"
      :close-on-click-modal="true"
    >
      <!-- 上传区域 -->
      <div class="upload-section">
        <div v-if="uploadingFiles.length === 0" class="upload-trigger">
          <input type="file" accept="image/*" multiple @change="handleFileSelect" />
          <i class="fas fa-cloud-upload-alt"></i>
          <span>点击上传新图片</span>
        </div>
        <div v-else class="upload-preview">
          <div class="upload-files">
            <span v-for="f in uploadingFiles" :key="f.name" class="upload-file">
              {{ f.name }}
            </span>
          </div>
          <div class="upload-actions">
            <el-button size="small" @click="cancelUpload">取消</el-button>
            <el-button type="primary" size="small" :loading="isUploading" @click="uploadFiles">
              上传 ({{ uploadingFiles.length }})
            </el-button>
          </div>
        </div>
      </div>

      <!-- 图片网格 -->
      <div v-loading="loading" class="image-grid">
        <div v-if="imageLibrary.length === 0 && !loading" class="empty-tip">
          <i class="fas fa-inbox"></i>
          <p>暂无图片，请先上传</p>
        </div>
        <div
          v-for="img in imageLibrary"
          :key="img.id"
          class="image-item"
          :class="{ selected: selectedUrl === img.url }"
        >
          <div class="image-wrapper" @click="selectImage(img)">
            <img :src="img.url" :alt="img.filename" />
            <div v-if="selectedUrl === img.url" class="selected-mark">
              <i class="fas fa-check"></i>
            </div>
            <div v-if="img.usageCount > 0" class="usage-badge">
              使用中
            </div>
          </div>
          <div class="image-footer">
            <span class="image-label" :title="img.filename">{{ img.filename }}</span>
            <el-button
              type="danger"
              link
              size="small"
              class="delete-btn"
              @click.stop="deleteImage(img)"
            >
              <i class="fas fa-trash"></i>
            </el-button>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <span class="tip">共 {{ imageLibrary.length }} 张图片</span>
          <el-button @click="dialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.site-image-picker {
  width: 100%;
}

.picker-preview {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.picker-preview:hover {
  border-color: var(--admin-primary);
  background: var(--admin-surface);
}

.preview-image {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  position: relative;
}

.preview-image img {
  width: 60px;
  height: 60px;
  object-fit: contain;
  border-radius: 6px;
  background: var(--admin-surface-alt);
  padding: 4px;
}

.preview-image .image-name {
  flex: 1;
  font-size: 13px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-image .clear-btn {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #c0c4cc;
}

.preview-placeholder i {
  font-size: 24px;
}

.preview-placeholder span {
  font-size: 13px;
}

/* 上传区域 */
.upload-section {
  margin-bottom: 16px;
  padding: 16px;
  background: var(--admin-surface);
  border-radius: 8px;
}

.upload-trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 2px dashed #dcdfe6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #909399;
}

.upload-trigger:hover {
  border-color: var(--admin-primary);
  color: var(--admin-primary);
}

.upload-trigger input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.upload-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.upload-files {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.upload-file {
  padding: 4px 8px;
  background: #fff;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}

.upload-actions {
  display: flex;
  gap: 8px;
}

/* 图片网格 */
.image-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
  min-height: 200px;
}

.empty-tip {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #c0c4cc;
}

.empty-tip i {
  font-size: 48px;
  margin-bottom: 12px;
}

.image-item {
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
  background: #fff;
}

.image-item:hover {
  border-color: var(--admin-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.image-item.selected {
  border-color: var(--admin-accent);
}

.image-wrapper {
  position: relative;
  padding: 12px;
  cursor: pointer;
  aspect-ratio: 4/3;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--admin-surface-alt);
}

.image-wrapper img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-top: 1px solid var(--admin-border);
  background: #fff;
}

.image-label {
  font-size: 11px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.delete-btn {
  padding: 2px;
  font-size: 12px;
}

.selected-mark {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  background: var(--admin-accent);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 11px;
}

.usage-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 2px 6px;
  background: var(--admin-primary);
  border-radius: 4px;
  color: #fff;
  font-size: 10px;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-footer .tip {
  font-size: 12px;
  color: #909399;
}
</style>
