<script setup lang="ts">
/**
 * 头像图片选择器
 * 
 * 功能：
 * 1. 从图片库中选择头像图片
 * 2. 支持上传新头像
 * 3. 显示图片预览和使用次数
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
  modelValue: number | null  // avatarId
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void
  (e: 'imageChange', imageInfo: { id: number | null; url: string; filename: string } | null): void
}>()

const imageLibrary = ref<ImageItem[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const uploadingFiles = ref<File[]>([])
const isUploading = ref(false)

// 当前选中的图片ID
const selectedImageId = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 当前选中的图片信息
const selectedImage = computed(() => {
  if (!selectedImageId.value) return null
  return imageLibrary.value.find(img => img.id === selectedImageId.value)
})

// 获取图片URL
const getImageUrl = (img: ImageItem | null) => {
  if (!img) return '/images/common/placeholder.png'
  return img.url || '/images/common/placeholder.png'
}

// 加载图片库
const loadImageLibrary = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('admin_token') || ''
    const res = await fetch('/api/admin/avatar-images/list', {
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
  selectedImageId.value = img.id
  emit('imageChange', { id: img.id, url: img.url, filename: img.filename })
  dialogVisible.value = false
}

// 打开选择器
const openPicker = () => {
  dialogVisible.value = true
  loadImageLibrary()
}

// 清除选择
const clearSelection = () => {
  selectedImageId.value = null
  emit('imageChange', null)
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
    
    const res = await fetch('/api/admin/avatar-images/batch-upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    
    const result = await res.json()
    
    if (result.successCount > 0) {
      ElMessage.success(`成功上传 ${result.successCount} 张头像图片`)
      uploadingFiles.value = []
      await loadImageLibrary()
    }
    
    if (result.errorCount > 0) {
      ElMessage.warning(`${result.errorCount} 张图片上传失败`)
    }
  } catch (e) {
    ElMessage.error('上传失败: ' + (e as Error).message)
  } finally {
    isUploading.value = false
  }
}

// 删除图片
const deleteImage = async (img: ImageItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除头像「${img.filename}」吗？${img.usageCount > 0 ? `该头像被 ${img.usageCount} 个管理员使用。` : ''}`,
      '删除确认',
      { type: 'warning' }
    )
    
    const token = localStorage.getItem('admin_token') || ''
    const res = await fetch(`/api/admin/avatar-images/${img.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (res.ok) {
      ElMessage.success('删除成功')
      if (selectedImageId.value === img.id) {
        selectedImageId.value = null
        emit('imageChange', null)
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
  <div class="avatar-image-picker">
    <!-- 当前选中的图片预览 -->
    <div class="picker-preview" @click="openPicker">
      <div v-if="selectedImage" class="preview-image">
        <img :src="getImageUrl(selectedImage)" :alt="selectedImage.filename" />
        <span class="image-name">{{ selectedImage.filename }}</span>
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
        <i class="fas fa-user-circle"></i>
        <span>{{ placeholder || '点击选择头像图片' }}</span>
      </div>
    </div>

    <!-- 图片选择对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="选择头像图片"
      width="700px"
      :close-on-click-modal="true"
    >
      <!-- 上传区域 -->
      <div class="upload-section">
        <div v-if="uploadingFiles.length === 0" class="upload-trigger">
          <input type="file" accept="image/*" multiple @change="handleFileSelect" />
          <i class="fas fa-cloud-upload-alt"></i>
          <span>点击上传新头像图片</span>
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
          <i class="fas fa-user-circle"></i>
          <p>暂无头像图片，请先上传</p>
        </div>
        <div
          v-for="img in imageLibrary"
          :key="img.id"
          class="image-item"
          :class="{ selected: selectedImageId === img.id }"
        >
          <div class="image-wrapper" @click="selectImage(img)">
            <img :src="img.url" :alt="img.filename" />
            <div v-if="selectedImageId === img.id" class="selected-mark">
              <i class="fas fa-check"></i>
            </div>
            <div v-if="img.usageCount > 0" class="usage-badge">
              {{ img.usageCount }}
            </div>
          </div>
          <div class="image-footer">
            <span class="image-label" :title="img.filename">{{ img.filename.replace(/\.[^.]+$/, '') }}</span>
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
          <span class="tip">共 {{ imageLibrary.length }} 张头像图片</span>
          <el-button @click="dialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.avatar-image-picker {
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
  border-color: #409eff;
  background: #f5f7fa;
}

.preview-image {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  position: relative;
}

.preview-image img {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 50%;
  background: #f5f5f5;
}

.preview-image .image-name {
  flex: 1;
  font-size: 13px;
  color: #606266;
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
  background: #f5f7fa;
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
  border-color: #409eff;
  color: #409eff;
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
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  max-height: 350px;
  overflow-y: auto;
  padding: 4px;
  min-height: 150px;
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
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.image-item.selected {
  border-color: #67c23a;
}

.image-wrapper {
  position: relative;
  padding: 8px;
  cursor: pointer;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.image-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-top: 1px solid #f0f0f0;
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
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background: #67c23a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 10px;
}

.usage-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: #409eff;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
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
