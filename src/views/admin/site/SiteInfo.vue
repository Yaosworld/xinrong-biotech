<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSiteStore } from '@/stores/siteStore'
import { useAdminStore } from '@/stores/adminStore'
import { adminApi } from '@/api/contentApi'
import { ElMessage, ElMessageBox } from 'element-plus'

const siteStore = useSiteStore()
const adminStore = useAdminStore()

// 编辑状态
const isEditing = ref(false)
const isSaving = ref(false)
const isPublishing = ref(false)
const hasUnpublishedChanges = ref(false)

// 表单数据
const formData = ref({
  name: '',
  shortName: '',
  englishName: '',
  logo: ''
})

// 原始数据
const originalData = ref<typeof formData.value | null>(null)

// 加载数据
const loadData = async () => {
  await siteStore.loadSiteConfig()
  
  formData.value = {
    name: siteStore.company.name,
    shortName: siteStore.company.shortName,
    englishName: siteStore.company.englishName,
    logo: siteStore.company.logo
  }
  
  originalData.value = { ...formData.value }
}

// 开始编辑
const startEdit = () => {
  isEditing.value = true
}

// 取消编辑
const cancelEdit = () => {
  if (originalData.value) {
    formData.value = { ...originalData.value }
  }
  isEditing.value = false
}

// 构建完整的网站配置数据
const buildFullSiteConfig = () => {
  return {
    company: formData.value,
    contact: siteStore.contact,
    friendLinks: siteStore.friendLinks,
    footerLinks: siteStore.footerLinks,
    floatingPanel: siteStore.floatingPanel
  }
}

// 保存数据（草稿）
const saveData = async () => {
  try {
    isSaving.value = true
    
    // 保存完整配置到后端草稿
    const fullConfig = buildFullSiteConfig()
    await adminApi.saveDraft('site_config', 'main', fullConfig)
    
    // 更新 store 中的数据
    siteStore.company.name = formData.value.name
    siteStore.company.shortName = formData.value.shortName
    siteStore.company.englishName = formData.value.englishName
    siteStore.company.logo = formData.value.logo
    
    // 更新原始数据
    originalData.value = { ...formData.value }
    
    adminStore.addActivity({
      type: 'modify',
      target: 'site-info',
      description: '保存了网站基本信息草稿'
    })
    
    isEditing.value = false
    hasUnpublishedChanges.value = true
    ElMessage.success('草稿保存成功')
  } catch (error) {
    ElMessage.error('保存失败')
    console.error(error)
  } finally {
    isSaving.value = false
  }
}

// 发布数据
const publishData = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要发布吗？发布后前台页面将立即更新。',
      '确认发布',
      { confirmButtonText: '确定发布', cancelButtonText: '取消', type: 'warning' }
    )
    
    isPublishing.value = true
    
    // 保存完整配置并发布
    const fullConfig = buildFullSiteConfig()
    await adminApi.saveDraft('site_config', 'main', fullConfig)
    await adminApi.publish('site_config', 'main')
    
    hasUnpublishedChanges.value = false
    
    // 刷新 store 缓存
    siteStore.clearCache()
    
    adminStore.addActivity({
      type: 'modify',
      target: 'site-info',
      description: '发布了网站基本信息'
    })
    
    ElMessage.success('发布成功！前台页面已更新')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('发布失败')
      console.error(error)
    }
  } finally {
    isPublishing.value = false
  }
}

// 导出配置
const exportConfig = () => {
  const data = JSON.stringify(siteStore.company, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'site-info.json'
  link.click()
  URL.revokeObjectURL(url)
  
  adminStore.addActivity({
    type: 'download',
    target: 'site-info',
    description: '导出了网站基本信息配置'
  })
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="site-info-editor">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <h3>网站设置 - 基本信息</h3>
      </div>
      <div class="toolbar-right">
        <el-tag v-if="hasUnpublishedChanges" type="warning" size="small" class="status-tag">
          <i class="fas fa-exclamation-circle mr-1"></i> 有未发布的更改
        </el-tag>
        <template v-if="!isEditing">
          <el-button @click="exportConfig">
            <i class="fas fa-download mr-1"></i> 导出
          </el-button>
          <el-button @click="startEdit">
            <i class="fas fa-edit mr-1"></i> 编辑
          </el-button>
          <el-button type="primary" :loading="isPublishing" @click="publishData">
            <i class="fas fa-cloud-upload-alt mr-1"></i> 发布
          </el-button>
        </template>
        <template v-else>
          <el-button @click="cancelEdit">取消</el-button>
          <el-button :loading="isSaving" @click="saveData">
            <i class="fas fa-save mr-1"></i> 保存草稿
          </el-button>
        </template>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="editor-content">
      <div class="form-section">
        <h4>公司信息</h4>
        <div class="form-grid">
          <div class="form-item">
            <label>公司全称</label>
            <el-input v-model="formData.name" :disabled="!isEditing" placeholder="请输入公司全称" />
          </div>
          <div class="form-item">
            <label>公司简称</label>
            <el-input v-model="formData.shortName" :disabled="!isEditing" placeholder="请输入公司简称" />
          </div>
          <div class="form-item full-width">
            <label>英文名称</label>
            <el-input v-model="formData.englishName" :disabled="!isEditing" placeholder="请输入英文名称" />
          </div>
          <div class="form-item full-width">
            <label>Logo 路径</label>
            <el-input v-model="formData.logo" :disabled="!isEditing" placeholder="如：/images/common/logo.png" />
          </div>
        </div>
      </div>

      <!-- Logo 预览 -->
      <div class="preview-section">
        <h4>Logo 预览</h4>
        <div class="logo-preview">
          <img v-if="formData.logo" :src="formData.logo" alt="Logo" />
          <div v-else class="no-logo">
            <i class="fas fa-image"></i>
            <span>暂无 Logo</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.site-info-editor {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.toolbar-left h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.editor-content {
  padding: 20px;
}

.form-section {
  margin-bottom: 24px;
}

.form-section h4 {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item.full-width {
  grid-column: span 2;
}

.form-item label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.preview-section h4 {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.logo-preview {
  width: 200px;
  height: 100px;
  background: #f9fafb;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.logo-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.no-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #999;
}

.no-logo i {
  font-size: 32px;
}

.no-logo span {
  font-size: 12px;
}

.mr-1 {
  margin-right: 4px;
}

.status-tag {
  margin-right: 8px;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-item.full-width {
    grid-column: span 1;
  }
}
</style>
