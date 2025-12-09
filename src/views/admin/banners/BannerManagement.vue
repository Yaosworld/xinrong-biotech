<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useBannerStore, type StatItem } from '@/stores/bannerStore'
import { useAdminStore } from '@/stores/adminStore'
import { adminApi } from '@/api/contentApi'
import { ElMessage, ElMessageBox } from 'element-plus'

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

// 保存状态
const isSaving = ref(false)
const isPublishing = ref(false)
const hasUnpublishedChanges = ref(false)

// 表单数据
const formData = ref({
  slogans: [] as string[],
  defaultStats: [] as StatItem[]
})

// 原始数据
const originalData = ref({
  slogans: [] as string[],
  defaultStats: [] as StatItem[]
})

// 当前页面配置
const currentPageConfig = computed(() => 
  pageConfigs.find(p => p.id === activeTab.value)
)

// 从 Admin API 加载数据（包含草稿）
const loadData = async () => {
  try {
    // 从 Admin API 加载（优先使用草稿数据）
    const content = await adminApi.getOne('banner', activeTab.value)
    const data = (content.draftData || content.publishedData || {}) as { slogans?: string[]; defaultStats?: StatItem[] }
    
    formData.value = {
      slogans: data.slogans ? [...data.slogans] : [],
      defaultStats: data.defaultStats ? data.defaultStats.map((s) => ({ ...s })) : []
    }
    originalData.value = {
      slogans: data.slogans ? [...data.slogans] : [],
      defaultStats: data.defaultStats ? data.defaultStats.map((s) => ({ ...s })) : []
    }
    
    // 检查是否有未发布的更改
    hasUnpublishedChanges.value = content.draftData !== null && 
      JSON.stringify(content.draftData) !== JSON.stringify(content.publishedData)
  } catch (e) {
    console.warn('Admin API 加载失败，降级到前台 Store:', e)
    // 降级到前台 Store
    const banner = bannerStore.getBanner(activeTab.value)
    if (banner) {
      formData.value = {
        slogans: [...banner.slogans],
        defaultStats: banner.defaultStats.map(s => ({ ...s }))
      }
      originalData.value = {
        slogans: [...banner.slogans],
        defaultStats: banner.defaultStats.map(s => ({ ...s }))
      }
    } else {
      formData.value = { slogans: [], defaultStats: [] }
      originalData.value = { slogans: [], defaultStats: [] }
    }
    hasUnpublishedChanges.value = false
  }
}

// 添加标语
const addSlogan = () => {
  formData.value.slogans.push('')
}

// 删除标语
const removeSlogan = (index: number) => {
  formData.value.slogans.splice(index, 1)
}

// 添加统计项
const addStat = () => {
  formData.value.defaultStats.push({
    key: `stat_${Date.now()}`,
    number: '',
    label: ''
  })
}

// 删除统计项
const removeStat = (index: number) => {
  formData.value.defaultStats.splice(index, 1)
}

// 保存数据（草稿）
const saveData = async () => {
  const validSlogans = formData.value.slogans.filter(s => s.trim())
  if (validSlogans.length === 0) {
    ElMessage.warning('请至少添加一条标语')
    return
  }

  const validStats = formData.value.defaultStats.filter(
    s => s.number.trim() && s.label.trim()
  )

  try {
    isSaving.value = true

    const bannerData = {
      slogans: validSlogans,
      defaultStats: validStats
    }

    // 保存到后端草稿
    await adminApi.saveDraft('banner', activeTab.value, bannerData)

    if (bannerStore.banners) {
      bannerStore.banners[activeTab.value] = {
        ...bannerStore.banners[activeTab.value],
        slogans: validSlogans,
        defaultStats: validStats
      }
    }

    adminStore.addActivity({
      type: 'modify',
      target: activeTab.value,
      description: `保存了 ${currentPageConfig.value?.title} 的横幅草稿`
    })

    originalData.value = {
      slogans: [...validSlogans],
      defaultStats: validStats.map(s => ({ ...s }))
    }

    formData.value = {
      slogans: [...validSlogans],
      defaultStats: validStats.map(s => ({ ...s }))
    }

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

    // 先保存当前数据
    const validSlogans = formData.value.slogans.filter(s => s.trim())
    const validStats = formData.value.defaultStats.filter(s => s.number.trim() && s.label.trim())
    
    const bannerData = {
      slogans: validSlogans,
      defaultStats: validStats
    }

    await adminApi.saveDraft('banner', activeTab.value, bannerData)
    await adminApi.publish('banner', activeTab.value)

    hasUnpublishedChanges.value = false
    
    // 刷新 store 缓存
    bannerStore.clearCache()

    adminStore.addActivity({
      type: 'modify',
      target: activeTab.value,
      description: `发布了 ${currentPageConfig.value?.title} 的横幅设置`
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

// 重置数据
const resetData = () => {
  formData.value = {
    slogans: [...originalData.value.slogans],
    defaultStats: originalData.value.defaultStats.map(s => ({ ...s }))
  }
  ElMessage.info('已重置为上次保存的内容')
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

// 切换标签时加载数据
watch(activeTab, async () => {
  await loadData()
})

onMounted(async () => {
  await loadData()
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
      <div
        v-for="page in pageConfigs"
        :key="page.id"
        class="tab-item"
        :class="{ active: activeTab === page.id }"
        @click="activeTab = page.id"
      >
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
          <el-tag v-if="hasUnpublishedChanges" type="warning" size="small" class="status-tag">
            <i class="fas fa-exclamation-circle mr-1"></i> 有未发布的更改
          </el-tag>
          <el-button @click="resetData">
            <i class="fas fa-undo mr-1"></i> 重置
          </el-button>
          <el-button @click="exportConfig">
            <i class="fas fa-download mr-1"></i> 导出
          </el-button>
          <el-button :loading="isSaving" @click="saveData">
            <i class="fas fa-save mr-1"></i> 保存草稿
          </el-button>
          <el-button type="primary" :loading="isPublishing" @click="publishData">
            <i class="fas fa-cloud-upload-alt mr-1"></i> 发布
          </el-button>
        </div>
      </div>

      <!-- 编辑区域 - 上半部分 -->
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
              <el-input
                v-model="formData.slogans[index]"
                placeholder="请输入标语内容"
              />
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
              <el-input
                v-model="stat.number"
                placeholder="数值 (如: 100+)"
                style="width: 120px; flex-shrink: 0;"
              />
              <el-input
                v-model="stat.label"
                placeholder="标签 (如: 产品数量)"
                style="flex: 1"
              />
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

      <!-- 预览区域 - 下半部分 -->
      <div class="preview-area">
        <div class="preview-header">
          <i class="fas fa-eye"></i>
          <span>效果预览</span>
        </div>
        <div class="preview-banner">
          <!-- 模拟横幅背景 -->
          <div class="banner-bg">
            <!-- 标语展示 -->
            <div class="banner-slogans">
              <div 
                v-for="(slogan, index) in formData.slogans.filter(s => s.trim())" 
                :key="index" 
                class="banner-slogan"
              >
                {{ slogan }}
              </div>
              <div v-if="formData.slogans.filter(s => s.trim()).length === 0" class="banner-slogan placeholder">
                请添加标语内容
              </div>
            </div>
            
            <!-- 统计数据展示 -->
            <div class="banner-stats" v-if="formData.defaultStats.filter(s => s.number.trim() && s.label.trim()).length > 0">
              <div 
                v-for="stat in formData.defaultStats.filter(s => s.number.trim() && s.label.trim())" 
                :key="stat.key" 
                class="banner-stat"
              >
                <span class="stat-number">{{ stat.number }}</span>
                <span class="stat-label">{{ stat.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.banner-management {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* 页面标题 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  background: linear-gradient(135deg, #f8f9ff 0%, #fff 100%);
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

.header-left h2 i {
  color: #667eea;
}

.subtitle {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: #999;
}

/* 页面标签 */
.page-tabs {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  cursor: pointer;
  color: #666;
  font-size: 14px;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-item:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.tab-item.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: #fff;
}

.tab-item i {
  font-size: 16px;
}

/* 内容区域 */
.content-area {
  padding: 20px 24px;
}

.content-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.toolbar-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.toolbar-title i {
  color: #667eea;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

/* 编辑区域 */
.edit-area {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.edit-panel {
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e8e8e8;
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

.panel-header h4 i {
  color: #667eea;
}

.panel-body {
  padding: 16px;
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.edit-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-index {
  width: 24px;
  height: 24px;
  background: #667eea;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.stat-item .el-input:first-of-type {
  flex-shrink: 0;
}

.empty-tip {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 13px;
}

/* 预览区域 */
.preview-area {
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e8e8e8;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.preview-header i {
  color: #667eea;
}

.preview-banner {
  padding: 16px;
}

.banner-bg {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 40px 30px;
  text-align: center;
}

.banner-slogans {
  margin-bottom: 24px;
}

.banner-slogan {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.banner-slogan:last-child {
  margin-bottom: 0;
}

.banner-slogan.placeholder {
  opacity: 0.6;
  font-style: italic;
}

.banner-stats {
  display: flex;
  justify-content: center;
  gap: 40px;
  flex-wrap: wrap;
}

.banner-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.banner-stat .stat-number {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
}

.banner-stat .stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 4px;
}

.mr-1 {
  margin-right: 4px;
}

.status-tag {
  margin-right: 8px;
}

@media (max-width: 900px) {
  .edit-area {
    grid-template-columns: 1fr;
  }
  
  .page-tabs {
    overflow-x: auto;
  }
  
  .tab-item {
    white-space: nowrap;
  }
}
</style>
