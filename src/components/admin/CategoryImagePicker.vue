<script setup lang="ts">
/**
 * 分类图片选择器
 * 
 * 功能：
 * 1. 从图片库中选择图片（支持 imageId 或 filename 模式）
 * 2. 支持上传新图片到图片库
 * 3. 显示图片预览和使用状态
 * 4. 支持删除未使用的图片
 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface ImageItem {
  id: number
  filename: string
  url: string
  usedByCategoryId?: string | null
}

const props = defineProps<{
  modelValue: number | string | null  // imageId 或 filename
  placeholder?: string
  // 已使用的图片映射：imageId -> categoryId
  usedImagesMap?: Map<number, string> | Record<string, string>
  // 当前编辑的分类ID（用于判断是否是自己使用的图片）
  currentCategoryId?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | string | null): void
  (e: 'imageChange', imageInfo: { id: number | null; url: string; filename: string } | null): void
  (e: 'refresh'): void
}>()

const imageLibrary = ref<ImageItem[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const uploadingFiles = ref<File[]>([])
const isUploading = ref(false)

// 当前选中的图片ID
const selectedImageId = computed({
  get: () => {
    const val = props.modelValue
    if (typeof val === 'number') return val
    if (typeof val === 'string' && /^\d+$/.test(val)) return parseInt(val, 10)
    return null
  },
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

// 检查图片是否被使用（排除当前分类）
const isImageUsed = (img: ImageItem): string | null => {
  // 检查 usedImagesMap
  if (props.usedImagesMap) {
    if (props.usedImagesMap instanceof Map) {
      const usedBy = props.usedImagesMap.get(img.id)
      if (usedBy && usedBy !== props.currentCategoryId) return usedBy
    } else {
      const usedBy = props.usedImagesMap[String(img.id)]
      if (usedBy && usedBy !== props.currentCategoryId) return usedBy
    }
  }
  // 检查图片自带的 usedByCategoryId
  if (img.usedByCategoryId && img.usedByCategoryId !== props.currentCategoryId) {
    return img.usedByCategoryId
  }
  return null
}

// 排序后的图片列表（未使用的优先）
const sortedImageLibrary = computed(() => {
  return [...imageLibrary.value].sort((a, b) => {
    const aUsed = !!isImageUsed(a)
    const bUsed = !!isImageUsed(b)
    if (aUsed === bUsed) return a.filename.localeCompare(b.filename)
    return aUsed ? 1 : -1
  })
})

// 加载图片库
const loadImageLibrary = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('admin_token') || ''
    const res = await fetch('/api/admin/category-images/list', {
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
  const usedBy = isImageUsed(img)
  if (usedBy) {
    ElMessage.warning(`该图片已被其他分类使用，请选择其他图片`)
    return
  }
  selectedImageId.value = img.id
  // 同时发送完整的图片信息
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
    
    const res = await fetch('/api/admin/category-images/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    
    const result = await res.json()
    
    if (result.success) {
      ElMessage.success(`成功上传 ${result.data?.length || 1} 张图片`)
      uploadingFiles.value = []
      await loadImageLibrary()
      emit('refresh')
    } else {
      ElMessage.error(result.error || '上传失败')
    }
  } catch (e) {
    ElMessage.error('上传失败: ' + (e as Error).message)
  } finally {
    isUploading.value = false
  }
}

// 删除图片
const deleteImage = async (img: ImageItem) => {
  const usedBy = isImageUsed(img)
  if (usedBy || img.usedByCategoryId) {
    ElMessage.warning(`该图片正在被使用，无法删除`)
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除图片「${img.filename}」吗？此操作不可恢复。`,
      '删除确认',
      { type: 'warning' }
    )
    
    const token = localStorage.getItem('admin_token') || ''
    const res = await fetch(`/api/admin/category-images/${img.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (res.ok) {
      ElMessage.success('删除成功')
      // 如果删除的是当前选中的图片，清除选择
      if (selectedImageId.value === img.id) {
        selectedImageId.value = null
      }
      await loadImageLibrary()
      emit('refresh')
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
  <div class="category-image-picker">
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
        <i class="fas fa-image"></i>
        <span>{{ placeholder || '点击选择分类图片' }}</span>
      </div>
    </div>

    <!-- 图片选择对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="选择分类图片"
      width="800px"
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
          v-for="img in sortedImageLibrary"
          :key="img.id"
          class="image-item"
          :class="{ 
            selected: selectedImageId === img.id, 
            used: !!isImageUsed(img),
            disabled: !!isImageUsed(img)
          }"
        >
          <div class="image-wrapper" @click="selectImage(img)">
            <img :src="img.url" :alt="img.filename" />
            <div v-if="selectedImageId === img.id" class="selected-mark">
              <i class="fas fa-check"></i>
            </div>
            <el-tooltip v-if="isImageUsed(img)" content="已被其他分类使用" placement="top">
              <div class="used-mark">
                <i class="fas fa-ban"></i>
              </div>
            </el-tooltip>
          </div>
          <div class="image-footer">
            <span class="image-label" :title="img.filename">{{ img.filename.replace(/\.[^.]+$/, '') }}</span>
            <el-button
              v-if="!isImageUsed(img) && !img.usedByCategoryId"
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
.category-image-picker {
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
  width: 60px;
  height: 60px;
  object-fit: contain;
  border-radius: 6px;
  background: #f5f5f5;
  padding: 4px;
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
  grid-template-columns: repeat(5, 1fr);
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

.image-item:hover:not(.disabled) {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.image-item.selected {
  border-color: #67c23a;
}

.image-item.used {
  opacity: 0.6;
  border-style: dashed;
  border-color: #dcdfe6;
}

.image-item.disabled {
  cursor: not-allowed;
}

.image-item.disabled .image-wrapper {
  cursor: not-allowed;
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
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
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

.used-mark {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background: #909399;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 9px;
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
