<script setup lang="ts">
/**
 * 图片上传组件
 * 支持拖拽上传、点击上传、预览、状态显示
 */
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadApi, type UploadCategory } from '@/api/uploadApi'

// Props
const props = withDefaults(defineProps<{
  modelValue: string          // 图片 URL
  category: UploadCategory    // 上传分类
  accept?: string             // 接受的文件类型
  maxSize?: number            // 最大文件大小 (MB)
  placeholder?: string        // 占位提示
  disabled?: boolean          // 是否禁用
}>(), {
  accept: 'image/jpeg,image/png,image/gif,image/webp',
  maxSize: 5,
  placeholder: '点击或拖拽上传图片'
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
}>()

// 状态
const uploading = ref(false)
const uploadProgress = ref(0)
const dragOver = ref(false)
const uploadStatus = ref<'idle' | 'uploading' | 'success' | 'error'>('idle')
const errorMessage = ref('')

// 文件输入引用
const fileInputRef = ref<HTMLInputElement | null>(null)

// 用于强制刷新图片的时间戳
const imageTimestamp = ref(Date.now())

// 计算属性
const imageUrl = computed(() => {
  if (!props.modelValue) return ''
  // 处理相对路径
  let url = props.modelValue
  if (!url.startsWith('http')) {
    url = url.startsWith('/') ? url : `/${url}`
  }
  // 添加时间戳防止缓存问题
  return `${url}?t=${imageTimestamp.value}`
})

// 图片加载状态
const imageLoaded = ref(false)
const imageError = ref(false)

// 监听 modelValue 变化，重置图片加载状态
watch(() => props.modelValue, (newVal, oldVal) => {
  // 只有在值真正变化时才更新
  if (newVal !== oldVal) {
    imageLoaded.value = false
    imageError.value = false
    // 更新时间戳，强制刷新图片
    imageTimestamp.value = Date.now()
  }
})

const filename = computed(() => {
  return uploadApi.getFilenameFromUrl(props.modelValue)
})

const hasImage = computed(() => !!props.modelValue)

// 监听值变化，重置状态
watch(() => props.modelValue, () => {
  if (uploadStatus.value !== 'uploading') {
    uploadStatus.value = props.modelValue ? 'success' : 'idle'
    errorMessage.value = ''
  }
})

// 方法
const triggerUpload = () => {
  if (props.disabled || uploading.value) return
  fileInputRef.value?.click()
}

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    await uploadFile(file)
  }
  // 重置 input，允许重复选择同一文件
  input.value = ''
}

const handleDrop = async (event: DragEvent) => {
  event.preventDefault()
  dragOver.value = false
  
  if (props.disabled || uploading.value) return
  
  const file = event.dataTransfer?.files[0]
  if (file) {
    await uploadFile(file)
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (!props.disabled && !uploading.value) {
    dragOver.value = true
  }
}

const handleDragLeave = () => {
  dragOver.value = false
}

const uploadFile = async (file: File) => {
  // 验证文件类型
  const acceptTypes = props.accept.split(',').map(t => t.trim())
  if (!acceptTypes.includes(file.type)) {
    ElMessage.warning('不支持的文件类型')
    return
  }

  // 验证文件大小
  if (file.size > props.maxSize * 1024 * 1024) {
    ElMessage.warning(`文件大小不能超过 ${props.maxSize}MB`)
    return
  }

  uploading.value = true
  uploadStatus.value = 'uploading'
  uploadProgress.value = 0
  errorMessage.value = ''

  // 模拟进度
  const progressInterval = setInterval(() => {
    if (uploadProgress.value < 90) {
      uploadProgress.value += 10
    }
  }, 100)

  try {
    const result = await uploadApi.upload(file, props.category)
    
    clearInterval(progressInterval)
    uploadProgress.value = 100

    if (result.success && result.url) {
      uploadStatus.value = 'success'
      emit('update:modelValue', result.url)
      emit('change', result.url)
      ElMessage.success('上传成功')
    } else {
      uploadStatus.value = 'error'
      errorMessage.value = result.error || '上传失败'
      ElMessage.error(result.error || '上传失败')
    }
  } catch (error) {
    clearInterval(progressInterval)
    uploadStatus.value = 'error'
    errorMessage.value = (error as Error).message
    ElMessage.error('上传失败: ' + (error as Error).message)
  } finally {
    uploading.value = false
    setTimeout(() => {
      uploadProgress.value = 0
    }, 500)
  }
}

const clearImage = () => {
  emit('update:modelValue', '')
  emit('change', '')
  uploadStatus.value = 'idle'
  errorMessage.value = ''
}
</script>

<template>
  <div class="image-uploader" :class="{ disabled, 'drag-over': dragOver }">
    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      :accept="accept"
      style="display: none"
      @change="handleFileChange"
    />

    <!-- 上传区域 -->
    <div
      class="upload-area"
      :class="{ 'has-image': hasImage }"
      @click="triggerUpload"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
    >
      <!-- 有图片时显示预览 -->
      <template v-if="hasImage">
        <div class="image-preview">
          <!-- 加载中状态 -->
          <div v-if="!imageLoaded && !imageError" class="image-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>加载中...</span>
          </div>
          <img 
            :src="imageUrl" 
            alt="预览"
            :style="{ display: imageLoaded ? 'block' : 'none' }"
            @load="imageLoaded = true; imageError = false"
            @error="imageError = true; imageLoaded = false"
          />
          <!-- 图片加载失败时显示错误提示 -->
          <div v-if="imageError" class="image-load-error">
            <i class="fas fa-exclamation-triangle"></i>
            <span>图片加载失败</span>
            <small>{{ imageUrl }}</small>
          </div>
          <div v-if="imageLoaded" class="image-overlay">
            <div class="overlay-actions">
              <button type="button" class="action-btn" @click.stop="triggerUpload" title="更换图片">
                <i class="fas fa-sync-alt"></i>
              </button>
              <button type="button" class="action-btn danger" @click.stop="clearImage" title="删除图片">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- 无图片时显示上传提示 -->
      <template v-else>
        <div class="upload-placeholder">
          <i class="fas fa-cloud-upload-alt upload-icon"></i>
          <span class="upload-text">{{ placeholder }}</span>
          <span class="upload-hint">支持 JPG、PNG、GIF、WebP，最大 {{ maxSize }}MB</span>
        </div>
      </template>

      <!-- 上传进度 -->
      <div v-if="uploading" class="upload-progress">
        <div class="progress-bar" :style="{ width: uploadProgress + '%' }"></div>
        <span class="progress-text">上传中 {{ uploadProgress }}%</span>
      </div>
    </div>

    <!-- 文件信息 -->
    <div v-if="hasImage" class="file-info">
      <div class="file-name" :title="filename">
        <i class="fas fa-image"></i>
        <span>{{ filename }}</span>
      </div>
      <div class="file-status">
        <el-tag v-if="uploadStatus === 'success'" type="success" size="small">
          <i class="fas fa-check"></i> 已上传
        </el-tag>
        <el-tag v-else-if="uploadStatus === 'error'" type="danger" size="small">
          <i class="fas fa-times"></i> 失败
        </el-tag>
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="errorMessage" class="error-message">
      <i class="fas fa-exclamation-circle"></i>
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
.image-uploader {
  width: 100%;
}

.image-uploader.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.upload-area {
  position: relative;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  overflow: hidden;
  background: #fafafa;
}

.upload-area:hover {
  border-color: #667eea;
  background: #f5f7ff;
}

.image-uploader.drag-over .upload-area {
  border-color: #667eea;
  background: #f0f3ff;
  transform: scale(1.02);
}

.upload-area.has-image {
  border-style: solid;
  border-color: #e8e8e8;
  background: #fff;
}

/* 上传占位符 */
.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 20px;
  color: #909399;
}

.upload-icon {
  font-size: 36px;
  color: #c0c4cc;
  margin-bottom: 10px;
}

.upload-text {
  font-size: 14px;
  margin-bottom: 6px;
}

.upload-hint {
  font-size: 12px;
  color: #c0c4cc;
}

/* 图片预览 */
.image-preview {
  position: relative;
  width: 100%;
  min-height: 120px;
  max-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
}

.image-preview img {
  max-width: 100%;
  max-height: 180px;
  object-fit: contain;
  border-radius: 4px;
}

.image-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.image-preview:hover .image-overlay {
  opacity: 1;
}

.overlay-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: #606266;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #fff;
  transform: scale(1.1);
}

.action-btn.danger:hover {
  color: #f56c6c;
}

/* 上传进度 */
.upload-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 24px;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: width 0.2s;
}

.progress-text {
  position: relative;
  color: #fff;
  font-size: 12px;
  z-index: 1;
}

/* 文件信息 */
.file-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.file-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
  overflow: hidden;
}

.file-name i {
  color: #909399;
  flex-shrink: 0;
}

.file-name span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-status {
  flex-shrink: 0;
}

/* 错误信息 */
.error-message {
  margin-top: 8px;
  padding: 8px 12px;
  background: #fef0f0;
  border-radius: 4px;
  color: #f56c6c;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 图片加载中 */
.image-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  color: #909399;
  font-size: 13px;
  gap: 8px;
}

.image-loading i {
  font-size: 24px;
  color: #667eea;
}

/* 图片加载失败 */
.image-load-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #fef0f0;
  color: #f56c6c;
  font-size: 13px;
  gap: 8px;
  border-radius: 4px;
}

.image-load-error i {
  font-size: 24px;
}

.image-load-error small {
  font-size: 11px;
  color: #999;
  word-break: break-all;
  max-width: 100%;
  text-align: center;
}
</style>
