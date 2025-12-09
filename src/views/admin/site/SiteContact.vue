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
  phones: ['', ''],
  email: '',
  address: '',
  wechatQrcode: '',
  gzhQrcode: '',
  workTime: ''
})

// 原始数据
const originalData = ref<typeof formData.value | null>(null)

// 加载数据（从 Admin API 加载，包含草稿）
const loadData = async () => {
  try {
    // 从 Admin API 加载（优先使用草稿数据）
    const content = await adminApi.getOne('site_config', 'main')
    const data = (content.draftData || content.publishedData || {}) as any
    
    formData.value = {
      phones: data.contact?.phones ? [...data.contact.phones] : ['', ''],
      email: data.contact?.email || '',
      address: data.contact?.address || '',
      wechatQrcode: data.contact?.wechatQrcode || '',
      gzhQrcode: data.contact?.gzhQrcode || '',
      workTime: data.contact?.workTime || ''
    }
    
    // 检查是否有未发布的更改
    hasUnpublishedChanges.value = content.draftData !== null && 
      JSON.stringify(content.draftData) !== JSON.stringify(content.publishedData)
    
    // 同步到 store（用于构建完整配置）
    if (data.company) siteStore.company = data.company
    if (data.contact) siteStore.contact = data.contact
    if (data.friendLinks) siteStore.friendLinks = data.friendLinks
    if (data.footerLinks) siteStore.footerLinks = data.footerLinks
    if (data.floatingPanel) siteStore.floatingPanel = data.floatingPanel
  } catch (e) {
    console.warn('Admin API 加载失败，降级到前台 Store:', e)
    // 降级到前台 Store
    await siteStore.loadSiteConfig()
    
    formData.value = {
      phones: [...siteStore.contact.phones],
      email: siteStore.contact.email,
      address: siteStore.contact.address,
      wechatQrcode: siteStore.contact.wechatQrcode,
      gzhQrcode: siteStore.contact.gzhQrcode,
      workTime: siteStore.contact.workTime
    }
    hasUnpublishedChanges.value = false
  }
  
  // 确保至少有两个电话号码字段
  while (formData.value.phones.length < 2) {
    formData.value.phones.push('')
  }
  
  originalData.value = JSON.parse(JSON.stringify(formData.value))
}

// 开始编辑
const startEdit = () => {
  isEditing.value = true
}

// 取消编辑
const cancelEdit = () => {
  if (originalData.value) {
    formData.value = JSON.parse(JSON.stringify(originalData.value))
  }
  isEditing.value = false
}

// 添加电话
const addPhone = () => {
  formData.value.phones.push('')
}

// 删除电话
const removePhone = (index: number) => {
  if (formData.value.phones.length > 1) {
    formData.value.phones.splice(index, 1)
  }
}

// 构建完整的网站配置数据
const buildFullSiteConfig = () => {
  const validPhones = formData.value.phones.filter(p => p.trim())
  return {
    company: siteStore.company,
    contact: {
      phones: validPhones,
      email: formData.value.email,
      address: formData.value.address,
      wechatQrcode: formData.value.wechatQrcode,
      gzhQrcode: formData.value.gzhQrcode,
      workTime: formData.value.workTime
    },
    friendLinks: siteStore.friendLinks,
    footerLinks: siteStore.footerLinks,
    floatingPanel: siteStore.floatingPanel
  }
}

// 保存数据（草稿）
const saveData = async () => {
  try {
    isSaving.value = true
    
    // 过滤空电话号码
    const validPhones = formData.value.phones.filter(p => p.trim())
    
    // 保存完整配置到后端草稿
    const fullConfig = buildFullSiteConfig()
    await adminApi.saveDraft('site_config', 'main', fullConfig)
    
    // 更新 store 中的数据
    siteStore.contact.phones = validPhones
    siteStore.contact.email = formData.value.email
    siteStore.contact.address = formData.value.address
    siteStore.contact.wechatQrcode = formData.value.wechatQrcode
    siteStore.contact.gzhQrcode = formData.value.gzhQrcode
    siteStore.contact.workTime = formData.value.workTime
    
    // 更新原始数据
    originalData.value = JSON.parse(JSON.stringify(formData.value))
    
    adminStore.addActivity({
      type: 'modify',
      target: 'site-contact',
      description: '保存了网站联系方式草稿'
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
      target: 'site-contact',
      description: '发布了网站联系方式'
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
  const data = JSON.stringify(siteStore.contact, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'site-contact.json'
  link.click()
  URL.revokeObjectURL(url)
  
  adminStore.addActivity({
    type: 'download',
    target: 'site-contact',
    description: '导出了网站联系方式配置'
  })
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="site-contact-editor">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <h3>网站设置 - 联系方式</h3>
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
      <!-- 电话号码 -->
      <div class="form-section">
        <div class="section-header">
          <h4>联系电话</h4>
          <el-button v-if="isEditing" size="small" @click="addPhone">
            <i class="fas fa-plus mr-1"></i> 添加电话
          </el-button>
        </div>
        <div class="phones-list">
          <div v-for="(_, index) in formData.phones" :key="index" class="phone-item">
            <el-input
              v-model="formData.phones[index]"
              :disabled="!isEditing"
              :placeholder="`电话号码 ${index + 1}`"
            >
              <template #prefix>
                <i class="fas fa-phone-alt"></i>
              </template>
            </el-input>
            <el-button
              v-if="isEditing && formData.phones.length > 1"
              type="danger"
              text
              @click="removePhone(index)"
            >
              <i class="fas fa-trash"></i>
            </el-button>
          </div>
        </div>
      </div>

      <!-- 邮箱和工作时间 -->
      <div class="form-section">
        <h4>其他联系方式</h4>
        <div class="form-grid">
          <div class="form-item">
            <label>邮箱地址</label>
            <el-input v-model="formData.email" :disabled="!isEditing" placeholder="请输入邮箱地址">
              <template #prefix>
                <i class="fas fa-envelope"></i>
              </template>
            </el-input>
          </div>
          <div class="form-item">
            <label>工作时间</label>
            <el-input v-model="formData.workTime" :disabled="!isEditing" placeholder="如：周一至周五 8:00 - 17:30">
              <template #prefix>
                <i class="fas fa-clock"></i>
              </template>
            </el-input>
          </div>
          <div class="form-item full-width">
            <label>公司地址</label>
            <el-input v-model="formData.address" :disabled="!isEditing" placeholder="请输入公司地址">
              <template #prefix>
                <i class="fas fa-map-marker-alt"></i>
              </template>
            </el-input>
          </div>
        </div>
      </div>

      <!-- 二维码 -->
      <div class="form-section">
        <h4>二维码设置</h4>
        <div class="qrcode-grid">
          <div class="qrcode-item">
            <label>微信客服二维码</label>
            <el-input
              v-model="formData.wechatQrcode"
              :disabled="!isEditing"
              placeholder="图片路径"
            />
            <div class="qrcode-preview">
              <img v-if="formData.wechatQrcode" :src="formData.wechatQrcode" alt="微信二维码" />
              <div v-else class="no-qrcode">
                <i class="fab fa-weixin"></i>
              </div>
            </div>
          </div>
          <div class="qrcode-item">
            <label>公众号二维码</label>
            <el-input
              v-model="formData.gzhQrcode"
              :disabled="!isEditing"
              placeholder="图片路径"
            />
            <div class="qrcode-preview">
              <img v-if="formData.gzhQrcode" :src="formData.gzhQrcode" alt="公众号二维码" />
              <div v-else class="no-qrcode">
                <i class="fab fa-weixin"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.site-contact-editor {
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

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.section-header h4,
.form-section h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.form-section > h4 {
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.phones-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.phone-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.phone-item .el-input {
  flex: 1;
  max-width: 300px;
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

.qrcode-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.qrcode-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.qrcode-item label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.qrcode-preview {
  width: 120px;
  height: 120px;
  background: #f9fafb;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.qrcode-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.no-qrcode {
  color: #ccc;
  font-size: 40px;
}

.mr-1 {
  margin-right: 4px;
}

.status-tag {
  margin-right: 8px;
}

@media (max-width: 768px) {
  .form-grid,
  .qrcode-grid {
    grid-template-columns: 1fr;
  }
  
  .form-item.full-width {
    grid-column: span 1;
  }
}
</style>
