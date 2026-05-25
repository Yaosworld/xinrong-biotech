<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useAboutStore } from '@/stores/aboutStore'
import { useAdminStore } from '@/stores/adminStore'
import { adminApi } from '@/api/contentApi'
import { ElMessage, ElMessageBox } from 'element-plus'
import VersionHistoryDialog from '../components/VersionHistoryDialog.vue'

const aboutStore = useAboutStore()
const adminStore = useAdminStore()

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

// 当前编辑的 tab
const activeTab = ref('intro')

// 表单数据
const formData = ref({
  sections: {
    intro: { badge: '', title: '' },
    advantages: { badge: '', title: '' },
    contact: { badge: '', title: '' }
  },
  introCards: [] as { icon: string; title: string; content: string }[],
  advantages: [] as { icon: string; title: string; content: string }[]
})

// 原始数据快照（用于变更检测）
const originalData = ref<string>('')

// ==================== 计算属性 ====================
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
    const content = await adminApi.getOne('about', 'main')
    const data = (content.draftData || content.publishedData || {}) as any
    
    formData.value = {
      sections: {
        intro: {
          badge: data.sections?.intro?.badge || '',
          title: data.sections?.intro?.title || ''
        },
        advantages: {
          badge: data.sections?.advantages?.badge || '',
          title: data.sections?.advantages?.title || ''
        },
        contact: {
          badge: data.sections?.contact?.badge || '',
          title: data.sections?.contact?.title || ''
        }
      },
      introCards: data.introCards || [],
      advantages: data.advantages || []
    }
    
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
    console.error('API 加载失败:', e)
    formData.value = {
      sections: {
        intro: { badge: '', title: '' },
        advantages: { badge: '', title: '' },
        contact: { badge: '', title: '' }
      },
      introCards: [],
      advantages: []
    }
    
    originalData.value = currentDataString.value
    contentStatus.value = 'unpublished'
    editStatus.value = 'clean'
    ElMessage.error('加载关于我们内容失败，请检查后台接口')
  }
}

// ==================== 操作方法 ====================
const MAX_ADVANTAGES = 6

const addIntroCard = () => {
  formData.value.introCards.push({ icon: 'fas fa-star', title: '', content: '' })
}

const removeIntroCard = (index: number) => {
  formData.value.introCards.splice(index, 1)
}

const addAdvantage = () => {
  if (formData.value.advantages.length >= MAX_ADVANTAGES) {
    ElMessage.warning(`核心优势最多只能添加 ${MAX_ADVANTAGES} 项`)
    return
  }
  formData.value.advantages.push({ icon: 'fas fa-check-circle', title: '', content: '' })
}

const canAddAdvantage = () => formData.value.advantages.length < MAX_ADVANTAGES

const removeAdvantage = (index: number) => {
  formData.value.advantages.splice(index, 1)
}

const buildPageData = () => ({
  id: 'about',
  title: '关于我们',
  sections: formData.value.sections,
  introCards: formData.value.introCards,
  advantages: formData.value.advantages
})

// 保存草稿
const saveData = async () => {
  try {
    editStatus.value = 'saving'
    await adminApi.saveDraft('about', 'main', buildPageData())
    
    if (aboutStore.pageData) {
      aboutStore.pageData.sections = JSON.parse(JSON.stringify(formData.value.sections))
      aboutStore.pageData.introCards = JSON.parse(JSON.stringify(formData.value.introCards))
      aboutStore.pageData.advantages = JSON.parse(JSON.stringify(formData.value.advantages))
    }
    
    originalData.value = currentDataString.value
    contentStatus.value = 'draft'
    editStatus.value = 'clean'
    
    adminStore.addActivity({ type: 'modify', target: 'about', description: '保存了关于我们页面草稿' })
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
  try {
    editStatus.value = 'publishing'
    showPublishDialog.value = false
    
    await adminApi.saveDraft('about', 'main', buildPageData())
    const result = await adminApi.publish('about', 'main', publishSummary.value || undefined)
    
    originalData.value = currentDataString.value
    currentVersion.value = result.version
    contentStatus.value = 'published'
    editStatus.value = 'clean'
    aboutStore.clearCache()
    
    adminStore.addActivity({ type: 'modify', target: 'about', description: `发布了关于我们页面 v${result.version}` })
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
  const data = JSON.stringify(buildPageData(), null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'about-content.json'
  link.click()
  URL.revokeObjectURL(url)
  adminStore.addActivity({ type: 'download', target: 'about', description: '导出了关于我们页面配置' })
}

// 版本回滚
const handleVersionRollback = async () => {
  await loadData()
  ElMessage.info('数据已回滚，请检查后重新发布')
}

// 常用图标列表
const commonIcons = [
  'fas fa-building', 'fas fa-shopping-cart', 'fas fa-headset', 'fas fa-check-circle',
  'fas fa-th-large', 'fas fa-bolt', 'fas fa-warehouse', 'fas fa-tags',
  'fas fa-star', 'fas fa-award', 'fas fa-shield-alt', 'fas fa-rocket',
  'fas fa-users', 'fas fa-globe', 'fas fa-heart', 'fas fa-lightbulb'
]

// Tab 配置
const tabConfigs = [
  { id: 'intro', title: '公司介绍', icon: 'fas fa-building' },
  { id: 'advantages', title: '核心优势', icon: 'fas fa-trophy' },
  { id: 'sections', title: '区块标题', icon: 'fas fa-heading' }
]

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

onMounted(() => {
  loadData()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <div class="about-content">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2><i class="fas fa-info-circle"></i> 关于我们</h2>
        <span class="subtitle">管理关于我们页面的内容</span>
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
        <el-button :loading="editStatus === 'saving'" :disabled="!hasUnsavedChanges || editStatus === 'publishing'" @click="saveData">
          <i class="fas fa-save mr-1"></i> 保存草稿
        </el-button>
        <el-button type="primary" :loading="editStatus === 'publishing'" :disabled="editStatus === 'saving'" @click="openPublishDialog">
          <i class="fas fa-cloud-upload-alt mr-1"></i> 发布
        </el-button>
      </div>
    </div>

    <!-- 页面标签 -->
    <div class="page-tabs">
      <div v-for="tab in tabConfigs" :key="tab.id" class="tab-item" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
        <i :class="tab.icon"></i>
        <span>{{ tab.title }}</span>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-area">
      <!-- 公司介绍 Tab -->
      <template v-if="activeTab === 'intro'">
        <div class="vertical-layout">
          <div class="edit-panel-horizontal">
            <div class="edit-header">
              <div class="edit-title">
                <i class="fas fa-building"></i>
                <span>公司介绍卡片</span>
                <span class="count-badge">{{ formData.introCards.length }} 项</span>
              </div>
              <el-button type="primary" size="small" @click="addIntroCard">
                <i class="fas fa-plus mr-1"></i> 添加
              </el-button>
            </div>
            <div class="edit-cards-grid">
              <div v-for="(card, index) in formData.introCards" :key="index" class="edit-card compact">
                <div class="card-top">
                  <div class="card-icon-preview"><i :class="card.icon"></i></div>
                  <span class="card-index">#{{ index + 1 }}</span>
                  <el-button type="danger" text circle size="small" @click="removeIntroCard(index)"><i class="fas fa-trash"></i></el-button>
                </div>
                <div class="card-fields">
                  <div class="field-row">
                    <label>图标</label>
                    <el-select v-model="card.icon" size="small">
                      <el-option v-for="icon in commonIcons" :key="icon" :value="icon">
                        <i :class="icon" style="margin-right: 8px; color: #05548C;"></i>{{ icon.replace('fas fa-', '') }}
                      </el-option>
                    </el-select>
                  </div>
                  <div class="field-row">
                    <label>标题</label>
                    <el-input v-model="card.title" size="small" placeholder="卡片标题" />
                  </div>
                  <div class="field-row">
                    <label>内容</label>
                    <el-input v-model="card.content" type="textarea" :rows="2" size="small" placeholder="卡片内容" />
                  </div>
                </div>
              </div>
              <div v-if="formData.introCards.length === 0" class="empty-tip">
                <i class="fas fa-inbox"></i><span>暂无介绍卡片</span>
              </div>
            </div>
          </div>
          <div class="preview-panel-horizontal">
            <div class="preview-header"><i class="fas fa-eye"></i><span>效果预览</span></div>
            <div class="preview-content intro-preview">
              <div class="preview-section-header">
                <span class="section-badge">{{ formData.sections.intro.badge || '公司简介' }}</span>
                <h2 class="section-title">{{ formData.sections.intro.title || '值得信赖的科研合作伙伴' }}</h2>
              </div>
              <div class="intro-cards-list">
                <div v-for="(card, index) in formData.introCards" :key="index" class="intro-card">
                  <div class="intro-card-inner">
                    <div class="intro-card-icon"><i :class="card.icon"></i></div>
                    <div class="intro-card-content">
                      <h3 class="intro-card-title">{{ card.title || '标题' }}</h3>
                      <p class="intro-card-text">{{ card.content || '内容描述' }}</p>
                    </div>
                  </div>
                </div>
                <div v-if="formData.introCards.length === 0" class="preview-empty">请添加介绍卡片</div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 核心优势 Tab -->
      <template v-if="activeTab === 'advantages'">
        <div class="three-column-layout">
          <div class="edit-column">
            <div class="edit-header">
              <div class="edit-title"><i class="fas fa-trophy"></i><span>优势项 1-3</span></div>
            </div>
            <div class="edit-list">
              <div v-for="(item, index) in formData.advantages.slice(0, 3)" :key="index" class="edit-card advantage-edit">
                <div class="card-top">
                  <div class="advantage-number">{{ String(index + 1).padStart(2, '0') }}</div>
                  <div class="card-icon-preview advantage-icon"><i :class="item.icon"></i></div>
                  <el-button type="danger" text circle size="small" @click="removeAdvantage(index)"><i class="fas fa-trash"></i></el-button>
                </div>
                <div class="card-fields">
                  <div class="field-row">
                    <label>图标</label>
                    <el-select v-model="item.icon" size="small">
                      <el-option v-for="icon in commonIcons" :key="icon" :value="icon">
                        <i :class="icon" style="margin-right: 8px; color: #05548C;"></i>{{ icon.replace('fas fa-', '') }}
                      </el-option>
                    </el-select>
                  </div>
                  <div class="field-row"><label>标题</label><el-input v-model="item.title" size="small" placeholder="优势标题" /></div>
                  <div class="field-row"><label>描述</label><el-input v-model="item.content" type="textarea" :rows="2" size="small" placeholder="优势描述" /></div>
                </div>
              </div>
            </div>
          </div>
          <div class="edit-column">
            <div class="edit-header">
              <div class="edit-title"><i class="fas fa-trophy"></i><span>优势项 4-6</span></div>
              <el-button type="primary" size="small" :disabled="!canAddAdvantage()" @click="addAdvantage">
                <i class="fas fa-plus mr-1"></i> 添加 ({{ formData.advantages.length }}/{{ MAX_ADVANTAGES }})
              </el-button>
            </div>
            <div class="edit-list">
              <div v-for="(item, index) in formData.advantages.slice(3, 6)" :key="index + 3" class="edit-card advantage-edit">
                <div class="card-top">
                  <div class="advantage-number">{{ String(index + 4).padStart(2, '0') }}</div>
                  <div class="card-icon-preview advantage-icon"><i :class="item.icon"></i></div>
                  <el-button type="danger" text circle size="small" @click="removeAdvantage(index + 3)"><i class="fas fa-trash"></i></el-button>
                </div>
                <div class="card-fields">
                  <div class="field-row">
                    <label>图标</label>
                    <el-select v-model="item.icon" size="small">
                      <el-option v-for="icon in commonIcons" :key="icon" :value="icon">
                        <i :class="icon" style="margin-right: 8px; color: #05548C;"></i>{{ icon.replace('fas fa-', '') }}
                      </el-option>
                    </el-select>
                  </div>
                  <div class="field-row"><label>标题</label><el-input v-model="item.title" size="small" placeholder="优势标题" /></div>
                  <div class="field-row"><label>描述</label><el-input v-model="item.content" type="textarea" :rows="2" size="small" placeholder="优势描述" /></div>
                </div>
              </div>
              <div v-if="formData.advantages.length < 4" class="empty-tip small"><span>点击添加更多优势项</span></div>
            </div>
          </div>
          <div class="preview-column">
            <div class="preview-header"><i class="fas fa-eye"></i><span>效果预览</span></div>
            <div class="preview-content advantages-preview">
              <div class="preview-section-header">
                <span class="section-badge">{{ formData.sections.advantages.badge || '核心优势' }}</span>
                <h2 class="section-title">{{ formData.sections.advantages.title || '为什么选择我们' }}</h2>
              </div>
              <div class="advantage-timeline">
                <div v-for="(item, index) in formData.advantages" :key="index" class="advantage-item">
                  <div class="advantage-num">{{ index + 1 }}</div>
                  <div class="advantage-card">
                    <div class="advantage-card-header">
                      <div class="advantage-card-icon"><i :class="item.icon"></i></div>
                      <h3 class="advantage-card-title">{{ item.title || '优势标题' }}</h3>
                    </div>
                    <p class="advantage-card-text">{{ item.content || '优势描述' }}</p>
                  </div>
                </div>
                <div v-if="formData.advantages.length === 0" class="preview-empty">请添加优势项</div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 区块标题 Tab -->
      <template v-if="activeTab === 'sections'">
        <div class="split-layout">
          <div class="edit-side">
            <div class="edit-header"><div class="edit-title"><i class="fas fa-heading"></i><span>区块标题设置</span></div></div>
            <div class="sections-edit">
              <div class="section-edit-item">
                <div class="section-edit-header"><i class="fas fa-building"></i><span>公司简介区块</span></div>
                <div class="section-edit-fields">
                  <div class="field-row"><label>小标签</label><el-input v-model="formData.sections.intro.badge" size="small" placeholder="如：公司简介" /></div>
                  <div class="field-row"><label>主标题</label><el-input v-model="formData.sections.intro.title" size="small" placeholder="如：值得信赖的科研合作伙伴" /></div>
                </div>
              </div>
              <div class="section-edit-item">
                <div class="section-edit-header"><i class="fas fa-trophy"></i><span>核心优势区块</span></div>
                <div class="section-edit-fields">
                  <div class="field-row"><label>小标签</label><el-input v-model="formData.sections.advantages.badge" size="small" placeholder="如：核心优势" /></div>
                  <div class="field-row"><label>主标题</label><el-input v-model="formData.sections.advantages.title" size="small" placeholder="如：为什么选择我们" /></div>
                </div>
              </div>
              <div class="section-edit-item">
                <div class="section-edit-header"><i class="fas fa-phone-alt"></i><span>联系我们区块</span></div>
                <div class="section-edit-fields">
                  <div class="field-row"><label>小标签</label><el-input v-model="formData.sections.contact.badge" size="small" placeholder="如：联系我们" /></div>
                  <div class="field-row"><label>主标题</label><el-input v-model="formData.sections.contact.title" size="small" placeholder="如：期待与您的合作" /></div>
                </div>
              </div>
            </div>
          </div>
          <div class="preview-side">
            <div class="preview-header"><i class="fas fa-eye"></i><span>效果预览</span></div>
            <div class="preview-content sections-preview">
              <div class="section-preview-block">
                <span class="section-badge">{{ formData.sections.intro.badge || '公司简介' }}</span>
                <h2 class="section-title">{{ formData.sections.intro.title || '值得信赖的科研合作伙伴' }}</h2>
              </div>
              <div class="section-preview-block alt">
                <span class="section-badge">{{ formData.sections.advantages.badge || '核心优势' }}</span>
                <h2 class="section-title">{{ formData.sections.advantages.title || '为什么选择我们' }}</h2>
              </div>
              <div class="section-preview-block">
                <span class="section-badge">{{ formData.sections.contact.badge || '联系我们' }}</span>
                <h2 class="section-title">{{ formData.sections.contact.title || '期待与您的合作' }}</h2>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
    
    <!-- 版本历史对话框 -->
    <VersionHistoryDialog v-model:visible="showVersionHistory" content-type="about" content-key="main" title="关于我们 - 版本历史" @rollback="handleVersionRollback" />
    
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
.about-content { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden; }

.page-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--admin-border); background: linear-gradient(135deg, var(--admin-surface) 0%, #fff 100%); }
.header-left h2 { margin: 0; font-size: 18px; font-weight: 600; color: #333; display: flex; align-items: center; gap: 10px; }
.header-left h2 i { color: #05548C; }
.subtitle { display: block; margin-top: 4px; font-size: 13px; color: #999; }
.header-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

.status-tag { margin-right: 4px; }
.status-tag.pulse { animation: pulse-animation 1.5s infinite; }
@keyframes pulse-animation { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
.version-tag { margin-right: 8px; }

.page-tabs { display: flex; border-bottom: 1px solid var(--admin-border); background: var(--admin-surface-alt); }
.tab-item { display: flex; align-items: center; gap: 8px; padding: 14px 24px; cursor: pointer; color: #666; font-size: 14px; border-bottom: 2px solid transparent; transition: all 0.2s; }
.tab-item:hover { color: #05548C; background: rgba(5, 84, 140, 0.05); }
.tab-item.active { color: #05548C; border-bottom-color: #05548C; background: #fff; }
.tab-item i { font-size: 16px; }

.content-area { padding: 20px 24px; }

.split-layout { display: grid; grid-template-columns: 480px 1fr; gap: 20px; min-height: 500px; }
.edit-side, .preview-side { border: 1px solid var(--admin-border); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; }

.edit-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--admin-panel-bg); border-bottom: 1px solid var(--admin-border); }
.edit-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #333; }
.edit-title i { color: #05548C; }
.count-badge { background: #05548C; color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }

.edit-list { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.edit-card { border: 1px solid var(--admin-border); border-radius: 8px; overflow: hidden; background: #fff; }
.card-top { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--admin-panel-bg); border-bottom: 1px solid var(--admin-border); }
.card-icon-preview { width: 32px; height: 32px; background: rgba(5, 84, 140, 0.1); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #05548C; font-size: 14px; }
.advantage-number { width: 28px; height: 28px; background: #05548C; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; }
.card-index { font-size: 12px; color: #999; margin-left: auto; margin-right: 4px; }
.card-top .el-button { margin-left: auto; }
.advantage-edit .card-top .el-button { margin-left: 0; }
.card-fields { padding: 12px; }
.field-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
.field-row:last-child { margin-bottom: 0; }
.field-row label { font-size: 12px; color: #666; font-weight: 500; }

.sections-edit { padding: 12px; display: flex; flex-direction: column; gap: 16px; }
.section-edit-item { border: 1px solid var(--admin-border); border-radius: 8px; overflow: hidden; }
.section-edit-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--admin-panel-bg); border-bottom: 1px solid var(--admin-border); font-size: 13px; font-weight: 600; color: #333; }
.section-edit-header i { color: #05548C; }
.section-edit-fields { padding: 12px; }

.empty-tip { text-align: center; padding: 30px; color: #999; font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.empty-tip i { font-size: 32px; color: #ddd; }
.empty-tip.small { padding: 16px; font-size: 12px; }

.preview-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--admin-panel-bg); border-bottom: 1px solid var(--admin-border); font-size: 14px; font-weight: 600; color: #333; }
.preview-header i { color: #05548C; }
.preview-content { flex: 1; overflow-y: auto; padding: 24px; background: #fff; }
.preview-empty { text-align: center; padding: 40px; color: #ccc; font-size: 14px; }

.preview-section-header { text-align: center; margin-bottom: 24px; }
.section-badge { display: inline-block; background: linear-gradient(135deg, #05548C, #43CEED); color: #fff; font-size: 12px; padding: 4px 14px; border-radius: 20px; margin-bottom: 10px; }
.section-title { margin: 0; font-size: 20px; font-weight: 700; color: #1f2937; }

.intro-preview { background: #fff; }
.intro-cards-list { display: flex; flex-direction: column; gap: 16px; }
.intro-card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); border: 1px solid #f3f4f6; transition: all 0.3s; }
.intro-card:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); border-color: rgba(5, 84, 140, 0.3); }
.intro-card-inner { display: flex; align-items: flex-start; gap: 16px; }
.intro-card-icon { width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, rgba(5, 84, 140, 0.1), rgba(5, 84, 140, 0.1)); color: #05548C; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
.intro-card-content { flex: 1; }
.intro-card-title { margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #1f2937; }
.intro-card-text { margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6; }

.advantages-preview { background: var(--admin-panel-bg); border-radius: 8px; }
.advantage-timeline { position: relative; max-width: 100%; }
.advantage-timeline::before { content: ''; position: absolute; left: 24px; top: 24px; bottom: 24px; width: 2px; background: rgba(5, 84, 140, 0.2); }
.advantage-item { position: relative; display: flex; gap: 16px; margin-bottom: 24px; }
.advantage-item:last-child { margin-bottom: 0; }
.advantage-num { width: 48px; height: 48px; border-radius: 50%; background: #05548C; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 16px; flex-shrink: 0; position: relative; z-index: 1; }
.advantage-card { flex: 1; background: #fff; border-radius: 12px; padding: 16px 20px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); border: 1px solid #f3f4f6; transition: all 0.3s; }
.advantage-card:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); border-color: rgba(5, 84, 140, 0.3); }
.advantage-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.advantage-card-icon { width: 36px; height: 36px; border-radius: 8px; background: rgba(5, 84, 140, 0.1); color: #05548C; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.advantage-card-title { margin: 0; font-size: 16px; font-weight: 600; color: #1f2937; }
.advantage-card-text { margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5; }

.sections-preview { display: flex; flex-direction: column; gap: 20px; }
.section-preview-block { background: #fff; border-radius: 12px; padding: 32px; text-align: center; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); border: 1px solid #f3f4f6; }
.section-preview-block.alt { background: var(--admin-panel-bg); }

.vertical-layout { display: flex; flex-direction: column; gap: 20px; }
.edit-panel-horizontal, .preview-panel-horizontal { border: 1px solid var(--admin-border); border-radius: 10px; overflow: hidden; }
.edit-cards-grid { display: flex; gap: 12px; padding: 12px; flex-wrap: wrap; }
.edit-cards-grid .edit-card { flex: 1; min-width: 280px; }
.edit-card.compact { border: 1px solid var(--admin-border); border-radius: 8px; overflow: hidden; background: #fff; }

.three-column-layout { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 16px; min-height: 500px; }
.edit-column, .preview-column { border: 1px solid var(--admin-border); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; }

.publish-dialog-content { display: flex; flex-direction: column; gap: 16px; }
.publish-info { display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; color: #0369a1; font-size: 13px; line-height: 1.5; }
.publish-info i { margin-top: 2px; flex-shrink: 0; }
.publish-form { display: flex; flex-direction: column; gap: 8px; }
.publish-form label { font-size: 13px; font-weight: 500; color: #333; }

.mr-1 { margin-right: 4px; }

@media (max-width: 1200px) { .three-column-layout { grid-template-columns: 1fr 1fr; } .preview-column { grid-column: span 2; } }
@media (max-width: 1000px) { .split-layout, .three-column-layout { grid-template-columns: 1fr; } .preview-column { grid-column: span 1; } }
</style>
