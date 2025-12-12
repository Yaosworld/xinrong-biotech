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
      `确定要删除图片「${img.filename}」吗？此操作不可恢复。`,
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
  img.src = '/images/common/placeholder.png'
}

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
        :class="{ used: img.usedByCategoryId }"
      >
        <div class="image-preview">
          <img :src="img.url" :alt="img.filename" @error="handleImageError" />
          <div v-if="img.usedByCategoryId" class="used-badge">
            <i class="fas fa-link"></i> {{ img.usedByCategoryId }}
          </div>
        </div>
        <div class="image-info">
          <span class="filename" :title="img.filename">{{ img.filename }}</span>
          <div class="actions">
            <el-button
              v-if="!img.usedByCategoryId"
              type="danger"
              size="small"
              link
              @click="deleteImage(img)"
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
  </div>
</template>

<style scoped>
.category-image-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100%;
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
  min-height: 300px;
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
</style>
