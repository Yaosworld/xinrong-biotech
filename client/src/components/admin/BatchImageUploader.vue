<script setup lang="ts">
/**
 * 批量图片上传组件
 * 
 * 功能：
 * 1. 支持多文件选择
 * 2. 本地图片预览（选择后立即显示）
 * 3. 文件名冲突检测
 * 4. 上传进度和状态显示
 * 5. 上传成功后显示服务器图片
 */
import { ref, computed, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  visible: boolean
  category: string
  title?: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success', files: Array<{ filename: string; url: string }>): void
}>()

interface FileItem {
  file: File
  name: string
  nameWithoutExt: string
  status: 'pending' | 'uploading' | 'success' | 'error' | 'conflict'
  error?: string
  url?: string
  previewUrl?: string  // 本地预览 URL
}

const fileList = ref<FileItem[]>([])
const uploading = ref(false)
const checkingNames = ref(false)

// 是否有冲突
const hasConflicts = computed(() => fileList.value.some(f => f.status === 'conflict'))

// 可上传的文件
const uploadableFiles = computed(() => fileList.value.filter(f => f.status === 'pending'))

// 创建本地预览 URL
const createPreviewUrl = (file: File): string => {
  return URL.createObjectURL(file)
}

// 释放预览 URL
const revokePreviewUrls = () => {
  fileList.value.forEach(item => {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl)
    }
  })
}

// 组件卸载时释放资源
onUnmounted(() => {
  revokePreviewUrls()
})

// 处理文件选择
const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  // 添加到列表，同时创建预览
  const newFiles: FileItem[] = []
  for (const file of Array.from(files)) {
    const nameWithoutExt = file.name.replace(/\.[^.]+$/, '')
    newFiles.push({
      file,
      name: file.name,
      nameWithoutExt,
      status: 'pending',
      previewUrl: createPreviewUrl(file)
    })
  }

  // 检查本地重复（同批次内）
  const localNames = new Set<string>()
  for (const f of newFiles) {
    const lowerName = f.nameWithoutExt.toLowerCase()
    if (localNames.has(lowerName)) {
      f.status = 'conflict'
      f.error = '与本批次其他文件重名'
    } else {
      localNames.add(lowerName)
    }
  }

  fileList.value.push(...newFiles)

  // 检查服务器端重复
  await checkServerConflicts()

  input.value = ''
}

// 检查服务器端文件名冲突
const checkServerConflicts = async () => {
  const pendingFiles = fileList.value.filter(f => f.status === 'pending')
  if (pendingFiles.length === 0) return

  const token = localStorage.getItem('admin_token')
  if (!token) {
    ElMessage.warning('请先登录后再上传')
    return
  }

  checkingNames.value = true
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)
  
  try {
    console.log('[BatchImageUploader] 检查文件名冲突:', pendingFiles.map(f => f.name))
    const res = await fetch(`/api/admin/upload/${props.category}/check-names`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ filenames: pendingFiles.map(f => f.name) }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    console.log('[BatchImageUploader] 检查结果状态:', res.status)
    
    if (res.ok) {
      const result = await res.json()
      console.log('[BatchImageUploader] 检查结果:', result)
      if (result.conflicts?.length > 0) {
        for (const conflictName of result.conflicts) {
          const file = fileList.value.find(f => f.name === conflictName && f.status === 'pending')
          if (file) {
            file.status = 'conflict'
            file.error = '服务器已存在同名文件'
          }
        }
      }
    } else if (res.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
    }
  } catch (e: any) {
    clearTimeout(timeoutId)
    console.error('[BatchImageUploader] 检查文件名出错:', e)
    if (e?.name === 'AbortError') {
      ElMessage.warning('检查文件名超时，可直接上传')
    } else {
      console.error('[BatchImageUploader] 错误详情:', e.message)
    }
  } finally {
    checkingNames.value = false
    console.log('[BatchImageUploader] 检查完成, checkingNames:', checkingNames.value, 'uploading:', uploading.value, 'uploadableFiles:', uploadableFiles.value.length)
  }
}

// 移除文件
const removeFile = (index: number) => {
  const item = fileList.value[index]
  if (item.previewUrl) {
    URL.revokeObjectURL(item.previewUrl)
  }
  fileList.value.splice(index, 1)
}

// 清空列表
const clearList = () => {
  revokePreviewUrls()
  fileList.value = []
}

// 开始上传
const startUpload = async () => {
  const filesToUpload = uploadableFiles.value
  console.log('[BatchImageUploader] 开始上传, 文件数:', filesToUpload.length)
  if (filesToUpload.length === 0) {
    ElMessage.warning('没有可上传的文件')
    return
  }

  uploading.value = true
  const successFiles: Array<{ filename: string; url: string }> = []

  try {
    const token = localStorage.getItem('admin_token') || ''
    const formData = new FormData()
    
    for (const item of filesToUpload) {
      item.status = 'uploading'
      formData.append('files', item.file)
    }

    console.log('[BatchImageUploader] 发送上传请求...')
    const res = await fetch(`/api/admin/upload/${props.category}/batch`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })

    console.log('[BatchImageUploader] 上传响应状态:', res.status)
    const result = await res.json()
    console.log('[BatchImageUploader] 上传结果:', result)

    if (result.uploaded) {
      // 按顺序匹配：上传的文件顺序与 filesToUpload 顺序一致
      const uploadingItems = fileList.value.filter(f => f.status === 'uploading')
      
      for (let i = 0; i < result.uploaded.length; i++) {
        const uploaded = result.uploaded[i]
        // 优先按索引匹配（上传顺序一致）
        const item = uploadingItems[i]
        if (item) {
          item.status = 'success'
          item.url = uploaded.url
        }
        successFiles.push({ filename: uploaded.filename, url: uploaded.url })
      }
    }

    if (result.errors) {
      for (const err of result.errors) {
        const item = fileList.value.find(f => f.name === err.filename)
        if (item) {
          item.status = 'error'
          item.error = err.error
        }
      }
    }

    if (successFiles.length > 0) {
      ElMessage.success(`成功上传 ${successFiles.length} 个文件`)
      emit('success', successFiles)
    }

    if (result.errorCount > 0) {
      ElMessage.warning(`${result.errorCount} 个文件上传失败`)
    }
  } catch (e) {
    ElMessage.error('上传失败: ' + (e as Error).message)
    for (const item of filesToUpload) {
      if (item.status === 'uploading') {
        item.status = 'error'
        item.error = '上传失败'
      }
    }
  } finally {
    uploading.value = false
    console.log('[BatchImageUploader] 上传完成, uploading:', uploading.value, 'successFiles:', successFiles.length)
  }
}

// 关闭对话框
const handleClose = () => {
  if (!uploading.value) {
    revokePreviewUrls()
    fileList.value = []
    emit('update:visible', false)
  }
}

// 获取显示的图片 URL（优先服务器 URL，否则本地预览）
const getDisplayUrl = (item: FileItem): string => {
  if (item.status === 'success' && item.url) {
    return item.url
  }
  return item.previewUrl || ''
}

// 获取状态样式
const getStatusClass = (status: FileItem['status']) => {
  return {
    pending: 'status-pending',
    uploading: 'status-uploading',
    success: 'status-success',
    error: 'status-error',
    conflict: 'status-conflict'
  }[status] || ''
}

// 获取状态文字
const getStatusText = (status: FileItem['status']) => {
  return {
    pending: '待上传',
    uploading: '上传中...',
    success: '已上传',
    error: '失败',
    conflict: '冲突'
  }[status] || ''
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="title || '批量上传分类图片'"
    width="800px"
    :close-on-click-modal="!uploading"
    :close-on-press-escape="!uploading"
    :show-close="!uploading"
    @update:model-value="handleClose"
  >
    <div class="batch-uploader">
      <!-- 上传区域 -->
      <div class="upload-area" :class="{ disabled: uploading }">
        <input
          type="file"
          accept="image/*"
          multiple
          :disabled="uploading"
          @change="handleFileSelect"
        />
        <div class="upload-placeholder">
          <i class="fas fa-cloud-upload-alt"></i>
          <p>点击或拖拽图片到此处</p>
          <span>支持 JPG、PNG、GIF、WebP 格式，单个文件最大 5MB</span>
        </div>
      </div>

      <!-- 图片预览网格 -->
      <div v-if="fileList.length > 0" class="preview-section">
        <div class="section-header">
          <span>已选择 {{ fileList.length }} 张图片</span>
          <el-button type="danger" link size="small" :disabled="uploading" @click="clearList">
            清空全部
          </el-button>
        </div>
        
        <div class="preview-grid">
          <div 
            v-for="(item, index) in fileList" 
            :key="item.name + index"
            class="preview-item"
            :class="getStatusClass(item.status)"
          >
            <!-- 图片预览 -->
            <div class="preview-image">
              <img :src="getDisplayUrl(item)" :alt="item.name" />
              <!-- 状态遮罩 -->
              <div v-if="item.status === 'uploading'" class="status-overlay uploading">
                <i class="fas fa-spinner fa-spin"></i>
              </div>
              <div v-else-if="item.status === 'success'" class="status-overlay success">
                <i class="fas fa-check"></i>
              </div>
              <div v-else-if="item.status === 'error' || item.status === 'conflict'" class="status-overlay error">
                <i class="fas fa-exclamation"></i>
              </div>
            </div>
            
            <!-- 文件信息 -->
            <div class="preview-info">
              <span class="file-name" :title="item.name">{{ item.name }}</span>
              <span class="file-status" :class="getStatusClass(item.status)">
                {{ item.error || getStatusText(item.status) }}
              </span>
            </div>
            
            <!-- 删除按钮 -->
            <el-button
              v-if="item.status !== 'uploading' && item.status !== 'success'"
              class="remove-btn"
              type="danger"
              size="small"
              circle
              @click="removeFile(index)"
            >
              <i class="fas fa-times"></i>
            </el-button>
          </div>
        </div>
      </div>

      <!-- 冲突提示 -->
      <el-alert
        v-if="hasConflicts"
        type="warning"
        :closable="false"
        show-icon
        class="conflict-alert"
      >
        <template #title>检测到文件名冲突</template>
        <template #default>
          部分文件名与已有文件重复，请修改文件名后重新选择，或移除冲突文件。
        </template>
      </el-alert>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button :disabled="uploading" @click="handleClose">
          {{ fileList.some(f => f.status === 'success') ? '完成' : '取消' }}
        </el-button>
        <el-button 
          type="primary" 
          :loading="uploading || checkingNames"
          :disabled="uploadableFiles.length === 0"
          @click="startUpload"
        >
          {{ uploading ? '上传中...' : `上传 (${uploadableFiles.length})` }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.batch-uploader {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-area {
  position: relative;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 32px 20px;
  text-align: center;
  transition: all 0.2s;
  cursor: pointer;
}

.upload-area:hover:not(.disabled) {
  border-color: var(--admin-primary);
  background: var(--admin-surface);
}

.upload-area.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.upload-area input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.upload-area.disabled input {
  cursor: not-allowed;
}

.upload-placeholder {
  pointer-events: none;
}

.upload-placeholder i {
  font-size: 40px;
  color: #c0c4cc;
  margin-bottom: 8px;
}

.upload-placeholder p {
  font-size: 14px;
  color: #606266;
  margin: 0 0 4px;
}

.upload-placeholder span {
  font-size: 12px;
  color: #909399;
}

/* 预览区域 */
.preview-section {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: var(--admin-surface);
  border-bottom: 1px solid #e4e7ed;
  font-size: 13px;
  color: #606266;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px;
  max-height: 360px;
  overflow-y: auto;
}

.preview-item {
  position: relative;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.preview-item.status-success {
  border-color: var(--admin-accent);
}

.preview-item.status-error,
.preview-item.status-conflict {
  border-color: #f56c6c;
}

.preview-item.status-uploading {
  border-color: var(--admin-primary);
}

.preview-image {
  position: relative;
  aspect-ratio: 1;
  background: var(--admin-surface-alt);
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.status-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.status-overlay.uploading {
  background: rgba(64, 158, 255, 0.3);
  color: var(--admin-primary);
}

.status-overlay.success {
  background: rgba(103, 194, 58, 0.3);
  color: var(--admin-accent);
}

.status-overlay.error {
  background: rgba(245, 108, 108, 0.3);
  color: #f56c6c;
}

.preview-info {
  padding: 8px;
  background: #fff;
  border-top: 1px solid var(--admin-border);
}

.file-name {
  display: block;
  font-size: 12px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-status {
  display: block;
  font-size: 11px;
  margin-top: 2px;
  color: #909399;
}

.file-status.status-success {
  color: var(--admin-accent);
}

.file-status.status-error,
.file-status.status-conflict {
  color: #f56c6c;
}

.file-status.status-uploading {
  color: var(--admin-primary);
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px !important;
  height: 20px !important;
  padding: 0 !important;
  font-size: 10px;
}

.conflict-alert {
  margin-top: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
