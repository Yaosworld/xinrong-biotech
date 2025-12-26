<script setup lang="ts">
/**
 * 分类图片管理页面
 * 
 * 独立管理分类图片资源：
 * 1. 查看所有图片及使用状态
 * 2. 上传新图片
 * 3. 删除未使用的图片
 */
import { ref, computed, onMounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

interface CategoryImage {
  id: number
  filename: string
  originalName: string
  url: string
  usedByCategoryId: string | null
  createdAt: string
}

const images = ref<CategoryImage[]>([])
const loading = ref(false)
const uploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// 图片预览
const previewVisible = ref(false)
const previewUrl = ref('')
const previewFilename = ref('')

// 选择模式: 'none' | 'download' | 'delete'
const selectionMode = ref<'none' | 'download' | 'delete'>('none')
const selectedImages = ref<Set<number>>(new Set())

// 统计信息
const stats = computed(() => {
  const total = images.value.length
  const used = images.value.filter(img => img.usedByCategoryId).length
  const available = total - used
  return { total, used, available }
})

// 排序后的图片（未使用的在前）
const sortedImages = computed(() => {
  return [...images.value].sort((a, b) => {
    if (a.usedByCategoryId && !b.usedByCategoryId) return 1
    if (!a.usedByCategoryId && b.usedByCategoryId) return -1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

// 加载图片列表
const loadImages = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('admin_token') || ''
    const res = await fetch('/api/admin/category-images/list', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('加载失败')
    const result = await res.json()
    images.value = result.data || []
  } catch (e) {
    ElMessage.error('加载图片列表失败')
  } finally {
    loading.value = false
  }
}

// 触发文件选择
const triggerUpload = () => {
  fileInputRef.value?.click()
}

// 处理文件上传
const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return
  
  uploading.value = true
  try {
    const token = localStorage.getItem('admin_token') || ''
    const formData = new FormData()
    
    for (const file of files) {
      formData.append('files', file)
    }
    
    const res = await fetch('/api/admin/category-images/batch-upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    
    const result = await res.json()
    
    if (result.successCount > 0) {
      ElMessage.success(`成功上传 ${result.successCount} 张图片`)
      await loadImages()
    }
    
    if (result.errorCount > 0) {
      ElMessage.warning(`${result.errorCount} 张图片上传失败: ${result.errors?.join(', ')}`)
    }
  } catch (e) {
    ElMessage.error('上传失败: ' + (e as Error).message)
  } finally {
    uploading.value = false
    input.value = ''
  }
}

// 删除图片
const deleteImage = async (img: CategoryImage) => {
  if (img.usedByCategoryId) {
    ElMessage.warning(`该图片正被分类 ${img.usedByCategoryId} 使用，无法删除`)
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除图片「${img.originalName || img.filename}」吗？此操作不可恢复。`,
      '删除确认',
      { type: 'warning' }
    )
    
    const token = localStorage.getItem('admin_token') || ''
    const res = await fetch(`/api/admin/category-images/${img.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    const result = await res.json()
    if (result.success) {
      ElMessage.success('删除成功')
      await loadImages()
    } else {
      ElMessage.error(result.error || '删除失败')
    }
  } catch {
    // 用户取消
  }
}

// 同步文件系统
const syncFileSystem = async () => {
  try {
    const token = localStorage.getItem('admin_token') || ''
    const res = await fetch('/api/admin/category-images/sync', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    const result = await res.json()
    if (result.success) {
      ElMessage.success(`同步完成：新增 ${result.added} 张，已存在 ${result.existing} 张`)
      await loadImages()
    }
  } catch (e) {
    ElMessage.error('同步失败')
  }
}

// 图片加载失败处理
const handleImageError = (e: Event) => {
  const img = e.target as HTMLImageElement
  // 防止占位图也失败导致无限循环
  if (!img.src.includes('placeholder')) {
    img.src = '/images/common/placeholder.png'
  }
}

// 预览图片
const previewImage = (img: CategoryImage) => {
  previewUrl.value = img.url
  previewFilename.value = img.originalName || img.filename
  previewVisible.value = true
}

// 进入下载选择模式
const enterDownloadMode = () => {
  selectionMode.value = 'download'
  selectedImages.value.clear()
}

// 进入删除选择模式
const enterDeleteMode = () => {
  selectionMode.value = 'delete'
  selectedImages.value.clear()
}

// 退出选择模式
const exitSelectionMode = () => {
  selectionMode.value = 'none'
  selectedImages.value.clear()
}

// 切换图片选择
const toggleImageSelection = (img: CategoryImage) => {
  if (selectedImages.value.has(img.id)) {
    selectedImages.value.delete(img.id)
  } else {
    selectedImages.value.add(img.id)
  }
}

// 全选/取消全选
const toggleSelectAll = () => {
  if (selectedImages.value.size === images.value.length) {
    selectedImages.value.clear()
  } else {
    selectedImages.value = new Set(images.value.map(img => img.id))
  }
}

// 下载单张图片
const downloadImage = async (img: CategoryImage) => {
  try {
    const response = await fetch(img.url)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = img.originalName || img.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (e) {
    ElMessage.error('下载失败')
  }
}

// 批量下载选中的图片
const downloadSelected = async () => {
  if (selectedImages.value.size === 0) {
    ElMessage.warning('请先选择要下载的图片')
    return
  }
  
  const selectedList = images.value.filter(img => selectedImages.value.has(img.id))
  ElMessage.info(`开始下载 ${selectedList.length} 张图片...`)
  
  // 逐个下载（避免浏览器阻止多个下载）
  for (let i = 0; i < selectedList.length; i++) {
    await downloadImage(selectedList[i])
    // 添加小延迟避免浏览器阻止
    if (i < selectedList.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }
  
  ElMessage.success(`已下载 ${selectedList.length} 张图片`)
}

// 批量删除
const deleteSelected = async () => {
  if (selectedImages.value.size === 0) {
    ElMessage.warning('请先选择要删除的图片')
    return
  }
  
  const selectedList = images.value.filter(img => selectedImages.value.has(img.id))
  const usedCount = selectedList.filter(img => img.usedByCategoryId).length
  
  if (usedCount > 0) {
    ElMessage.warning(`选中的图片中有 ${usedCount} 张正在使用中，无法删除`)
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedList.length} 张图片吗？此操作不可恢复。`,
      '批量删除确认',
      { type: 'warning' }
    )
    
    const token = localStorage.getItem('admin_token') || ''
    const res = await fetch('/api/admin/category-images/batch-delete', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids: Array.from(selectedImages.value) })
    })
    
    const result = await res.json()
    if (result.success) {
      ElMessage.success(`成功删除 ${result.successCount} 张图片${result.failCount > 0 ? `，${result.failCount} 张失败` : ''}`)
      selectedImages.value.clear()
      selectionMode.value = 'none'
      await loadImages()
    } else {
      ElMessage.error(result.error || '删除失败')
    }
  } catch {
    // 用户取消
  }
}

// 停止所有图片加载（路由离开时调用）
const stopImageLoading = () => {
  const container = document.querySelector('.image-grid')
  if (container) {
    const imgs = container.querySelectorAll('img')
    imgs.forEach(img => {
      img.src = ''
    })
  }
}

// 路由离开时停止图片加载，释放连接
onBeforeRouteLeave(() => {
  stopImageLoading()
})

onMounted(() => {
  loadImages()
})
</script>

<template>
  <div class="category-image-page">
    <!-- 顶部工具栏 -->
    <div class="page-header">
      <div class="header-left">
        <h2>分类图片库</h2>
        <div class="stats">
          <span class="stat-item">
            <i class="fas fa-images"></i> 共 {{ stats.total }} 张
          </span>
          <span class="stat-item used">
            <i class="fas fa-link"></i> 已使用 {{ stats.used }} 张
          </span>
          <span class="stat-item available">
            <i class="fas fa-check-circle"></i> 可用 {{ stats.available }} 张
          </span>
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="syncFileSystem">
          <i class="fas fa-sync-alt mr-1"></i> 同步文件
        </el-button>
        
        <!-- 非选择模式：显示批量下载和批量删除按钮 -->
        <template v-if="selectionMode === 'none'">
          <el-button @click="enterDownloadMode">
            <i class="fas fa-download mr-1"></i> 批量下载
          </el-button>
          <el-button type="danger" @click="enterDeleteMode">
            <i class="fas fa-trash mr-1"></i> 批量删除
          </el-button>
        </template>
        
        <!-- 选择模式：显示全选、取消、确认按钮 -->
        <template v-else>
          <el-button @click="toggleSelectAll">
            <i class="fas fa-check-double mr-1"></i>
            {{ selectedImages.size === images.length ? '取消全选' : '全选' }}
          </el-button>
          <el-button @click="exitSelectionMode">
            <i class="fas fa-times mr-1"></i> 取消
          </el-button>
          <el-button 
            v-if="selectionMode === 'download'"
            type="success" 
            :disabled="selectedImages.size === 0"
            @click="downloadSelected"
          >
            <i class="fas fa-download mr-1"></i> 
            确认下载 ({{ selectedImages.size }})
          </el-button>
          <el-button 
            v-if="selectionMode === 'delete'"
            type="danger" 
            :disabled="selectedImages.size === 0"
            @click="deleteSelected"
          >
            <i class="fas fa-trash mr-1"></i> 
            确认删除 ({{ selectedImages.size }})
          </el-button>
        </template>
        
        <el-button type="primary" :loading="uploading" @click="triggerUpload">
          <i class="fas fa-cloud-upload-alt mr-1"></i> 上传图片
        </el-button>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          multiple
          style="display: none"
          @change="handleFileChange"
        />
      </div>
    </div>

    <!-- 图片网格 -->
    <div v-loading="loading" class="image-grid">
      <div v-if="images.length === 0 && !loading" class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>暂无图片，请点击上传</p>
      </div>
      
      <div
        v-for="img in sortedImages"
        :key="img.id"
        class="image-card"
        :class="{ 
          used: img.usedByCategoryId,
          selected: selectionMode !== 'none' && selectedImages.has(img.id)
        }"
        @click="selectionMode !== 'none' ? toggleImageSelection(img) : null"
      >
        <div class="image-preview" @click.stop="selectionMode === 'none' && previewImage(img)">
          <img :src="img.url" :alt="img.filename" loading="lazy" @error="handleImageError" />
          <div v-if="img.usedByCategoryId" class="used-badge">
            <i class="fas fa-link"></i> {{ img.usedByCategoryId }}
          </div>
          <!-- 选择模式下的勾选框 -->
          <div v-if="selectionMode !== 'none'" class="selection-checkbox" @click.stop="toggleImageSelection(img)">
            <i :class="selectedImages.has(img.id) ? 'fas fa-check-circle' : 'far fa-circle'"></i>
          </div>
          <!-- 悬浮操作按钮 -->
          <div v-if="selectionMode === 'none'" class="hover-actions">
            <el-tooltip content="放大预览" placement="top">
              <button class="action-btn" @click.stop="previewImage(img)">
                <i class="fas fa-search-plus"></i>
              </button>
            </el-tooltip>
            <el-tooltip content="下载图片" placement="top">
              <button class="action-btn" @click.stop="downloadImage(img)">
                <i class="fas fa-download"></i>
              </button>
            </el-tooltip>
          </div>
        </div>
        <div class="image-info">
          <span class="filename" :title="img.originalName || img.filename">{{ img.originalName || img.filename }}</span>
          <div class="actions">
            <el-button
              v-if="!img.usedByCategoryId"
              type="danger"
              size="small"
              link
              @click.stop="deleteImage(img)"
            >
              <i class="fas fa-trash"></i>
            </el-button>
            <el-tooltip v-else content="图片正在使用中，无法删除" placement="top">
              <el-button type="info" size="small" link disabled>
                <i class="fas fa-lock"></i>
              </el-button>
            </el-tooltip>
          </div>
        </div>
      </div>
    </div>

    <!-- 图片预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      title="图片预览"
      width="600px"
      append-to-body
      :modal-append-to-body="true"
      destroy-on-close
    >
      <div class="image-preview-dialog">
        <img :src="previewUrl" :alt="previewFilename" />
      </div>
      <template #footer>
        <span class="preview-filename">{{ previewFilename }}</span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.category-image-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100%;
  /* 防止弹窗打开时滚动条消失导致布局抖动 */
  overflow-y: scroll;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.header-left h2 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #303133;
}

.stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  font-size: 13px;
  color: #909399;
}

.stat-item i {
  margin-right: 4px;
}

.stat-item.used {
  color: #e6a23c;
}

.stat-item.available {
  color: #67c23a;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.mr-1 {
  margin-right: 4px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  align-content: start;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #c0c4cc;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
}

.image-card {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.2s;
}

.image-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.image-card.used {
  opacity: 0.8;
}

.image-preview {
  position: relative;
  aspect-ratio: 1;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.image-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.used-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  background: rgba(230, 162, 60, 0.9);
  color: #fff;
  font-size: 11px;
  border-radius: 4px;
}

.used-badge i {
  margin-right: 4px;
}

.image-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-top: 1px solid #f0f0f0;
}

.filename {
  font-size: 12px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.actions {
  flex-shrink: 0;
}

/* 选中状态 */
.image-card.selected {
  border: 2px solid #67c23a;
  box-shadow: 0 0 0 2px rgba(103, 194, 58, 0.2);
}

/* 选择复选框 */
.selection-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  cursor: pointer;
  z-index: 2;
}

.selection-checkbox i {
  font-size: 20px;
  color: #67c23a;
}

.selection-checkbox .fa-circle {
  color: #c0c4cc;
}

/* 悬浮操作按钮 */
.hover-actions {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.image-preview:hover .hover-actions {
  opacity: 1;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  color: #606266;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
}

.action-btn:hover {
  background: #667eea;
  color: #fff;
  transform: scale(1.1);
}

/* 预览弹窗 - 与 UnifiedTableEditor 保持一致 */
.image-preview-dialog {
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-preview-dialog img {
  max-width: 100%;
  max-height: 500px;
  object-fit: contain;
}

.preview-filename {
  color: #909399;
  font-size: 13px;
  display: block;
  text-align: center;
  width: 100%;
}

/* 选择模式下的卡片样式 */
.image-card {
  cursor: default;
  transition: all 0.2s;
}

.image-card .image-preview {
  cursor: pointer;
}
</style>
