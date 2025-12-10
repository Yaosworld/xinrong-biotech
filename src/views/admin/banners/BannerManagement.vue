<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useBannerStore, type StatItem } from '@/stores/bannerStore'
import { useAdminStore } from '@/stores/adminStore'
import { adminApi } from '@/api/contentApi'
import { ElMessage, ElMessageBox } from 'element-plus'
import VersionHistoryDialog from '../components/VersionHistoryDialog.vue'

const bannerStore = useBannerStore()
const adminStore = useAdminStore()

// 页面配置
const pageConfigs = [
  { id: 'products', title: '产品中心', icon: 'fas fa-box' },
  { id: 'promotions', title: '资讯中心', icon: 'fas fa-bullhorn' },
  { id: 'brands', title: '品牌中心', icon: 'fas fa-award' },
  { id: 'about', title: '关于我们', icon: 'fas fa-info-circle' }
]

// 当前选中的页面
const activeTab = ref('products')

// ==================== 状态管理 ====================
type EditStatus = 'clean' | 'dirty' | 'saving' | 'publishing'
const editStatus = ref<EditStatus>('clean')

type ContentStatus = 'draft' | 'published' | 'unpublished'
const contentStatus = ref<ContentStatus>('unpublished')

// 版本历史
const showVersionHistory = ref(false)
const currentVersion = ref(1)

// 发布对话框
const showPublishDialog = ref(false)
const publishSummary = ref('')

// 表单数据
const formData = ref({
  slogans: [] as string[],
  defaultStats: [] as StatItem[]
})

// 原始数据快照（用于变更检测）
const originalData = ref<string>('')

// ==================== 计算属性 ====================
const currentPageConfig = computed(() => 
  pageConfigs.find(p => p.id === activeTab.value)
)

const currentDataString = computed(() => JSON.stringify(formData.value))

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
  if (editStatus.value === 'dirty') {
    return { type: 'danger' as const, icon: 'fas fa-pen', text: '编辑中 · 未保存', pulse: true }
  }
  if (editStatus.value === 'saving') {
    return { type: 'warning' as const, icon: 'fas fa-spinner fa-spin', text: '保存中...', pulse: false }
  }
  if (editStatus.value === 'publishing') {
    return { type: 'warning' as const, icon: 'fas fa-spinner fa-spin', text: '发布中...', pulse: false }
  }
  if (contentStatus.value === 'draft') {
    return { type: 'warning' as const, icon: 'fas fa-file-alt', text: '草稿 · 待发布', pulse: false }
  }
  if (contentStatus.value === 'published') {
    return { type: 'success' as const, icon: 'fas fa-check-circle', text: '已发布', pulse: false }
  }
  return { type: 'info' as const, icon: 'fas fa-file', text: '未发布', pulse: false }
})

// ==================== 数据加载 ====================
const loadData = async () => {
  try {
    const content = await adminApi.getOne('banner', activeTab.value)
    const data = (content.draftData || content.publishedData || {}) as { slogans?: string[]; defaultStats?: StatItem[] }
    
    formData.value = {
      slogans: data.slogans ? [...data.slogans] : [],
      defaultStats: data.defaultStats ? data.defaultStats.map((s) => ({ ...s })) : []
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
    originalData.value = currentDataString.value
    editStatus.value = 'clean'
  } catch (e) {
    console.warn('Admin API 加载失败，降级到前台 Store:', e)
    const banner = bannerStore.getBanner(activeTab.value)
    if (banner) {
      formData.value = {
        slogans: [...banner.slogans],
        defaultStats: banner.defaultStats.map(s => ({ ...s }))
      }
    } else {
      formData.value = { slogans: [], defaultStats: [] }
    }
    originalData.value = currentDataString.value
    contentStatus.value = 'unpublished'
    editStatus.value = 'clean'
  }
}

// ==================== 操作方法 ====================
const addSlogan = () => { formData.value.slogans.push('') }
const removeSlogan = (index: number) => { formData.value.slogans.splice(index, 1) }

const addStat = () => {
  formData.value.defaultStats.push({ key: `stat_${Date.now()}`, number: '', label: '' })
}
const removeStat = (index: number) => { formData.value.defaultStats.splice(index, 1) }

const buildBannerData = () => {
  const validSlogans = formData.value.slogans.filter(s => s.trim())
  const validStats = formData.value.defaultStats.filter(s => s.number.trim() && s.label.trim())
  return { slogans: validSlogans, defaultStats: validStats }
}

// 保存草稿
const saveData = async () => {
  const bannerData = buildBannerData()
  if (bannerData.slogans.length === 0) {
    ElMessage.warning('请至少添加一条标语')
    return
  }

  try {
    editStatus.value = 'saving'
    await adminApi.saveDraft('banner', activeTab.value, bannerData)

    if (bannerStore.banners) {
      bannerStore.banners[activeTab.value] = {
        ...bannerStore.banners[activeTab.value],
        slogans: bannerData.slogans,
        defaultStats: bannerData.defaultStats
      }
    }

    // 更新表单数据为有效数据
    formData.value = {
      slogans: [...bannerData.slogans],
      defaultStats: bannerData.defaultStats.map(s => ({ ...s }))
    }
    originalData.value = currentDataString.value
    contentStatus.value = 'draft'
    editStatus.value = 'clean'

    adminStore.addActivity({
      type: 'modify',
      target: activeTab.value,
      description: `保存了 ${currentPageConfig.value?.title} 的横幅草稿`
    })
    ElMessage.success('草稿已保存')
  } catch (error) {
    editStatus.value = hasUnsavedChanges.value ? 'dirty' : 'clean'
    ElMessage.error('保存失败')
    console.error(error)
  }
}

// 打开发布对话框
const openPublishDialog = async () => {
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

// 发布数据
const publishData = async () => {
  const bannerData = buildBannerData()
  if (bannerData.slogans.length === 0) {
    ElMessage.warning('请至少添加一条标语')
    showPublishDialog.value = false
    return
  }

  try {
    editStatus.value = 'publishing'
    showPublishDialog.value = false

    await adminApi.saveDraft('banner', activeTab.value, bannerData)
    const result = await adminApi.publish('banner', activeTab.value, publishSummary.value || undefined)

    // 更新表单数据为有效数据
    formData.value = {
      slogans: [...bannerData.slogans],
      defaultStats: bannerData.defaultStats.map(s => ({ ...s }))
    }
    originalData.value = currentDataString.value
    currentVersion.value = result.version
    contentStatus.value = 'published'
    editStatus.value = 'clean'
    bannerStore.clearCache()

    adminStore.addActivity({
      type: 'modify',
      target: activeTab.value,
      description: `发布了 ${currentPageConfig.value?.title} 的横幅设置 v${result.version}`
    })
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
    await ElMessageBox.confirm('确定要放弃当前的更改吗？', '确认重置',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await loadData()
    ElMessage.success('已重置为上次保存的内容')
  } catch {}
}

// 导出配置
const exportConfig = () => {
  const banner = bannerStore.getBanner(activeTab.value)
  if (!banner) return

  const data = JSON.stringify(banner, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `banner-${activeTab.value}.json`
  link.click()
  URL.revokeObjectURL(url)

  adminStore.addActivity({
    type: 'download',
    target: activeTab.value,
    description: `导出了 ${currentPageConfig.value?.title} 的横幅配置`
  })
}

// 导出全部配置
const exportAllConfig = () => {
  const data = JSON.stringify(bannerStore.banners, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `banners-all-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)

  adminStore.addActivity({
    type: 'download',
    target: 'banners',
    description: '导出了所有页面的横幅配置'
  })
}

// 版本回滚
const handleVersionRollback = async () => {
  await loadData()
  ElMessage.info('数据已回滚，请检查后重新发布')
}

// ==================== 离开页面保护 ====================
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (hasUnsavedChanges.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onBeforeRouteLeave(async (_to, _from, next) => {
  if (hasUnsavedChanges.value) {
    try {
      await ElMessageBox.confirm('您有未保存的更改，确定要离开吗？', '提示',
        { confirmButtonText: '离开', cancelButtonText: '留下', type: 'warning' })
      next()
    } catch { next(false) }
  } else { next() }
})

// 切换标签时检查未保存更改
watch(activeTab, async (_newTab, oldTab) => {
  if (hasUnsavedChanges.value) {
    try {
      await ElMessageBox.confirm('您有未保存的更改，切换标签将丢失这些更改。是否继续？', '提示',
        { confirmButtonText: '继续', cancelButtonText: '取消', type: 'warning' })
      await loadData()
    } catch {
      activeTab.value = oldTab
    }
  } else {
    await loadData()
  }
}, { flush: 'pre' })

onMounted(() => {
  loadData()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <div class="banner-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2><i class="fas fa-image"></i> 横幅设置</h2>
        <span class="subtitle">管理各页面的横幅标语和统计数据</span>
      </div>
      <div class="header-right">
        <el-button @click="exportAllConfig">
          <i class="fas fa-download mr-1"></i> 导出全部
        </el-button>
      </div>
    </div>

    <!-- 页面标签 -->
    <div class="page-tabs">
      <div v-for="page in pageConfigs" :key="page.id" class="tab-item" :class="{ active: activeTab === page.id }" @click="activeTab = page.id">
        <i :class="page.icon"></i>
        <span>{{ page.title }}</span>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-area">
      <!-- 工具栏 -->
      <div class="content-toolbar">
        <div class="toolbar-title">
          <i :class="currentPageConfig?.icon"></i>
          <span>{{ currentPageConfig?.title }} - 横幅配置</span>
        </div>
        <div class="toolbar-actions">
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
          <el-button :loading="editStatus === 'saving'" :disabled="!hasUnsavedChanges || editStatus === 'publishing'" @click="saveData">
            <i class="fas fa-save mr-1"></i> 保存草稿
          </el-button>
          <el-button type="primary" :loading="editStatus === 'publishing'" :disabled="editStatus === 'saving'" @click="openPublishDialog">
            <i class="fas fa-cloud-upload-alt mr-1"></i> 发布
          </el-button>
        </div>
      </div>

      <!-- 编辑区域 -->
      <div class="edit-area">
        <!-- 标语编辑 -->
        <div class="edit-panel">
          <div class="panel-header">
            <h4><i class="fas fa-quote-left"></i> 标语设置</h4>
            <el-button size="small" type="primary" plain @click="addSlogan">
              <i class="fas fa-plus mr-1"></i> 添加
            </el-button>
          </div>
          <div class="panel-body">
            <div v-for="(_, index) in formData.slogans" :key="index" class="edit-item">
              <span class="item-index">{{ index + 1 }}</span>
              <el-input v-model="formData.slogans[index]" placeholder="请输入标语内容" />
              <el-button type="danger" text circle @click="removeSlogan(index)">
                <i class="fas fa-times"></i>
              </el-button>
            </div>
            <div v-if="formData.slogans.length === 0" class="empty-tip">
              <span>暂无标语，点击"添加"按钮添加</span>
            </div>
          </div>
        </div>

        <!-- 统计数据编辑 -->
        <div class="edit-panel">
          <div class="panel-header">
            <h4><i class="fas fa-chart-bar"></i> 统计数据设置</h4>
            <el-button size="small" type="primary" plain @click="addStat">
              <i class="fas fa-plus mr-1"></i> 添加
            </el-button>
          </div>
          <div class="panel-body">
            <div v-for="(stat, index) in formData.defaultStats" :key="stat.key" class="edit-item stat-item">
              <span class="item-index">{{ index + 1 }}</span>
              <el-input v-model="stat.number" placeholder="数值 (如: 100+)" style="width: 120px; flex-shrink: 0;" />
              <el-input v-model="stat.label" placeholder="标签 (如: 产品数量)" style="flex: 1" />
              <el-button type="danger" text circle @click="removeStat(index)">
                <i class="fas fa-times"></i>
              </el-button>
            </div>
            <div v-if="formData.defaultStats.length === 0" class="empty-tip">
              <span>暂无统计项，点击"添加"按钮添加</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 预览区域 -->
      <div class="preview-area">
        <div class="preview-header">
          <i class="fas fa-eye"></i>
          <span>效果预览</span>
        </div>
        <div class="preview-banner">
          <div class="banner-bg">
            <div class="banner-slogans">
              <div v-for="(slogan, index) in formData.slogans.filter(s => s.trim())" :key="index" class="banner-slogan">
                {{ slogan }}
              </div>
              <div v-if="formData.slogans.filter(s => s.trim()).length === 0" class="banner-slogan placeholder">
                请添加标语内容
              </div>
            </div>
            <div class="banner-stats" v-if="formData.defaultStats.filter(s => s.number.trim() && s.label.trim()).length > 0">
              <div v-for="stat in formData.defaultStats.filter(s => s.number.trim() && s.label.trim())" :key="stat.key" class="banner-stat">
                <span class="stat-number">{{ stat.number }}</span>
                <span class="stat-label">{{ stat.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 版本历史对话框 -->
    <VersionHistoryDialog v-model:visible="showVersionHistory" content-type="banner" :content-key="activeTab" :title="`${currentPageConfig?.title} 横幅 - 版本历史`" @rollback="handleVersionRollback" />
    
    <!-- 发布确认对话框 -->
    <el-dialog v-model="showPublishDialog" title="发布确认" width="500px" :close-on-click-modal="false">
      <div class="publish-dialog-content">
        <div class="publish-info">
          <i class="fas fa-info-circle"></i>
          <span>发布后前台页面将立即更新，当前版本 v{{ currentVersion }} 将升级为 v{{ currentVersion + 1 }}</span>
        </div>
        <div class="publish-form">
          <label>变更说明（可选）</label>
          <el-input v-model="publishSummary" type="textarea" :rows="3" placeholder="简要描述本次发布的主要变更，方便日后回滚时识别版本..." maxlength="200" show-word-limit />
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
.banner-management { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden; }

.page-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f0; background: linear-gradient(135deg, #f8f9ff 0%, #fff 100%); }
.header-left h2 { margin: 0; font-size: 18px; font-weight: 600; color: #333; display: flex; align-items: center; gap: 10px; }
.header-left h2 i { color: #667eea; }
.subtitle { display: block; margin-top: 4px; font-size: 13px; color: #999; }

.page-tabs { display: flex; border-bottom: 1px solid #f0f0f0; background: #fafafa; }
.tab-item { display: flex; align-items: center; gap: 8px; padding: 14px 24px; cursor: pointer; color: #666; font-size: 14px; border-bottom: 2px solid transparent; transition: all 0.2s; }
.tab-item:hover { color: #667eea; background: rgba(102, 126, 234, 0.05); }
.tab-item.active { color: #667eea; border-bottom-color: #667eea; background: #fff; }
.tab-item i { font-size: 16px; }

.content-area { padding: 20px 24px; }

.content-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.toolbar-title { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 600; color: #333; }
.toolbar-title i { color: #667eea; }
.toolbar-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

.status-tag { margin-right: 4px; }
.status-tag.pulse { animation: pulse-animation 1.5s infinite; }
@keyframes pulse-animation { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
.version-tag { margin-right: 8px; }

.edit-area { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
.edit-panel { border: 1px solid #e8e8e8; border-radius: 10px; overflow: hidden; }

.panel-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #f9fafb; border-bottom: 1px solid #e8e8e8; }
.panel-header h4 { margin: 0; font-size: 14px; font-weight: 600; color: #333; display: flex; align-items: center; gap: 8px; }
.panel-header h4 i { color: #667eea; }

.panel-body { padding: 16px; max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
.edit-item { display: flex; align-items: center; gap: 10px; }
.item-index { width: 24px; height: 24px; background: #667eea; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
.stat-item .el-input:first-of-type { flex-shrink: 0; }
.empty-tip { text-align: center; padding: 20px; color: #999; font-size: 13px; }

.preview-area { border: 1px solid #e8e8e8; border-radius: 10px; overflow: hidden; }
.preview-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #f9fafb; border-bottom: 1px solid #e8e8e8; font-size: 14px; font-weight: 600; color: #333; }
.preview-header i { color: #667eea; }
.preview-banner { padding: 16px; }

.banner-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 40px 30px; text-align: center; }
.banner-slogans { margin-bottom: 24px; }
.banner-slogan { font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 8px; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
.banner-slogan:last-child { margin-bottom: 0; }
.banner-slogan.placeholder { opacity: 0.6; font-style: italic; }

.banner-stats { display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; }
.banner-stat { display: flex; flex-direction: column; align-items: center; }
.banner-stat .stat-number { font-size: 32px; font-weight: 700; color: #fff; }
.banner-stat .stat-label { font-size: 14px; color: rgba(255, 255, 255, 0.85); margin-top: 4px; }

.publish-dialog-content { display: flex; flex-direction: column; gap: 16px; }
.publish-info { display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; color: #0369a1; font-size: 13px; line-height: 1.5; }
.publish-info i { margin-top: 2px; flex-shrink: 0; }
.publish-form { display: flex; flex-direction: column; gap: 8px; }
.publish-form label { font-size: 13px; font-weight: 500; color: #333; }

.mr-1 { margin-right: 4px; }

@media (max-width: 900px) {
  .edit-area { grid-template-columns: 1fr; }
  .page-tabs { overflow-x: auto; }
  .tab-item { white-space: nowrap; }
}
</style>
