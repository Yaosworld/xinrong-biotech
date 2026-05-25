<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useSiteStore } from '@/stores/siteStore'
import { useAdminStore } from '@/stores/adminStore'
import { adminApi } from '@/api/contentApi'
import { ElMessage, ElMessageBox } from 'element-plus'
import VersionHistoryDialog from '../components/VersionHistoryDialog.vue'
import SiteImagePicker from '@/components/admin/SiteImagePicker.vue'

const siteStore = useSiteStore()
const adminStore = useAdminStore()

// ==================== 状态管理 ====================
// 编辑状态：'clean' | 'dirty' | 'saving' | 'publishing'
type EditStatus = 'clean' | 'dirty' | 'saving' | 'publishing'
const editStatus = ref<EditStatus>('clean')

// 内容状态：'draft' | 'published' | 'unpublished'
// draft: 有草稿未发布, published: 已发布且无更改, unpublished: 从未发布
type ContentStatus = 'draft' | 'published' | 'unpublished'
const contentStatus = ref<ContentStatus>('unpublished')

// 版本历史
const showVersionHistory = ref(false)
const currentVersion = ref(1)
const lastSavedAt = ref<Date | null>(null)
const lastPublishedAt = ref<Date | null>(null)

// 表单数据 - 公司信息
const companyForm = ref({
  name: '', shortName: '', englishName: '', logo: ''
})

// 表单数据 - 联系信息
const contactForm = ref({
  phones: ['', ''], email: '', qq: '', address: '',
  wechatQrcode: '', gzhQrcode: '', workTime: ''
})

// 表单数据 - 友情链接 & 页脚链接
const friendLinks = ref<{ name: string; url: string }[]>([])
const footerLinks = ref<{ name: string; path: string }[]>([])
const footerMetaForm = ref({
  copyrightText: '',
  icpNumber: '',
  icpUrl: '',
  publicSecurityNumber: '',
  publicSecurityUrl: ''
})

// 原始数据（用于检测变更和重置）
const originalData = ref<string>('')

// 预览模式
const previewMode = ref<'footer' | 'floating' | 'contact'>('footer')

// ==================== 计算属性 ====================
// 当前表单数据的序列化（用于变更检测）
const currentDataString = computed(() => JSON.stringify({
  company: companyForm.value,
  contact: contactForm.value,
  friendLinks: friendLinks.value,
  footerLinks: footerLinks.value,
  footerMeta: footerMetaForm.value
}))

// 是否有未保存的更改
const hasUnsavedChanges = computed(() => 
  originalData.value !== '' && currentDataString.value !== originalData.value
)

// 监听数据变化，自动更新编辑状态
watch(currentDataString, () => {
  if (editStatus.value !== 'saving' && editStatus.value !== 'publishing') {
    editStatus.value = hasUnsavedChanges.value ? 'dirty' : 'clean'
  }
})

// 状态标签配置
const statusConfig = computed(() => {
  // 优先显示编辑状态
  if (editStatus.value === 'dirty') {
    return { type: 'danger' as const, icon: 'fas fa-pen', text: '编辑中 · 未保存', pulse: true }
  }
  if (editStatus.value === 'saving') {
    return { type: 'warning' as const, icon: 'fas fa-spinner fa-spin', text: '保存中...', pulse: false }
  }
  if (editStatus.value === 'publishing') {
    return { type: 'warning' as const, icon: 'fas fa-spinner fa-spin', text: '发布中...', pulse: false }
  }
  // 显示内容状态
  if (contentStatus.value === 'draft') {
    return { type: 'warning' as const, icon: 'fas fa-file-alt', text: '草稿 · 待发布', pulse: false }
  }
  if (contentStatus.value === 'published') {
    return { type: 'success' as const, icon: 'fas fa-check-circle', text: '已发布', pulse: false }
  }
  return { type: 'info' as const, icon: 'fas fa-file', text: '未发布', pulse: false }
})

const previewPhones = computed(() => contactForm.value.phones.filter(p => p.trim()))
const validFriendLinks = computed(() => friendLinks.value.filter(l => l.name && l.url))

// ==================== 数据加载 ====================
const loadData = async () => {
  try {
    const content = await adminApi.getOne('site_config', 'main')
    const data = (content.draftData || content.publishedData || {}) as any
    
    companyForm.value = {
      name: data.company?.name || '',
      shortName: data.company?.shortName || '',
      englishName: data.company?.englishName || '',
      logo: data.company?.logo || ''
    }
    
    contactForm.value = {
      phones: data.contact?.phones ? [...data.contact.phones] : ['', ''],
      email: data.contact?.email || '',
      qq: data.contact?.qq || '',
      address: data.contact?.address || '',
      wechatQrcode: data.contact?.wechatQrcode || '',
      gzhQrcode: data.contact?.gzhQrcode || '',
      workTime: data.contact?.workTime || ''
    }
    
    friendLinks.value = data.friendLinks ? JSON.parse(JSON.stringify(data.friendLinks)) : []
    footerLinks.value = data.footerLinks ? JSON.parse(JSON.stringify(data.footerLinks)) : []
    footerMetaForm.value = {
      copyrightText: data.footerMeta?.copyrightText || '',
      icpNumber: data.footerMeta?.icpNumber || '',
      icpUrl: data.footerMeta?.icpUrl || '',
      publicSecurityNumber: data.footerMeta?.publicSecurityNumber || '',
      publicSecurityUrl: data.footerMeta?.publicSecurityUrl || ''
    }
    if (data.floatingPanel) {
      siteStore.floatingPanel = JSON.parse(JSON.stringify(data.floatingPanel))
    }
    
    // 确保至少有2个电话字段
    while (contactForm.value.phones.length < 2) {
      contactForm.value.phones.push('')
    }
    
    // 设置内容状态
    const hasDraft = content.draftData !== null
    const hasPublished = content.publishedData !== null
    const draftDiffersFromPublished = hasDraft && hasPublished && 
      JSON.stringify(content.draftData) !== JSON.stringify(content.publishedData)
    
    if (draftDiffersFromPublished || (hasDraft && !hasPublished)) {
      contentStatus.value = 'draft'
    } else if (hasPublished) {
      contentStatus.value = 'published'
    } else {
      contentStatus.value = 'unpublished'
    }
    
    currentVersion.value = content.version || 1
    if (content.updatedAt) lastSavedAt.value = new Date(content.updatedAt)
    
    // 同步到 store
    if (data.company) Object.assign(siteStore.company, data.company)
    if (data.contact) siteStore.contact = data.contact
    if (data.friendLinks) siteStore.friendLinks = data.friendLinks
    if (data.footerLinks) siteStore.footerLinks = data.footerLinks
    if (data.footerMeta) siteStore.footerMeta = data.footerMeta
    
    // 保存原始数据快照
    originalData.value = currentDataString.value
    editStatus.value = 'clean'
  } catch (e) {
    console.error('Admin API 加载失败:', e)
    originalData.value = currentDataString.value
    contentStatus.value = 'unpublished'
    editStatus.value = 'clean'
    ElMessage.error('加载网站设置失败，请检查后台接口')
  }
}

// ==================== 操作方法 ====================
const addPhone = () => { contactForm.value.phones.push('') }
const removePhone = (index: number) => {
  if (contactForm.value.phones.length > 1) contactForm.value.phones.splice(index, 1)
}
const addFriendLink = () => { friendLinks.value.push({ name: '', url: '' }) }
const removeFriendLink = (index: number) => { friendLinks.value.splice(index, 1) }

const buildFullSiteConfig = () => {
  const validPhones = contactForm.value.phones.filter(p => p.trim())
  return {
    company: companyForm.value,
    contact: { ...contactForm.value, phones: validPhones },
    friendLinks: friendLinks.value.filter(l => l.name && l.url),
    footerLinks: footerLinks.value,
    footerMeta: footerMetaForm.value,
    floatingPanel: siteStore.floatingPanel
  }
}

// 保存草稿
const saveData = async () => {
  try {
    editStatus.value = 'saving'
    
    const fullConfig = buildFullSiteConfig()
    await adminApi.saveDraft('site_config', 'main', fullConfig)
    
    // 更新 store
    Object.assign(siteStore.company, companyForm.value)
    Object.assign(siteStore.contact, fullConfig.contact)
    siteStore.friendLinks.splice(0, siteStore.friendLinks.length, ...fullConfig.friendLinks)
    siteStore.footerLinks.splice(0, siteStore.footerLinks.length, ...footerLinks.value)
    Object.assign(siteStore.footerMeta, fullConfig.footerMeta)
    
    // 更新状态
    originalData.value = currentDataString.value
    lastSavedAt.value = new Date()
    contentStatus.value = 'draft'
    editStatus.value = 'clean'
    
    adminStore.addActivity({ type: 'modify', target: 'site-settings', description: '保存了网站设置草稿' })
    ElMessage.success('草稿已保存')
  } catch (error) {
    editStatus.value = hasUnsavedChanges.value ? 'dirty' : 'clean'
    ElMessage.error('保存失败')
    console.error(error)
  }
}

// 发布数据
const showPublishDialog = ref(false)
const publishSummary = ref('')

const openPublishDialog = async () => {
  // 如果有未保存的更改，先提示保存
  if (hasUnsavedChanges.value) {
    try {
      await ElMessageBox.confirm(
        '您有未保存的更改，发布前需要先保存。是否继续？',
        '提示',
        { confirmButtonText: '保存并发布', cancelButtonText: '取消', type: 'warning' }
      )
    } catch { return }
  }
  
  publishSummary.value = ''
  showPublishDialog.value = true
}

const publishData = async () => {
  try {
    editStatus.value = 'publishing'
    showPublishDialog.value = false
    
    const fullConfig = buildFullSiteConfig()
    await adminApi.saveDraft('site_config', 'main', fullConfig)
    const result = await adminApi.publish('site_config', 'main', publishSummary.value || undefined)
    
    // 更新状态和版本号
    originalData.value = currentDataString.value
    lastPublishedAt.value = new Date()
    currentVersion.value = result.version  // 更新版本号
    contentStatus.value = 'published'
    editStatus.value = 'clean'
    siteStore.clearCache()
    
    adminStore.addActivity({ type: 'modify', target: 'site-settings', description: `发布了网站设置 v${result.version}` })
    ElMessage.success(`发布成功！当前版本 v${result.version}`)
  } catch (error) {
    editStatus.value = hasUnsavedChanges.value ? 'dirty' : 'clean'
    ElMessage.error('发布失败')
    console.error(error)
  }
}

// 重置数据
const resetData = async () => {
  if (!hasUnsavedChanges.value) {
    ElMessage.info('没有需要重置的更改')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      '确定要放弃当前的更改吗？',
      '确认重置',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    await loadData()
    ElMessage.success('已重置为上次保存的内容')
  } catch {}
}

// 导出配置
const exportConfig = () => {
  const data = JSON.stringify(buildFullSiteConfig(), null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `site-config-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
  adminStore.addActivity({ type: 'download', target: 'site-settings', description: '导出了网站配置' })
}

// 版本回滚
const handleVersionRollback = async () => {
  await loadData()
  ElMessage.info('数据已回滚，请检查后重新发布')
}

const getImageUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return url.startsWith('/') ? url : `/${url}`
}

// ==================== 离开页面保护 ====================
// 浏览器关闭/刷新保护
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (hasUnsavedChanges.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

// 路由离开保护
onBeforeRouteLeave(async (_to, _from, next) => {
  if (hasUnsavedChanges.value) {
    try {
      await ElMessageBox.confirm(
        '您有未保存的更改，确定要离开吗？',
        '提示',
        { confirmButtonText: '离开', cancelButtonText: '留下', type: 'warning' }
      )
      next()
    } catch {
      next(false)
    }
  } else {
    next()
  }
})

onMounted(() => {
  loadData()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <div class="site-settings">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2><i class="fas fa-cog"></i> 网站设置</h2>
        <span class="subtitle">管理公司信息、联系方式、页脚备案和友情链接</span>
      </div>
      <div class="header-right">
        <!-- 状态标签 -->
        <el-tag :type="statusConfig.type" size="small" :class="['status-tag', { pulse: statusConfig.pulse }]">
          <i :class="statusConfig.icon" class="mr-1"></i> {{ statusConfig.text }}
        </el-tag>
        <el-tag type="info" size="small" class="version-tag">v{{ currentVersion }}</el-tag>
        
        <el-button @click="showVersionHistory = true" :disabled="editStatus === 'saving' || editStatus === 'publishing'">
          <i class="fas fa-history mr-1"></i> 版本历史
        </el-button>
        <el-button @click="resetData" :disabled="!hasUnsavedChanges || editStatus === 'saving' || editStatus === 'publishing'">
          <i class="fas fa-undo mr-1"></i> 重置
        </el-button>
        <el-button @click="exportConfig">
          <i class="fas fa-download mr-1"></i> 导出
        </el-button>
        <el-button 
          :loading="editStatus === 'saving'" 
          :disabled="!hasUnsavedChanges || editStatus === 'publishing'"
          @click="saveData"
        >
          <i class="fas fa-save mr-1"></i> 保存草稿
        </el-button>
        <el-button 
          type="primary" 
          :loading="editStatus === 'publishing'" 
          :disabled="editStatus === 'saving'"
          @click="openPublishDialog"
        >
          <i class="fas fa-cloud-upload-alt mr-1"></i> 发布
        </el-button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-area">
      <!-- 编辑区域 - 左右布局 -->
      <div class="edit-area-split">
        <!-- 左侧面板：公司信息 + 友情链接 -->
        <div class="left-panels">
          <!-- 公司信息 -->
          <div class="edit-panel">
            <div class="panel-header"><h4><i class="fas fa-building"></i> 公司信息</h4></div>
            <div class="panel-body">
              <div class="form-grid">
                <div class="form-item">
                  <label>公司全称</label>
                  <el-input v-model="companyForm.name" placeholder="请输入公司全称" />
                </div>
                <div class="form-item">
                  <label>公司简称</label>
                  <el-input v-model="companyForm.shortName" placeholder="请输入公司简称" />
                </div>
                <div class="form-item full-width">
                  <label>英文名称</label>
                  <el-input v-model="companyForm.englishName" placeholder="请输入英文名称" />
                </div>
                <div class="form-item full-width">
                  <label>公司 Logo</label>
                  <SiteImagePicker
                    v-model="companyForm.logo"
                    placeholder="点击选择 Logo 图片"
                    label="选择公司 Logo"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 友情链接 -->
          <div class="edit-panel">
            <div class="panel-header">
              <h4><i class="fas fa-link"></i> 友情链接</h4>
              <el-button size="small" type="primary" plain @click="addFriendLink"><i class="fas fa-plus mr-1"></i> 添加</el-button>
            </div>
            <div class="panel-body">
              <div class="links-list">
                <div v-for="(link, index) in friendLinks" :key="index" class="link-item">
                  <el-input v-model="link.name" placeholder="链接名称" style="width: 100px" size="small" />
                  <el-input v-model="link.url" placeholder="链接地址" style="flex: 1" size="small" />
                  <el-button type="danger" text circle size="small" @click="removeFriendLink(index)"><i class="fas fa-times"></i></el-button>
                </div>
                <div v-if="friendLinks.length === 0" class="empty-links">暂无友情链接，点击添加</div>
              </div>
            </div>
          </div>

          <div class="edit-panel">
            <div class="panel-header"><h4><i class="fas fa-id-card"></i> 页脚与备案</h4></div>
            <div class="panel-body">
              <div class="form-grid">
                <div class="form-item full-width">
                  <label>版权文案</label>
                  <el-input v-model="footerMetaForm.copyrightText" placeholder="如：© 2026 广州信荣生物科技有限公司 版权所有" />
                </div>
                <div class="form-item">
                  <label>ICP备案号</label>
                  <el-input v-model="footerMetaForm.icpNumber" placeholder="请输入 ICP 备案号" />
                </div>
                <div class="form-item">
                  <label>ICP备案链接</label>
                  <el-input v-model="footerMetaForm.icpUrl" placeholder="https://beian.miit.gov.cn/" />
                </div>
                <div class="form-item">
                  <label>公安备案号</label>
                  <el-input v-model="footerMetaForm.publicSecurityNumber" placeholder="请输入公安备案号" />
                </div>
                <div class="form-item">
                  <label>公安备案链接</label>
                  <el-input v-model="footerMetaForm.publicSecurityUrl" placeholder="http://www.beian.gov.cn/portal/registerSystemInfo" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧面板：联系信息 -->
        <div class="right-panel">
          <div class="edit-panel full-height">
            <div class="panel-header"><h4><i class="fas fa-address-book"></i> 联系信息</h4></div>
            <div class="panel-body">
              <div class="form-section">
                <div class="section-title">
                  <span>联系电话</span>
                  <el-button size="small" type="primary" plain @click="addPhone"><i class="fas fa-plus mr-1"></i> 添加</el-button>
                </div>
                <div class="phones-list">
                  <div v-for="(_, index) in contactForm.phones" :key="index" class="phone-item">
                    <el-input v-model="contactForm.phones[index]" :placeholder="`电话 ${index + 1}`">
                      <template #prefix><i class="fas fa-phone-alt"></i></template>
                    </el-input>
                    <el-button v-if="contactForm.phones.length > 1" type="danger" text circle @click="removePhone(index)">
                      <i class="fas fa-times"></i>
                    </el-button>
                  </div>
                </div>
              </div>
              <div class="form-grid mt-4">
                <div class="form-item">
                  <label>邮箱地址</label>
                  <el-input v-model="contactForm.email" placeholder="请输入邮箱">
                    <template #prefix><i class="fas fa-envelope"></i></template>
                  </el-input>
                </div>
                <div class="form-item">
                  <label>QQ号码</label>
                  <el-input v-model="contactForm.qq" placeholder="请输入QQ号码">
                    <template #prefix><i class="fab fa-qq"></i></template>
                  </el-input>
                </div>
                <div class="form-item">
                  <label>工作时间</label>
                  <el-input v-model="contactForm.workTime" placeholder="如：周一至周五 8:00 - 17:30">
                    <template #prefix><i class="fas fa-clock"></i></template>
                  </el-input>
                </div>
                <div class="form-item full-width">
                  <label>公司地址</label>
                  <el-input v-model="contactForm.address" placeholder="请输入公司地址">
                    <template #prefix><i class="fas fa-map-marker-alt"></i></template>
                  </el-input>
                </div>
              </div>
              <div class="qrcode-section mt-4">
                <div class="qrcode-upload-item">
                  <label>微信客服二维码</label>
                  <SiteImagePicker
                    v-model="contactForm.wechatQrcode"
                    placeholder="点击选择微信二维码"
                    label="选择微信客服二维码"
                  />
                </div>
                <div class="qrcode-upload-item">
                  <label>公众号二维码</label>
                  <SiteImagePicker
                    v-model="contactForm.gzhQrcode"
                    placeholder="点击选择公众号二维码"
                    label="选择公众号二维码"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 预览区域 -->
      <div class="preview-area">
        <div class="preview-header">
          <div class="preview-title"><i class="fas fa-eye"></i><span>效果预览</span></div>
          <div class="preview-tabs">
            <span class="preview-tab" :class="{ active: previewMode === 'footer' }" @click="previewMode = 'footer'">页脚</span>
            <span class="preview-tab" :class="{ active: previewMode === 'floating' }" @click="previewMode = 'floating'">悬浮面板</span>
            <span class="preview-tab" :class="{ active: previewMode === 'contact' }" @click="previewMode = 'contact'">联系弹窗</span>
          </div>
        </div>
        
        <!-- 页脚预览 -->
        <div v-if="previewMode === 'footer'" class="preview-content footer-preview">
          <div class="mock-footer">
            <div class="footer-main">
              <div class="footer-company">
                <div class="company-header">
                  <div class="company-logo">
                    <img v-if="companyForm.logo" :src="getImageUrl(companyForm.logo)" alt="Logo" />
                    <span v-else>XR</span>
                  </div>
                  <div class="company-info">
                    <div class="company-name">{{ companyForm.name || '公司名称' }}</div>
                    <div class="company-en">{{ companyForm.englishName || 'COMPANY NAME' }}</div>
                  </div>
                </div>
                <div class="qrcodes">
                  <div class="qr-item">
                    <div class="qr-box">
                      <img v-if="contactForm.wechatQrcode" :src="getImageUrl(contactForm.wechatQrcode)" />
                      <i v-else class="fab fa-weixin"></i>
                    </div>
                    <span>微信客服</span>
                  </div>
                  <div class="qr-item">
                    <div class="qr-box">
                      <img v-if="contactForm.gzhQrcode" :src="getImageUrl(contactForm.gzhQrcode)" />
                      <i v-else class="fab fa-weixin"></i>
                    </div>
                    <span>微信公众号</span>
                  </div>
                </div>
              </div>
              <div class="footer-links">
                <h4>网站服务</h4>
                <ul><li v-for="link in footerLinks" :key="link.name">{{ link.name }}</li></ul>
              </div>
              <div class="footer-links">
                <h4>友情链接</h4>
                <ul>
                  <li v-for="link in validFriendLinks" :key="link.name">{{ link.name }}</li>
                  <li v-if="validFriendLinks.length === 0" class="empty">暂无</li>
                </ul>
              </div>
              <div class="footer-contact">
                <h4>联系我们</h4>
                <div class="contact-item" v-for="phone in previewPhones" :key="phone">
                  <i class="fas fa-phone-alt"></i><span>{{ phone }}</span>
                </div>
                <div class="contact-item"><i class="fas fa-envelope"></i><span>{{ contactForm.email || '暂未设置邮箱' }}</span></div>
                <div class="contact-item"><i class="fas fa-map-marker-alt"></i><span>{{ contactForm.address || '暂未设置公司地址' }}</span></div>
              </div>
            </div>
            <div class="footer-copyright">
              {{ footerMetaForm.copyrightText || '暂未设置版权文案' }}
            </div>
            <div v-if="footerMetaForm.icpNumber || footerMetaForm.publicSecurityNumber" class="footer-records">
              <span v-if="footerMetaForm.icpNumber">ICP备案号：{{ footerMetaForm.icpNumber }}</span>
              <span v-if="footerMetaForm.publicSecurityNumber">{{ footerMetaForm.publicSecurityNumber }}</span>
            </div>
          </div>
        </div>

        <!-- 悬浮面板预览 -->
        <div v-if="previewMode === 'floating'" class="preview-content floating-preview">
          <div class="floating-panel-row">
            <div class="float-group">
              <div class="float-item phone"><i class="fas fa-phone-alt"></i></div>
              <div class="float-tooltip">
                <div class="tooltip-title">联系电话</div>
                <div class="tooltip-content-list">
                  <div v-for="(phone, i) in previewPhones" :key="i" class="tooltip-item">
                    <span class="item-label">号码 {{ i + 1 }}：</span>
                    <span class="item-value">{{ phone }}</span>
                  </div>
                  <div v-if="previewPhones.length === 0" class="tooltip-item">暂无电话</div>
                </div>
              </div>
            </div>
            <div class="float-group">
              <div class="float-item email"><i class="fas fa-envelope"></i></div>
              <div class="float-tooltip">
                <div class="tooltip-title">联系方式</div>
                <div class="tooltip-content-list">
                  <div class="tooltip-item">
                    <span class="item-label">邮箱：</span>
                    <span class="item-value">{{ contactForm.email || '暂未设置邮箱' }}</span>
                  </div>
                  <div v-if="contactForm.qq" class="tooltip-item">
                    <span class="item-label">QQ：</span>
                    <span class="item-value">{{ contactForm.qq }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="float-group">
              <div class="float-item social"><i class="fab fa-weixin"></i></div>
              <div class="float-tooltip">
                <div class="tooltip-title">扫码关注</div>
                <div class="tooltip-qr">
                  <img v-if="contactForm.wechatQrcode" :src="getImageUrl(contactForm.wechatQrcode)" />
                  <i v-else class="fab fa-weixin"></i>
                </div>
              </div>
            </div>
            <div class="float-group">
              <div class="float-item top"><i class="fas fa-arrow-up"></i></div>
              <div class="float-tooltip">
                <div class="tooltip-title">返回顶部</div>
                <div class="tooltip-content-list">点击回到页面顶部</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 联系弹窗预览 -->
        <div v-if="previewMode === 'contact'" class="preview-content contact-preview">
          <div class="mock-modal">
            <div class="modal-body">
              <div class="contact-cards">
                <div class="contact-card">
                  <div class="card-header">
                    <div class="card-icon green"><i class="fab fa-weixin"></i></div>
                    <div class="card-text"><h4>微信客服</h4><p>扫码添加专属客服</p></div>
                  </div>
                  <div class="card-qr">
                    <img v-if="contactForm.wechatQrcode" :src="getImageUrl(contactForm.wechatQrcode)" />
                    <i v-else class="fab fa-weixin"></i>
                  </div>
                </div>
                <div class="contact-card">
                  <div class="card-header">
                    <div class="card-icon blue"><i class="fas fa-phone-alt"></i></div>
                    <div class="card-text"><h4>电话咨询</h4><p>欢迎致电咨询</p></div>
                  </div>
                  <div class="card-phones">
                    <div v-for="phone in previewPhones" :key="phone" class="phone-box"><i class="fas fa-mobile-alt"></i><span>{{ phone }}</span></div>
                  </div>
                </div>
                <div class="contact-card">
                  <div class="card-header">
                    <div class="card-icon orange"><i class="fas fa-envelope"></i></div>
                    <div class="card-text"><h4>邮件咨询</h4><p>商务合作与建议反馈</p></div>
                  </div>
                  <div class="card-email">
                    <div class="email-box"><i class="fas fa-at"></i><span>{{ contactForm.email || '暂未设置邮箱' }}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 版本历史对话框 -->
    <VersionHistoryDialog
      v-model:visible="showVersionHistory"
      content-type="site_config"
      content-key="main"
      title="网站配置 - 版本历史"
      @rollback="handleVersionRollback"
    />
    
    <!-- 发布确认对话框 -->
    <el-dialog
      v-model="showPublishDialog"
      title="发布确认"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="publish-dialog-content">
        <div class="publish-info">
          <i class="fas fa-info-circle"></i>
          <span>发布后前台页面将立即更新，当前版本 v{{ currentVersion }} 将升级为 v{{ currentVersion + 1 }}</span>
        </div>
        <div class="publish-form">
          <label>变更说明（可选）</label>
          <el-input
            v-model="publishSummary"
            type="textarea"
            :rows="3"
            placeholder="简要描述本次发布的主要变更，方便日后回滚时识别版本..."
            maxlength="200"
            show-word-limit
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="showPublishDialog = false">取消</el-button>
        <el-button type="primary" @click="publishData" :loading="editStatus === 'publishing'">
          <i class="fas fa-cloud-upload-alt mr-1"></i> 确认发布
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.site-settings {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--admin-border);
  background: linear-gradient(135deg, var(--admin-surface) 0%, #fff 100%);
}

.header-left h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-left h2 i { color: #05548C; }
.subtitle { display: block; margin-top: 4px; font-size: 13px; color: #999; }
.header-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

/* 状态标签样式 */
.status-tag { margin-right: 4px; }
.status-tag.pulse {
  animation: pulse-animation 1.5s infinite;
}
@keyframes pulse-animation {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
.version-tag { margin-right: 8px; }

.content-area { padding: 20px 24px; }

/* 左右分栏布局 */
.edit-area-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.left-panels { display: flex; flex-direction: column; gap: 16px; }
.right-panel { display: flex; flex-direction: column; }
.edit-panel { border: 1px solid var(--admin-border); border-radius: 10px; overflow: hidden; }
.edit-panel.full-height { flex: 1; }

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--admin-panel-bg);
  border-bottom: 1px solid var(--admin-border);
}

.panel-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-header h4 i { color: #05548C; }
.panel-body { padding: 16px; }

.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.form-item { display: flex; flex-direction: column; gap: 6px; }
.form-item.full-width { grid-column: span 2; }
.form-item label { font-size: 13px; color: #666; font-weight: 500; }

.form-section { margin-bottom: 12px; }
.section-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 13px; color: #666; font-weight: 500; }
.phones-list { display: flex; flex-direction: column; gap: 8px; }
.phone-item { display: flex; align-items: center; gap: 8px; }
.phone-item .el-input { flex: 1; }

.logo-preview-box { margin-top: 14px; display: flex; align-items: center; gap: 12px; }
.preview-label { font-size: 13px; color: #666; }
.logo-preview { width: 100px; height: 50px; background: var(--admin-panel-bg); border: 1px solid var(--admin-border); border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.qrcode-section { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.qrcode-upload-item { display: flex; flex-direction: column; gap: 8px; }
.qrcode-upload-item label { font-size: 13px; color: #666; font-weight: 500; }

.links-list { display: flex; flex-direction: column; gap: 8px; }
.link-item { display: flex; align-items: center; gap: 8px; }
.empty-links { text-align: center; padding: 16px; color: #999; font-size: 13px; }

/* 预览区域 */
.preview-area { border: 1px solid var(--admin-border); border-radius: 10px; overflow: hidden; }
.preview-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--admin-panel-bg); border-bottom: 1px solid var(--admin-border); }
.preview-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #333; }
.preview-title i { color: #05548C; }
.preview-tabs { display: flex; gap: 4px; }
.preview-tab { padding: 6px 14px; font-size: 13px; color: #666; cursor: pointer; border-radius: 6px; transition: all 0.2s; }
.preview-tab:hover { background: rgba(5, 84, 140, 0.1); color: #05548C; }
.preview-tab.active { background: #05548C; color: #fff; }
.preview-content { padding: 20px; min-height: 320px; background: var(--admin-surface-alt); }

/* 页脚预览 */
.mock-footer { background: #1a1a2e; border-radius: 8px; overflow: hidden; }
.footer-main { display: grid; grid-template-columns: 2fr 1fr 1fr 1.5fr; gap: 20px; padding: 20px; }
.footer-company { color: #fff; }
.company-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.company-logo { width: 40px; height: 40px; background: #fff; border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.company-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
.company-logo span { font-weight: bold; color: #05548C; }
.company-name { font-size: 13px; font-weight: 600; }
.company-en { font-size: 8px; color: rgba(255,255,255,0.5); }
.qrcodes { display: flex; gap: 12px; }
.qr-item { text-align: center; }
.qr-box { width: 50px; height: 50px; background: #fff; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; overflow: hidden; }
.qr-box img { width: 100%; height: 100%; object-fit: contain; }
.qr-box i { color: #07c160; font-size: 24px; }
.qr-item span { font-size: 9px; color: rgba(255,255,255,0.7); }
.footer-links { color: #fff; }
.footer-links h4 { margin: 0 0 10px; font-size: 12px; font-weight: 600; }
.footer-links ul { list-style: none; padding: 0; margin: 0; }
.footer-links li { font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 6px; }
.footer-links li.empty { font-style: italic; }
.footer-contact { color: #fff; }
.footer-contact h4 { margin: 0 0 10px; font-size: 12px; font-weight: 600; }
.footer-contact .contact-item { display: flex; align-items: flex-start; gap: 6px; font-size: 10px; color: rgba(255,255,255,0.6); margin-bottom: 6px; }
.footer-contact .contact-item i { margin-top: 2px; font-size: 9px; }
.footer-copyright { background: rgba(0,0,0,0.3); padding: 10px; text-align: center; font-size: 10px; color: rgba(255,255,255,0.5); }
.footer-records { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; padding: 8px 10px 12px; font-size: 9px; color: rgba(255,255,255,0.45); background: rgba(0,0,0,0.18); }

/* 悬浮面板预览 */
.floating-preview { display: flex; justify-content: center; align-items: center; }
.floating-panel-row { display: flex; gap: 40px; align-items: flex-start; }
.float-group { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.float-item { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; cursor: pointer; border: 3px solid #080808; box-shadow: 0 4px 12px rgba(0,0,0,0.15); color: white; }
.float-item.phone { background: linear-gradient(45deg, #10b981, #1cc285); }
.float-item.email { background: linear-gradient(45deg, #f59e0b, #fbbf24); }
.float-item.social { background: linear-gradient(45deg, #d84040, #d84040); }
.float-item.top { background: linear-gradient(45deg, #05548C, #43CEED); }
.float-tooltip { background: #fff; padding: 15px 20px; border-radius: 12px; border: 2px solid #080808; box-shadow: 0 8px 30px rgba(0,0,0,0.15); font-size: 14px; text-align: left; white-space: nowrap; }
.tooltip-title { font-weight: bold; color: #333; margin-bottom: 8px; font-size: 16px; }
.tooltip-content-list { color: #666; line-height: 1.5; }
.tooltip-item { margin-bottom: 5px; }
.tooltip-item:last-child { margin-bottom: 0; }
.item-label { font-weight: 600; color: #333; margin-right: 5px; }
.item-value { color: #2563eb; font-weight: 500; }
.tooltip-qr { width: 120px; height: 120px; background: var(--admin-border); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 8px auto 0; overflow: hidden; }
.tooltip-qr img { width: 100%; height: 100%; object-fit: cover; }
.tooltip-qr i { font-size: 32px; color: #07c160; }

/* 联系弹窗预览 */
.contact-preview { display: flex; justify-content: center; align-items: flex-start; padding: 20px; }
.mock-modal { background: #fff; border-radius: 20px; box-shadow: 0 8px 30px rgba(0,0,0,0.15); width: 100%; max-width: 700px; overflow: hidden; }
.modal-body { padding: 24px; }
.contact-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.contact-card { background: #fff; border: 1px solid #f3f4f6; border-radius: 16px; padding: 20px 16px; text-align: center; transition: all 0.3s; }
.contact-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
.card-header { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 16px; }
.card-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.card-icon.green { background: #dcfce7; color: #16a34a; }
.card-icon.blue { background: #dbeafe; color: #2563eb; }
.card-icon.orange { background: #ffedd5; color: #ea580c; }
.card-text { text-align: left; }
.card-text h4 { margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #1f2937; }
.card-text p { margin: 0; font-size: 11px; color: #9ca3af; }
.card-qr { width: 80px; height: 80px; margin: 0 auto; padding: 4px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; display: flex; align-items: center; justify-content: center; }
.card-qr img { width: 100%; height: 100%; object-fit: contain; border-radius: 6px; }
.card-qr i { font-size: 40px; color: #07c160; }
.card-phones { display: flex; flex-direction: column; gap: 8px; }
.phone-box { display: flex; align-items: center; padding: 10px 12px; background: var(--admin-panel-bg); border-radius: 8px; font-size: 13px; color: #1f2937; }
.phone-box i { margin-right: 10px; color: #9ca3af; font-size: 12px; }
.card-email { display: flex; justify-content: center; }
.email-box { display: flex; align-items: center; padding: 10px 16px; background: var(--admin-panel-bg); border-radius: 8px; font-size: 13px; color: #1f2937; }
.email-box i { margin-right: 10px; color: #9ca3af; }

.mr-1 { margin-right: 4px; }
.mt-4 { margin-top: 16px; }

/* 发布对话框 */
.publish-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.publish-info {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  color: #0369a1;
  font-size: 13px;
  line-height: 1.5;
}

.publish-info i {
  margin-top: 2px;
  flex-shrink: 0;
}

.publish-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.publish-form label {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

@media (max-width: 1200px) {
  .edit-area-split { grid-template-columns: 1fr; }
  .footer-main { grid-template-columns: 1fr 1fr; }
  .contact-cards { grid-template-columns: 1fr; }
}
</style>
