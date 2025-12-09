<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAboutStore } from '@/stores/aboutStore'
import { useAdminStore } from '@/stores/adminStore'
import { adminApi } from '@/api/contentApi'
import { ElMessage, ElMessageBox } from 'element-plus'

const aboutStore = useAboutStore()
const adminStore = useAdminStore()

// 保存和发布状态
const isSaving = ref(false)
const isPublishing = ref(false)
const contentStatus = ref<'draft' | 'published'>('draft')
const hasUnpublishedChanges = ref(false)

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

// 原始数据
const originalData = ref<typeof formData.value | null>(null)

// 加载数据
const loadData = async () => {
  try {
    // 尝试从后台 API 加载（包含草稿数据）
    const content = await adminApi.getOne('about', 'main')
    
    // 优先使用草稿数据，没有则使用已发布数据
    const data = content.draftData || content.publishedData || {}
    
    formData.value = {
      sections: data.sections || {
        intro: { badge: '公司简介', title: '值得信赖的科研合作伙伴' },
        advantages: { badge: '核心优势', title: '为什么选择我们' },
        contact: { badge: '联系我们', title: '期待与您的合作' }
      },
      introCards: data.introCards || [],
      advantages: data.advantages || []
    }
    
    originalData.value = JSON.parse(JSON.stringify(formData.value))
    contentStatus.value = content.status as 'draft' | 'published'
    hasUnpublishedChanges.value = content.hasUnpublishedChanges
  } catch (e) {
    // API 失败时降级到 store
    console.warn('API 加载失败，使用 store 数据:', e)
    await aboutStore.loadAboutData()
    
    formData.value = {
      sections: JSON.parse(JSON.stringify(aboutStore.sections)),
      introCards: JSON.parse(JSON.stringify(aboutStore.introCards)),
      advantages: JSON.parse(JSON.stringify(aboutStore.advantages))
    }
    
    originalData.value = JSON.parse(JSON.stringify(formData.value))
  }
}

// 添加介绍卡片
const addIntroCard = () => {
  formData.value.introCards.push({
    icon: 'fas fa-star',
    title: '',
    content: ''
  })
}

// 删除介绍卡片
const removeIntroCard = (index: number) => {
  formData.value.introCards.splice(index, 1)
}

// 核心优势最大数量
const MAX_ADVANTAGES = 6

// 添加优势项（最多6个）
const addAdvantage = () => {
  if (formData.value.advantages.length >= MAX_ADVANTAGES) {
    ElMessage.warning(`核心优势最多只能添加 ${MAX_ADVANTAGES} 项`)
    return
  }
  formData.value.advantages.push({
    icon: 'fas fa-check-circle',
    title: '',
    content: ''
  })
}

// 是否可以添加优势项
const canAddAdvantage = () => formData.value.advantages.length < MAX_ADVANTAGES

// 删除优势项
const removeAdvantage = (index: number) => {
  formData.value.advantages.splice(index, 1)
}

// 保存草稿
const saveData = async () => {
  try {
    isSaving.value = true
    
    // 构建完整的页面数据
    const pageData = {
      id: 'about',
      title: '关于我们',
      sections: formData.value.sections,
      introCards: formData.value.introCards,
      advantages: formData.value.advantages
    }
    
    // 调用 API 保存草稿
    await adminApi.saveDraft('about', 'main', pageData)
    
    // 更新本地 store
    if (aboutStore.pageData) {
      aboutStore.pageData.sections = JSON.parse(JSON.stringify(formData.value.sections))
      aboutStore.pageData.introCards = JSON.parse(JSON.stringify(formData.value.introCards))
      aboutStore.pageData.advantages = JSON.parse(JSON.stringify(formData.value.advantages))
    }
    
    originalData.value = JSON.parse(JSON.stringify(formData.value))
    hasUnpublishedChanges.value = true
    
    adminStore.addActivity({
      type: 'modify',
      target: 'about',
      description: '保存了关于我们页面草稿'
    })
    
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
    
    // 先保存当前数据为草稿
    const pageData = {
      id: 'about',
      title: '关于我们',
      sections: formData.value.sections,
      introCards: formData.value.introCards,
      advantages: formData.value.advantages
    }
    await adminApi.saveDraft('about', 'main', pageData)
    
    // 然后发布
    await adminApi.publish('about', 'main')
    
    // 更新状态
    contentStatus.value = 'published'
    hasUnpublishedChanges.value = false
    
    // 刷新前台 store 缓存
    aboutStore.clearCache()
    
    adminStore.addActivity({
      type: 'modify',
      target: 'about',
      description: '发布了关于我们页面'
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
  if (originalData.value) {
    formData.value = JSON.parse(JSON.stringify(originalData.value))
  }
  ElMessage.info('已重置为上次保存的内容')
}

// 导出配置
const exportConfig = () => {
  const data = JSON.stringify({
    sections: formData.value.sections,
    introCards: formData.value.introCards,
    advantages: formData.value.advantages
  }, null, 2)
  
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'about-content.json'
  link.click()
  URL.revokeObjectURL(url)
  
  adminStore.addActivity({
    type: 'download',
    target: 'about',
    description: '导出了关于我们页面配置'
  })
}

// 常用图标列表
const commonIcons = [
  'fas fa-building',
  'fas fa-shopping-cart',
  'fas fa-headset',
  'fas fa-check-circle',
  'fas fa-th-large',
  'fas fa-bolt',
  'fas fa-warehouse',
  'fas fa-tags',
  'fas fa-star',
  'fas fa-award',
  'fas fa-shield-alt',
  'fas fa-rocket',
  'fas fa-users',
  'fas fa-globe',
  'fas fa-heart',
  'fas fa-lightbulb'
]

// Tab 配置
const tabConfigs = [
  { id: 'intro', title: '公司介绍', icon: 'fas fa-building' },
  { id: 'advantages', title: '核心优势', icon: 'fas fa-trophy' },
  { id: 'sections', title: '区块标题', icon: 'fas fa-heading' }
]

onMounted(() => {
  loadData()
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
        <el-tag v-if="hasUnpublishedChanges" type="warning" size="small" class="status-tag">
          <i class="fas fa-exclamation-circle mr-1"></i> 有未发布的更改
        </el-tag>
        <el-tag v-else-if="contentStatus === 'published'" type="success" size="small" class="status-tag">
          <i class="fas fa-check-circle mr-1"></i> 已发布
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

    <!-- 页面标签 -->
    <div class="page-tabs">
      <div
        v-for="tab in tabConfigs"
        :key="tab.id"
        class="tab-item"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <i :class="tab.icon"></i>
        <span>{{ tab.title }}</span>
      </div>
    </div>

    <!-- 内容区域 - 左右布局 -->
    <div class="content-area">
      <!-- 公司介绍 Tab -->
      <template v-if="activeTab === 'intro'">
        <div class="vertical-layout">
          <!-- 上方编辑区 -->
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
                  <div class="card-icon-preview">
                    <i :class="card.icon"></i>
                  </div>
                  <span class="card-index">#{{ index + 1 }}</span>
                  <el-button type="danger" text circle size="small" @click="removeIntroCard(index)">
                    <i class="fas fa-trash"></i>
                  </el-button>
                </div>
                <div class="card-fields">
                  <div class="field-row">
                    <label>图标</label>
                    <el-select v-model="card.icon" size="small">
                      <el-option v-for="icon in commonIcons" :key="icon" :value="icon">
                        <i :class="icon" style="margin-right: 8px; color: #667eea;"></i>
                        {{ icon.replace('fas fa-', '') }}
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
                <i class="fas fa-inbox"></i>
                <span>暂无介绍卡片</span>
              </div>
            </div>
          </div>

          <!-- 下方预览区 -->
          <div class="preview-panel-horizontal">
            <div class="preview-header">
              <i class="fas fa-eye"></i>
              <span>效果预览</span>
            </div>
            <div class="preview-content intro-preview">
              <!-- 区块标题 -->
              <div class="preview-section-header">
                <span class="section-badge">{{ formData.sections.intro.badge || '公司简介' }}</span>
                <h2 class="section-title">{{ formData.sections.intro.title || '值得信赖的科研合作伙伴' }}</h2>
              </div>
              <!-- 介绍卡片列表 - 完全匹配 AboutPage -->
              <div class="intro-cards-list">
                <div v-for="(card, index) in formData.introCards" :key="index" class="intro-card">
                  <div class="intro-card-inner">
                    <div class="intro-card-icon">
                      <i :class="card.icon"></i>
                    </div>
                    <div class="intro-card-content">
                      <h3 class="intro-card-title">{{ card.title || '标题' }}</h3>
                      <p class="intro-card-text">{{ card.content || '内容描述' }}</p>
                    </div>
                  </div>
                </div>
                <div v-if="formData.introCards.length === 0" class="preview-empty">
                  请添加介绍卡片
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 核心优势 Tab -->
      <template v-if="activeTab === 'advantages'">
        <div class="three-column-layout">
          <!-- 左侧编辑区 - 第一列（1-3项） -->
          <div class="edit-column">
            <div class="edit-header">
              <div class="edit-title">
                <i class="fas fa-trophy"></i>
                <span>优势项 1-3</span>
              </div>
            </div>
            <div class="edit-list">
              <div v-for="(item, index) in formData.advantages.slice(0, 3)" :key="index" class="edit-card advantage-edit">
                <div class="card-top">
                  <div class="advantage-number">{{ String(index + 1).padStart(2, '0') }}</div>
                  <div class="card-icon-preview advantage-icon">
                    <i :class="item.icon"></i>
                  </div>
                  <el-button type="danger" text circle size="small" @click="removeAdvantage(index)">
                    <i class="fas fa-trash"></i>
                  </el-button>
                </div>
                <div class="card-fields">
                  <div class="field-row">
                    <label>图标</label>
                    <el-select v-model="item.icon" size="small">
                      <el-option v-for="icon in commonIcons" :key="icon" :value="icon">
                        <i :class="icon" style="margin-right: 8px; color: #667eea;"></i>
                        {{ icon.replace('fas fa-', '') }}
                      </el-option>
                    </el-select>
                  </div>
                  <div class="field-row">
                    <label>标题</label>
                    <el-input v-model="item.title" size="small" placeholder="优势标题" />
                  </div>
                  <div class="field-row">
                    <label>描述</label>
                    <el-input v-model="item.content" type="textarea" :rows="2" size="small" placeholder="优势描述" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 中间编辑区 - 第二列（4-6项） -->
          <div class="edit-column">
            <div class="edit-header">
              <div class="edit-title">
                <i class="fas fa-trophy"></i>
                <span>优势项 4-6</span>
              </div>
              <el-button type="primary" size="small" :disabled="!canAddAdvantage()" @click="addAdvantage">
                <i class="fas fa-plus mr-1"></i> 添加 ({{ formData.advantages.length }}/{{ MAX_ADVANTAGES }})
              </el-button>
            </div>
            <div class="edit-list">
              <div v-for="(item, index) in formData.advantages.slice(3, 6)" :key="index + 3" class="edit-card advantage-edit">
                <div class="card-top">
                  <div class="advantage-number">{{ String(index + 4).padStart(2, '0') }}</div>
                  <div class="card-icon-preview advantage-icon">
                    <i :class="item.icon"></i>
                  </div>
                  <el-button type="danger" text circle size="small" @click="removeAdvantage(index + 3)">
                    <i class="fas fa-trash"></i>
                  </el-button>
                </div>
                <div class="card-fields">
                  <div class="field-row">
                    <label>图标</label>
                    <el-select v-model="item.icon" size="small">
                      <el-option v-for="icon in commonIcons" :key="icon" :value="icon">
                        <i :class="icon" style="margin-right: 8px; color: #667eea;"></i>
                        {{ icon.replace('fas fa-', '') }}
                      </el-option>
                    </el-select>
                  </div>
                  <div class="field-row">
                    <label>标题</label>
                    <el-input v-model="item.title" size="small" placeholder="优势标题" />
                  </div>
                  <div class="field-row">
                    <label>描述</label>
                    <el-input v-model="item.content" type="textarea" :rows="2" size="small" placeholder="优势描述" />
                  </div>
                </div>
              </div>
              <div v-if="formData.advantages.length < 4" class="empty-tip small">
                <span>点击添加更多优势项</span>
              </div>
            </div>
          </div>

          <!-- 右侧预览区 -->
          <div class="preview-column">
            <div class="preview-header">
              <i class="fas fa-eye"></i>
              <span>效果预览</span>
            </div>
            <div class="preview-content advantages-preview">
              <!-- 区块标题 -->
              <div class="preview-section-header">
                <span class="section-badge">{{ formData.sections.advantages.badge || '核心优势' }}</span>
                <h2 class="section-title">{{ formData.sections.advantages.title || '为什么选择我们' }}</h2>
              </div>
              <!-- 优势时间线 - 匹配 AboutPage -->
              <div class="advantage-timeline">
                <div v-for="(item, index) in formData.advantages" :key="index" class="advantage-item">
                  <div class="advantage-num">{{ index + 1 }}</div>
                  <div class="advantage-card">
                    <div class="advantage-card-header">
                      <div class="advantage-card-icon">
                        <i :class="item.icon"></i>
                      </div>
                      <h3 class="advantage-card-title">{{ item.title || '优势标题' }}</h3>
                    </div>
                    <p class="advantage-card-text">{{ item.content || '优势描述' }}</p>
                  </div>
                </div>
                <div v-if="formData.advantages.length === 0" class="preview-empty">
                  请添加优势项
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 区块标题 Tab -->
      <template v-if="activeTab === 'sections'">
        <div class="split-layout">
          <!-- 左侧编辑区 -->
          <div class="edit-side">
            <div class="edit-header">
              <div class="edit-title">
                <i class="fas fa-heading"></i>
                <span>区块标题设置</span>
              </div>
            </div>
            <div class="sections-edit">
              <div class="section-edit-item">
                <div class="section-edit-header">
                  <i class="fas fa-building"></i>
                  <span>公司简介区块</span>
                </div>
                <div class="section-edit-fields">
                  <div class="field-row">
                    <label>小标签</label>
                    <el-input v-model="formData.sections.intro.badge" size="small" placeholder="如：公司简介" />
                  </div>
                  <div class="field-row">
                    <label>主标题</label>
                    <el-input v-model="formData.sections.intro.title" size="small" placeholder="如：值得信赖的科研合作伙伴" />
                  </div>
                </div>
              </div>

              <div class="section-edit-item">
                <div class="section-edit-header">
                  <i class="fas fa-trophy"></i>
                  <span>核心优势区块</span>
                </div>
                <div class="section-edit-fields">
                  <div class="field-row">
                    <label>小标签</label>
                    <el-input v-model="formData.sections.advantages.badge" size="small" placeholder="如：核心优势" />
                  </div>
                  <div class="field-row">
                    <label>主标题</label>
                    <el-input v-model="formData.sections.advantages.title" size="small" placeholder="如：为什么选择我们" />
                  </div>
                </div>
              </div>

              <div class="section-edit-item">
                <div class="section-edit-header">
                  <i class="fas fa-phone-alt"></i>
                  <span>联系我们区块</span>
                </div>
                <div class="section-edit-fields">
                  <div class="field-row">
                    <label>小标签</label>
                    <el-input v-model="formData.sections.contact.badge" size="small" placeholder="如：联系我们" />
                  </div>
                  <div class="field-row">
                    <label>主标题</label>
                    <el-input v-model="formData.sections.contact.title" size="small" placeholder="如：期待与您的合作" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧预览区 -->
          <div class="preview-side">
            <div class="preview-header">
              <i class="fas fa-eye"></i>
              <span>效果预览</span>
            </div>
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
  </div>
</template>


<style scoped>
.about-content {
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

.header-left h2 i { color: #667eea; }

.subtitle {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: #999;
}

.header-right { display: flex; gap: 8px; }

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

.tab-item i { font-size: 16px; }

/* 内容区域 */
.content-area { padding: 20px 24px; }

/* 左右分栏布局 */
.split-layout {
  display: grid;
  grid-template-columns: 480px 1fr;
  gap: 20px;
  min-height: 500px;
}

/* 左侧编辑区 */
.edit-side {
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: #f9fafb;
  border-bottom: 1px solid #e8e8e8;
}

.edit-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.edit-title i { color: #667eea; }

.count-badge {
  background: #667eea;
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.edit-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #f9fafb;
  border-bottom: 1px solid #e8e8e8;
}

.card-icon-preview {
  width: 32px;
  height: 32px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667eea;
  font-size: 14px;
}

.card-icon-preview.advantage-icon {
  background: rgba(102, 126, 234, 0.1);
}

.advantage-number {
  width: 28px;
  height: 28px;
  background: #667eea;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}

.card-index {
  font-size: 12px;
  color: #999;
  margin-left: auto;
  margin-right: 4px;
}

.card-top .el-button { margin-left: auto; }
.advantage-edit .card-top .el-button { margin-left: 0; }

.card-fields { padding: 12px; }

.field-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.field-row:last-child { margin-bottom: 0; }

.field-row label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

/* 区块标题编辑 */
.sections-edit {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-edit-item {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}

.section-edit-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f9fafb;
  border-bottom: 1px solid #e8e8e8;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.section-edit-header i { color: #667eea; }

.section-edit-fields { padding: 12px; }

/* 空状态 */
.empty-tip {
  text-align: center;
  padding: 30px;
  color: #999;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-tip i {
  font-size: 32px;
  color: #ddd;
}

/* 右侧预览区 */
.preview-side {
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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

.preview-header i { color: #667eea; }

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #fff;
}

.preview-empty {
  text-align: center;
  padding: 40px;
  color: #ccc;
  font-size: 14px;
}

/* ========================================
   预览样式 - 完全匹配 AboutPage.vue
   ======================================== */

/* 区块标题样式 */
.preview-section-header {
  text-align: center;
  margin-bottom: 24px;
}

.section-badge {
  display: inline-block;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-size: 12px;
  padding: 4px 14px;
  border-radius: 20px;
  margin-bottom: 10px;
}

.section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

/* 公司介绍卡片 - 匹配 AboutPage 的 intro-card */
.intro-preview {
  background: #fff;
}

.intro-cards-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.intro-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #f3f4f6;
  transition: all 0.3s;
}

.intro-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
}

.intro-card-inner {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.intro-card-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  color: #667eea;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.intro-card-content { flex: 1; }

.intro-card-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.intro-card-text {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
}

/* 核心优势 - 匹配 AboutPage 的 advantage-timeline */
.advantages-preview {
  background: #f9fafb;
  border-radius: 8px;
}

.advantage-timeline {
  position: relative;
  max-width: 100%;
}

.advantage-timeline::before {
  content: '';
  position: absolute;
  left: 24px;
  top: 24px;
  bottom: 24px;
  width: 2px;
  background: rgba(102, 126, 234, 0.2);
}

.advantage-item {
  position: relative;
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.advantage-item:last-child { margin-bottom: 0; }

.advantage-num {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #667eea;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.advantage-card {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #f3f4f6;
  transition: all 0.3s;
}

.advantage-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
}

.advantage-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.advantage-card-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.advantage-card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.advantage-card-text {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}

/* 区块标题预览 */
.sections-preview {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-preview-block {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #f3f4f6;
}

.section-preview-block.alt {
  background: #f9fafb;
}

.mr-1 { margin-right: 4px; }

/* 状态标签 */
.status-tag {
  margin-right: 8px;
}

/* 垂直布局 - 公司介绍 */
.vertical-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.edit-panel-horizontal {
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  overflow: hidden;
}

.edit-cards-grid {
  display: flex;
  gap: 12px;
  padding: 12px;
}

.edit-cards-grid .edit-card {
  flex: 1;
  min-width: 0;
}

.edit-card.compact {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.preview-panel-horizontal {
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  overflow: hidden;
}

/* 三列布局 - 核心优势 */
.three-column-layout {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr;
  gap: 16px;
  min-height: 500px;
}

.edit-column {
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-column {
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.empty-tip.small {
  padding: 16px;
  font-size: 12px;
}

@media (max-width: 1200px) {
  .three-column-layout {
    grid-template-columns: 1fr 1fr;
  }
  .preview-column {
    grid-column: span 2;
  }
}

@media (max-width: 1000px) {
  .split-layout {
    grid-template-columns: 1fr;
  }
  .three-column-layout {
    grid-template-columns: 1fr;
  }
  .preview-column {
    grid-column: span 1;
  }
}
</style>
