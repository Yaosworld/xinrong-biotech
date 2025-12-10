<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useBannerStore, type StatItem } from '@/stores/bannerStore'
import { useContentEditor } from '@/hooks/useContentEditor'
import { ElMessageBox } from 'element-plus'
import VersionHistoryDialog from '../components/VersionHistoryDialog.vue'
import PublishDialog from '../components/PublishDialog.vue'
import EditorToolbar from '../components/EditorToolbar.vue'

const bannerStore = useBannerStore()

// 页面配置
const pageConfigs = [
  { id: 'products', title: '产品中心', icon: 'fas fa-box' },
  { id: 'promotions', title: '资讯中心', icon: 'fas fa-bullhorn' },
  { id: 'brands', title: '品牌中心', icon: 'fas fa-award' },
  { id: 'about', title: '关于我们', icon: 'fas fa-info-circle' }
]

const activeTab = ref('products')
const currentPageConfig = computed(() => pageConfigs.find(p => p.id === activeTab.value))

// 表单数据
const formData = ref({
  slogans: [] as string[],
  defaultStats: [] as StatItem[]
})

// 当前数据字符串（用于变更检测）
const currentDataString = computed(() => JSON.stringify(formData.value))

// 构建有效数据
const buildBannerData = () => {
  const validSlogans = formData.value.slogans.filter(s => s.trim())
  const validStats = formData.value.defaultStats.filter(s => s.number.trim() && s.label.trim())
  return { slogans: validSlogans, defaultStats: validStats }
}

// 使用通用编辑器 Hook
const editor = useContentEditor(currentDataString, {
  contentType: 'banner',
  contentKey: activeTab,
  buildData: buildBannerData,
  validateBeforeSave: () => {
    const data = buildBannerData()
    if (data.slogans.length === 0) return '请至少添加一条标语'
    return true
  },
  onDataLoaded: (data) => {
    const d = data as { slogans?: string[]; defaultStats?: StatItem[] } | null
    formData.value = {
      slogans: d?.slogans ? [...d.slogans] : [],
      defaultStats: d?.defaultStats ? d.defaultStats.map(s => ({ ...s })) : []
    }
    // 更新原始数据快照
    editor.updateOriginalData(currentDataString.value)
  },
  onSaveSuccess: () => {
    if (bannerStore.banners) {
      const data = buildBannerData()
      bannerStore.banners[activeTab.value] = {
        ...bannerStore.banners[activeTab.value],
        slogans: data.slogans,
        defaultStats: data.defaultStats
      }
    }
  },
  clearCache: () => bannerStore.clearCache(),
  activityTarget: activeTab.value,
  activityPrefix: `${currentPageConfig.value?.title || ''}横幅`
})

// 操作方法
const addSlogan = () => formData.value.slogans.push('')
const removeSlogan = (index: number) => formData.value.slogans.splice(index, 1)
const addStat = () => formData.value.defaultStats.push({ key: `stat_${Date.now()}`, number: '', label: '' })
const removeStat = (index: number) => formData.value.defaultStats.splice(index, 1)

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
}

// 切换标签时检查未保存更改
watch(activeTab, async (_newTab, oldTab) => {
  if (editor.hasUnsavedChanges.value) {
    try {
      await ElMessageBox.confirm('您有未保存的更改，切换标签将丢失这些更改。是否继续？', '提示',
        { confirmButtonText: '继续', cancelButtonText: '取消', type: 'warning' })
      await editor.loadData()
    } catch {
      activeTab.value = oldTab
    }
  } else {
    await editor.loadData()
  }
}, { flush: 'pre' })

onMounted(() => editor.loadData())
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
        <el-button @click="exportAllConfig"><i class="fas fa-download mr-1"></i> 导出全部</el-button>
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
        <EditorToolbar
          :status-config="editor.statusConfig.value"
          :current-version="editor.currentVersion.value"
          :has-unsaved-changes="editor.hasUnsavedChanges.value"
          :is-operating="editor.isOperating.value"
          :is-saving="editor.editStatus.value === 'saving'"
          :is-publishing="editor.editStatus.value === 'publishing'"
          @version-history="editor.showVersionHistory.value = true"
          @reset="editor.resetData"
          @export="editor.exportConfig(`banner-${activeTab}.json`)"
          @save="editor.saveData"
          @publish="editor.openPublishDialog"
        />
      </div>

      <!-- 编辑区域 -->
      <div class="edit-area">
        <!-- 标语编辑 -->
        <div class="edit-panel">
          <div class="panel-header">
            <h4><i class="fas fa-quote-left"></i> 标语设置</h4>
            <el-button size="small" type="primary" plain @click="addSlogan"><i class="fas fa-plus mr-1"></i> 添加</el-button>
          </div>
          <div class="panel-body">
            <div v-for="(_, index) in formData.slogans" :key="index" class="edit-item">
              <span class="item-index">{{ index + 1 }}</span>
              <el-input v-model="formData.slogans[index]" placeholder="请输入标语内容" />
              <el-button type="danger" text circle @click="removeSlogan(index)"><i class="fas fa-times"></i></el-button>
            </div>
            <div v-if="formData.slogans.length === 0" class="empty-tip">暂无标语，点击"添加"按钮添加</div>
          </div>
        </div>

        <!-- 统计数据编辑 -->
        <div class="edit-panel">
          <div class="panel-header">
            <h4><i class="fas fa-chart-bar"></i> 统计数据设置</h4>
            <el-button size="small" type="primary" plain @click="addStat"><i class="fas fa-plus mr-1"></i> 添加</el-button>
          </div>
          <div class="panel-body">
            <div v-for="(stat, index) in formData.defaultStats" :key="stat.key" class="edit-item stat-item">
              <span class="item-index">{{ index + 1 }}</span>
              <el-input v-model="stat.number" placeholder="数值 (如: 100+)" style="width: 120px; flex-shrink: 0;" />
              <el-input v-model="stat.label" placeholder="标签 (如: 产品数量)" style="flex: 1" />
              <el-button type="danger" text circle @click="removeStat(index)"><i class="fas fa-times"></i></el-button>
            </div>
            <div v-if="formData.defaultStats.length === 0" class="empty-tip">暂无统计项，点击"添加"按钮添加</div>
          </div>
        </div>
      </div>

      <!-- 预览区域 -->
      <div class="preview-area">
        <div class="preview-header"><i class="fas fa-eye"></i><span>效果预览</span></div>
        <div class="preview-banner">
          <div class="banner-bg">
            <div class="banner-slogans">
              <div v-for="(slogan, index) in formData.slogans.filter(s => s.trim())" :key="index" class="banner-slogan">{{ slogan }}</div>
              <div v-if="formData.slogans.filter(s => s.trim()).length === 0" class="banner-slogan placeholder">请添加标语内容</div>
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
    <VersionHistoryDialog v-model:visible="editor.showVersionHistory.value" content-type="banner" :content-key="activeTab" :title="`${currentPageConfig?.title} 横幅 - 版本历史`" @rollback="editor.handleVersionRollback" />
    
    <!-- 发布对话框 -->
    <PublishDialog
      v-model:visible="editor.showPublishDialog.value"
      v-model:publish-summary="editor.publishSummary.value"
      :current-version="editor.currentVersion.value"
      :is-publishing="editor.editStatus.value === 'publishing'"
      @confirm="editor.publishData"
    />
  </div>
</template>

<style scoped>
@import '../styles/admin-common.css';

.banner-management { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden; }

.edit-area { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
.panel-body { max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
.stat-item .el-input:first-of-type { flex-shrink: 0; }

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

@media (max-width: 900px) { .edit-area { grid-template-columns: 1fr; } }
</style>
