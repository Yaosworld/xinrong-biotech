<script setup lang="ts">
/**
 * 通用图片选择器组件
 * 
 * 通过配置驱动，支持不同类型的图片选择场景：
 * - 分类图片（exclusive 模式，一对一）
 * - 促销图片（shared 模式，多对多，支持 cover/poster 类型）
 * - 首页横幅（shared 模式，多对多）
 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// ========================================
// 类型定义
// ========================================

interface ImageItem {
  id: number
  filename: string
  url: string
  imageType?: string
  usedByCategoryId?: string | null
  usageCount?: number
}

type UsageMode = 'exclusive' | 'shared'

interface ImagePickerConfig {
  /** API 路径 */
  apiPath: string
  /** 对话框标题 */
  title?: string
  /** 占位文本 */
  placeholder?: string
  /** 使用模式：exclusive=一对一，shared=多对多 */
  usageMode?: UsageMode
  /** 图片类型（用于 promotion 等场景） */
  imageType?: string
  /** 网格列数 */
  gridColumns?: number
  /** 图片宽高比 */
  aspectRatio?: string
  /** 对话框宽度 */
  dialogWidth?: string
  /** 上传提示 */
  uploadHint?: string
  /** 文件大小限制提示 */
  fileSizeHint?: string
}

// ========================================
// Props & Emits
// ========================================

const props = withDefaults(defineProps<{
  modelValue: number | null
  config: ImagePickerConfig
  /** exclusive 模式：已使用的图片映射 imageId -> entityId */
  usedImagesMap?: Map<number, string>
  /** exclusive 模式：当前实体ID（用于排除自身） */
  currentEntityId?: string
  /** shared 模式：已使用的图片ID集合 */
  usedImageIds?: Set<number>
}>(), {
  usedImagesMap: undefined,
  currentEntityId: undefined,
  usedImageIds: undefined
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void
  (e: 'imageChange', imageInfo: { id: number | null; url: string; filename: string } | null): void
  (e: 'refresh'): void
}>()

// ========================================
// 响应式状态
// ========================================

const imageLibrary = ref<ImageItem[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const uploadingFiles = ref<File[]>([])
const isUploading = ref(false)

// ========================================
// 计算属性
// ========================================

const selectedImageId = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const selectedImage = computed(() => {
  if (!selectedImageId.value) return null
  return imageLibrary.value.find(img => img.id === selectedImageId.value)
})

const config = computed(() => ({
  title: props.config.title || '选择图片',
  placeholder: props.config.placeholder || '点击选择图片',
  usageMode: props.config.usageMode || 'shared',
  gridColumns: props.config.gridColumns || 5,
  aspectRatio: props.config.aspectRatio || '1',
  dialogWidth: props.config.dialogWidth || '800px',
  uploadHint: props.config.uploadHint || '点击上传新图片',
  ...props.config
}))

// 排序后的图片列表（未使用的优先）
const sortedImageLibrary = computed(() => {
  return [...imageLibrary.value].sort((a, b) => {
    const aUsed = !!getUsageInfo(a)
    const bUsed = !!getUsageInfo(b)
    if (aUsed === bUsed) return a.filename.localeCompare(b.filename)
    return aUsed ? 1 : -1
  })
})

// 网格样式
const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${config.value.gridColumns}, 1fr)`
}))

// 图片宽高比样式
const aspectRatioStyle = computed(() => ({
  aspectRatio: config.value.aspectRatio
}))

// ========================================
// 方法
// ========================================

const getImageUrl = (img: ImageItem | null) => {
  if (!img) return '/images/common/placeholder.png'
  return img.url || '/images/common/placeholder.png'
}

/** 获取图片使用信息（返回使用者ID或null） */
const getUsageInfo = (img: ImageItem): string | null => {
  if (config.value.usageMode === 'exclusive') {
    // exclusive 模式：检查 usedImagesMap 和 usedByCategoryId
    if (props.usedImagesMap) {
      const usedBy = props.usedImagesMap.get(img.id)
      if (usedBy && usedBy !== props.currentEntityId) return usedBy
    }
    if (img.usedByCategoryId && img.usedByCategoryId !== props.currentEntityId) {
      return img.usedByCategoryId
    }
  } else {
    // shared 模式：检查 usedImageIds
    if (props.usedImageIds?.has(img.id)) {
      return 'other'
    }
  }
  return null
}

/** 检查图片是否可选 */
const isImageSelectable = (img: ImageItem): boolean => {
  if (config.value.usageMode === 'exclusive') {
    return !getUsageInfo(img)
  }
  // shared 模式下，如果有 usedImageIds 限制，则检查
  if (props.usedImageIds) {
    return !props.usedImageIds.has(img.id)
  }
  return true
}

/** 检查图片是否可删除 */
const isImageDeletable = (img: ImageItem): boolean => {
  if (config.value.usageMode === 'exclusive') {
    return !getUsageInfo(img) && !img.usedByCategoryId
  }
  // shared 模式下，promotion 允许删除，home 需要检查 usageCount
  if (props.usedImageIds) {
    return !props.usedImageIds.has(img.id) && (img.usageCount === 0 || img.usageCount === undefined)
  }
  return true
}

/** 加载图片库 */
const loadImageLibrary = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('admin_token') || ''
    let url = `${config.value.apiPath}/list`
    if (config.value.imageType) {
      url += `?type=${config.value.imageType}`
    }
    
    const res = await fetch(url, {
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

/** 选择图片 */
const selectImage = (img: ImageItem) => {
  if (!isImageSelectable(img)) {
    ElMessage.warning('该图片已被使用，请选择其他图片')
    return
  }
  selectedImageId.value = img.id
  emit('imageChange', { id: img.id, url: img.url, filename: img.filename })
  dialogVisible.value = false
}

/** 打开选择器 */
const openPicker = () => {
  dialogVisible.value = true
  loadImageLibrary()
}

/** 清除选择 */
const clearSelection = () => {
  selectedImageId.value = null
  emit('imageChange', null)
}

/** 处理文件选择 */
const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files) {
    uploadingFiles.value = Array.from(input.files)
  }
  input.value = ''
}

/** 上传文件 */
const uploadFiles = async () => {
  if (uploadingFiles.value.length === 0) return
  
  isUploading.value = true
  try {
    const token = localStorage.getItem('admin_token') || ''
    const formData = new FormData()
    
    for (const file of uploadingFiles.value) {
      formData.append('files', file)
    }
    
    let url = `${config.value.apiPath}/batch-upload`
    if (config.value.imageType) {
      url += `?type=${config.value.imageType}`
    }
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    
    const result = await res.json()
    
    if (result.successCount > 0 || result.data?.length > 0) {
      const count = result.successCount || result.data?.length || 1
      ElMessage.success(`成功上传 ${count} 张图片`)
      uploadingFiles.value = []
      await loadImageLibrary()
      emit('refresh')
    }
    
    if (result.errorCount > 0) {
      ElMessage.warning(`${result.errorCount} 张图片上传失败`)
    }
    
    if (!result.success && result.error) {
      ElMessage.error(result.error)
    }
  } catch (e) {
    ElMessage.error('上传失败: ' + (e as Error).message)
  } finally {
    isUploading.value = false
  }
}

/** 删除图片 */
const deleteImage = async (img: ImageItem) => {
  if (!isImageDeletable(img)) {
    ElMessage.warning('该图片正在被使用，无法删除')
    return
  }
  
  try {
    const usageInfo = img.usageCount && img.usageCount > 0 
      ? `该图片被 ${img.usageCount} 个位置使用。` 
      : ''
    
    await ElMessageBox.confirm(
      `确定要删除图片「${img.filename}」吗？${usageInfo}此操作不可恢复。`,
      '删除确认',
      { type: 'warning' }
    )
    
    const token = localStorage.getItem('admin_token') || ''
    const res = await fetch(`${config.value.apiPath}/${img.id}`, {
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
      emit('refresh')
    } else {
      const result = await res.json()
      ElMessage.error(result.error || '删除失败')
    }
  } catch {
    // 用户取消
  }
}

/** 取消上传 */
const cancelUpload = () => {
  uploadingFiles.value = []
}

// 暴露方法供外部调用
defineExpose({
  openPicker,
  loadImageLibrary
})

// 初始加载
onMounted(() => {
  loadImageLibrary()
})
</script>

<template>
  <div class="image-picker">
    <!-- 当前选中的图片预览 -->
    <div class="picker-preview" @click="openPicker">
      <div v-if="selectedImage" class="preview-image">
        <img 
          :src="getImageUrl(selectedImage)" 
          :alt="selectedImage.filename"
          :style="aspectRatioStyle"
        />
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
        <span>{{ config.placeholder }}</span>
      </div>
    </div>

    <!-- 图片选择对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="config.title"
      :width="config.dialogWidth"
      :close-on-click-modal="true"
      append-to-body
    >
      <!-- 上传区域 -->
      <div class="upload-section">
        <div v-if="uploadingFiles.length === 0" class="upload-trigger">
          <input type="file" accept="image/*" multiple @change="handleFileSelect" />
          <i class="fas fa-cloud-upload-alt"></i>
          <span>{{ config.uploadHint }}</span>
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
      <div v-loading="loading" class="image-grid" :style="gridStyle">
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
            used: !!getUsageInfo(img),
            disabled: !isImageSelectable(img)
          }"
        >
          <div class="image-wrapper" :style="aspectRatioStyle" @click="selectImage(img)">
            <img :src="img.url" :alt="img.filename" />
            <div v-if="selectedImageId === img.id" class="selected-mark">
              <i class="fas fa-check"></i>
            </div>
            <el-tooltip v-if="getUsageInfo(img)" content="已被使用" placement="top">
              <div class="used-mark">
                <i class="fas fa-ban"></i>
              </div>
            </el-tooltip>
            <div v-if="img.usageCount && img.usageCount > 0 && !getUsageInfo(img)" class="usage-badge">
              {{ img.usageCount }}
            </div>
          </div>
          <div class="image-footer">
            <span class="image-label" :title="img.filename">
              {{ img.filename.replace(/\.[^.]+$/, '') }}
            </span>
            <el-button
              v-if="isImageDeletable(img)"
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
.image-picker {
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
  border-color: var(--admin-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.image-item.selected {
  border-color: var(--admin-accent);
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
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--admin-surface-alt);
  overflow: hidden;
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
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background: var(--admin-accent);
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

.usage-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: var(--admin-primary);
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
