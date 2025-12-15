<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAdminStore } from '@/stores/adminStore'
import { adminApi } from '@/api/contentApi'
import { ElMessage, ElMessageBox } from 'element-plus'
import ImageUploader from '@/components/admin/ImageUploader.vue'
import VersionHistoryDialog from '../components/VersionHistoryDialog.vue'

const adminStore = useAdminStore()

// ==================== 标签切换 ====================
const activeTab = ref<'banners' | 'sections'>('banners')

// ==================== 状态管理 ====================
type EditStatus = 'clean' | 'dirty' | 'saving' | 'publishing'
const editStatus = ref<EditStatus>('clean')

type ContentStatus = 'draft' | 'published' | 'unpublished'
const contentStatus = ref<ContentStatus>('unpublished')

const showVersionHistory = ref(false)
const currentVersion = ref(1)
const showPublishDialog = ref(false)
const publishSummary = ref('')

// ==================== 表单数据 ====================
const bannerImages = ref<Array<{ id: string; url: string }>>([])
const sections = ref({
  products: { badge: '热门产品', title: '精选优质产品' },
  brands: { badge: '品牌矩阵', title: '知名品牌，值得信赖' },
  promotions: { badge: '最新活动', title: '优惠活动动态一手掌握' }
})

const originalData = ref<string>('')

// ==================== 计算属性 ====================
const currentDataString = computed(() => JSON.stringify({ images: bannerImages.value, sections: sections.value }))
const hasUnsavedChanges = computed(() => originalData.value !== '' && currentDataString.value !== originalData.value)

watch(currentDataString, () => {
  if (editStatus.value !== 'saving' && editStatus.value !== 'publishing') {
    editStatus.value = hasUnsavedChanges.value ? 'dirty' : 'clean'
  }
})

const statusConfig = computed(() => {
  if (editStatus.value === 'dirty') return { type: 'danger' as const, icon: 'fas fa-pen', text: '编辑中 · 未保存', pulse: true }
  if (editStatus.value === 'saving') return { type: 'warning' as const, icon: 'fas fa-spinner fa-spin', text: '保存中...', pulse: false }
  if (editStatus.value === 'publishing') return { type: 'warning' as const, icon: 'fas fa-spinner fa-spin', text: '发布中...', pulse: false }
  if (contentStatus.value === 'draft') return { type: 'warning' as const, icon: 'fas fa-file-alt', text: '草稿 · 待发布', pulse: false }
  if (contentStatus.value === 'published') return { type: 'success' as const, icon: 'fas fa-check-circle', text: '已发布', pulse: false }
  return { type: 'info' as const, icon: 'fas fa-file', text: '未发布', pulse: false }
})

// ==================== 默认数据 ====================
const defaultImages = [
  { id: '1', url: '/images/home/banner_1.jpg' },
  { id: '2', url: '/images/home/banner_2.jpg' },
  { id: '3', url: '/images/home/banner_3.jpg' },
  { id: '4', url: '/images/home/banner_4.jpg' }
]
const defaultSections = {
  products: { badge: '热门产品', title: '精选优质产品' },
  brands: { badge: '品牌矩阵', title: '知名品牌，值得信赖' },
  promotions: { badge: '最新活动', title: '优惠活动动态一手掌握' }
}

// ==================== 数据加载 ====================
const loadData = async () => {
  try {
    const content = await adminApi.getOne('home_config', 'main')
    const data = (content.draftData || content.publishedData || {}) as any
    bannerImages.value = data.images || [...defaultImages]
    sections.value = data.sections ? { ...defaultSections, ...data.sections } : { ...defaultSections }
    
    const hasDraft = content.draftData !== null
    const hasPublished = content.publishedData !== null
    const draftDiffersFromPublished = hasDraft && hasPublished && JSON.stringify(content.draftData) !== JSON.stringify(content.publishedData)
    
    contentStatus.value = (draftDiffersFromPublished || (hasDraft && !hasPublished)) ? 'draft' : hasPublished ? 'published' : 'unpublished'
    currentVersion.value = content.version || 1
    originalData.value = currentDataString.value
    editStatus.value = 'clean'
  } catch (e) {
    console.warn('加载首页设置失败，使用默认数据:', e)
    bannerImages.value = [...defaultImages]
    sections.value = { ...defaultSections }
    originalData.value = currentDataString.value
    contentStatus.value = 'unpublished'
    editStatus.value = 'clean'
  }
}

// ==================== 横幅操作 ====================
const previewIndex = ref(0)
const uploaderRefs = ref<Record<number, any>>({})
const addBanner = () => bannerImages.value.push({ id: String(Date.now()), url: '' })

const triggerUpload = (index: number) => {
  const uploader = uploaderRefs.value[index]
  if (uploader?.triggerUpload) {
    uploader.triggerUpload()
  }
}

const removeBanner = async (index: number) => {
  if (bannerImages.value.length <= 1) { ElMessage.warning('至少保留一张横幅图片'); return }
  try {
    await ElMessageBox.confirm('确定要删除这张横幅图片吗？', '确认删除', { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' })
    bannerImages.value.splice(index, 1)
    if (previewIndex.value >= bannerImages.value.length) previewIndex.value = bannerImages.value.length - 1
  } catch {}
}

const moveBanner = (index: number, direction: 'up' | 'down') => {
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= bannerImages.value.length) return
  const temp = bannerImages.value[index]
  bannerImages.value[index] = bannerImages.value[targetIndex]
  bannerImages.value[targetIndex] = temp
}

const prevBanner = () => { previewIndex.value = (previewIndex.value - 1 + bannerImages.value.length) % bannerImages.value.length }
const nextBanner = () => { previewIndex.value = (previewIndex.value + 1) % bannerImages.value.length }

// ==================== 保存发布 ====================
const buildData = () => ({ images: bannerImages.value.filter(b => b.url), sections: sections.value })

const saveData = async () => {
  try {
    editStatus.value = 'saving'
    await adminApi.saveDraft('home_config', 'main', buildData())
    originalData.value = currentDataString.value
    contentStatus.value = 'draft'
    editStatus.value = 'clean'
    adminStore.addActivity({ type: 'modify', target: 'home-settings', description: '保存了首页设置草稿' })
    ElMessage.success('草稿已保存')
  } catch (error) {
    editStatus.value = hasUnsavedChanges.value ? 'dirty' : 'clean'
    ElMessage.error('保存失败')
  }
}

const openPublishDialog = async () => {
  if (hasUnsavedChanges.value) {
    try { await ElMessageBox.confirm('您有未保存的更改，发布前需要先保存。是否继续？', '提示', { confirmButtonText: '保存并发布', cancelButtonText: '取消', type: 'warning' }) }
    catch { return }
  }
  publishSummary.value = ''
  showPublishDialog.value = true
}

const publishData = async () => {
  try {
    editStatus.value = 'publishing'
    showPublishDialog.value = false
    await adminApi.saveDraft('home_config', 'main', buildData())
    const result = await adminApi.publish('home_config', 'main', publishSummary.value || undefined)
    originalData.value = currentDataString.value
    currentVersion.value = result.version
    contentStatus.value = 'published'
    editStatus.value = 'clean'
    adminStore.addActivity({ type: 'modify', target: 'home-settings', description: `发布了首页设置 v${result.version}` })
    ElMessage.success(`发布成功！当前版本 v${result.version}`)
  } catch (error) {
    editStatus.value = hasUnsavedChanges.value ? 'dirty' : 'clean'
    ElMessage.error('发布失败')
  }
}

const handleVersionRollback = async () => { await loadData(); ElMessage.info('数据已回滚，请检查后重新发布') }

onMounted(() => loadData())
</script>

<template>
  <div class="home-settings">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2><i class="fas fa-home"></i> 首页设置</h2>
        <span class="subtitle">管理首页横幅图片和区块标题</span>
      </div>
      <div class="header-right">
        <el-tag :type="statusConfig.type" size="small" :class="['status-tag', { pulse: statusConfig.pulse }]">
          <i :class="statusConfig.icon" class="mr-1"></i> {{ statusConfig.text }}
        </el-tag>
        <el-tag type="info" size="small" class="version-tag">v{{ currentVersion }}</el-tag>
        <el-button @click="showVersionHistory = true" :disabled="editStatus === 'saving' || editStatus === 'publishing'">
          <i class="fas fa-history mr-1"></i> 版本历史
        </el-button>
        <el-button @click="loadData" :disabled="!hasUnsavedChanges || editStatus === 'saving' || editStatus === 'publishing'">
          <i class="fas fa-undo mr-1"></i> 重置
        </el-button>
        <el-button :loading="editStatus === 'saving'" :disabled="!hasUnsavedChanges || editStatus === 'publishing'" @click="saveData">
          <i class="fas fa-save mr-1"></i> 保存草稿
        </el-button>
        <el-button type="primary" :loading="editStatus === 'publishing'" :disabled="editStatus === 'saving'" @click="openPublishDialog">
          <i class="fas fa-cloud-upload-alt mr-1"></i> 发布
        </el-button>
      </div>
    </div>

    <!-- 标签切换 -->
    <div class="tab-bar">
      <div class="tab-item" :class="{ active: activeTab === 'banners' }" @click="activeTab = 'banners'">
        <i class="fas fa-images"></i><span>横幅图片</span>
      </div>
      <div class="tab-item" :class="{ active: activeTab === 'sections' }" @click="activeTab = 'sections'">
        <i class="fas fa-heading"></i><span>区块标题</span>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-area">
      <!-- 横幅图片管理 -->
      <div v-show="activeTab === 'banners'" class="tab-content">
        <!-- 图片卡片列表 -->
        <div class="banner-cards-header">
          <span class="cards-title">横幅图片 ({{ bannerImages.length }}/8)</span>
          <el-button size="small" type="primary" @click="addBanner" :disabled="bannerImages.length >= 8">
            <i class="fas fa-plus mr-1"></i> 添加横幅
          </el-button>
        </div>
        <div class="banner-cards">
          <div v-for="(banner, index) in bannerImages" :key="banner.id" 
               class="banner-card" :class="{ active: index === previewIndex }" @click="previewIndex = index">
            <!-- 图片内容 -->
            <div class="card-content">
              <img v-if="banner.url" :src="banner.url" alt="" />
              <div v-else class="card-empty">
                <i class="fas fa-image"></i>
                <span>点击上传</span>
              </div>
            </div>
            <!-- 序号 -->
            <div class="card-index">{{ index + 1 }}</div>
            <!-- 悬停操作层 -->
            <div class="card-overlay">
              <div class="overlay-actions">
                <button class="action-btn upload" title="更换图片" @click.stop="triggerUpload(index)">
                  <i class="fas fa-camera"></i>
                </button>
                <button v-if="index > 0" class="action-btn" title="左移" @click.stop="moveBanner(index, 'up')">
                  <i class="fas fa-arrow-left"></i>
                </button>
                <button v-if="index < bannerImages.length - 1" class="action-btn" title="右移" @click.stop="moveBanner(index, 'down')">
                  <i class="fas fa-arrow-right"></i>
                </button>
                <button class="action-btn delete" title="删除" :disabled="bannerImages.length <= 1" @click.stop="removeBanner(index)">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            <!-- 隐藏的上传组件 -->
            <ImageUploader 
              :ref="(el: any) => uploaderRefs[index] = el"
              v-model="bannerImages[index].url" 
              category="home-banner" 
              :max-size="5"
              class="hidden-uploader"
            />
          </div>
        </div>

        <!-- 预览区 -->
        <div class="preview-section">
          <div class="preview-header">
            <span class="preview-title"><i class="fas fa-eye"></i> 效果预览</span>
            <span class="preview-hint">建议尺寸 1920×900，支持 JPG、PNG</span>
          </div>
          <div class="banner-preview">
            <div v-for="(banner, index) in bannerImages" :key="banner.id" class="preview-slide" :class="{ active: index === previewIndex }">
              <img v-if="banner.url" :src="banner.url" alt="" />
              <div v-else class="preview-empty">
                <i class="fas fa-image"></i>
                <span>暂无图片</span>
              </div>
            </div>
            <!-- 左右切换按钮 -->
            <button v-if="bannerImages.length > 1" class="nav-btn prev" @click="prevBanner"><i class="fas fa-chevron-left"></i></button>
            <button v-if="bannerImages.length > 1" class="nav-btn next" @click="nextBanner"><i class="fas fa-chevron-right"></i></button>
            <!-- 指示点 -->
            <div v-if="bannerImages.length > 1" class="preview-dots">
              <button v-for="(_, i) in bannerImages" :key="i" class="dot" :class="{ active: i === previewIndex }" @click="previewIndex = i"></button>
            </div>
          </div>
        </div>
      </div>

      <!-- 区块标题设置 -->
      <div v-show="activeTab === 'sections'" class="tab-content">
        <div class="split-layout">
          <!-- 左侧：编辑 -->
          <div class="edit-side">
            <div class="edit-header"><div class="edit-title"><i class="fas fa-heading"></i><span>区块标题设置</span></div></div>
            <div class="sections-edit">
              <div class="section-edit-item">
                <div class="section-edit-header"><i class="fas fa-box"></i><span>热门产品区块</span></div>
                <div class="section-edit-fields">
                  <div class="field-row"><label>小标签</label><el-input v-model="sections.products.badge" size="small" placeholder="如：热门产品" /></div>
                  <div class="field-row"><label>主标题</label><el-input v-model="sections.products.title" size="small" placeholder="如：精选优质产品" /></div>
                </div>
              </div>
              <div class="section-edit-item">
                <div class="section-edit-header"><i class="fas fa-award"></i><span>品牌矩阵区块</span></div>
                <div class="section-edit-fields">
                  <div class="field-row"><label>小标签</label><el-input v-model="sections.brands.badge" size="small" placeholder="如：品牌矩阵" /></div>
                  <div class="field-row"><label>主标题</label><el-input v-model="sections.brands.title" size="small" placeholder="如：知名品牌，值得信赖" /></div>
                </div>
              </div>
              <div class="section-edit-item">
                <div class="section-edit-header"><i class="fas fa-bullhorn"></i><span>最新活动区块</span></div>
                <div class="section-edit-fields">
                  <div class="field-row"><label>小标签</label><el-input v-model="sections.promotions.badge" size="small" placeholder="如：最新活动" /></div>
                  <div class="field-row"><label>主标题</label><el-input v-model="sections.promotions.title" size="small" placeholder="如：优惠活动动态一手掌握" /></div>
                </div>
              </div>
            </div>
          </div>
          <!-- 右侧：预览 -->
          <div class="preview-side">
            <div class="preview-header"><i class="fas fa-eye"></i><span>效果预览</span></div>
            <div class="preview-content sections-preview-content">
              <div class="section-preview-block">
                <span class="section-badge">{{ sections.products.badge || '热门产品' }}</span>
                <h2 class="section-title">{{ sections.products.title || '精选优质产品' }}</h2>
              </div>
              <div class="section-preview-block alt">
                <span class="section-badge">{{ sections.brands.badge || '品牌矩阵' }}</span>
                <h2 class="section-title">{{ sections.brands.title || '知名品牌，值得信赖' }}</h2>
              </div>
              <div class="section-preview-block">
                <span class="section-badge">{{ sections.promotions.badge || '最新活动' }}</span>
                <h2 class="section-title">{{ sections.promotions.title || '优惠活动动态一手掌握' }}</h2>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 版本历史对话框 -->
    <VersionHistoryDialog v-model:visible="showVersionHistory" content-type="home_config" content-key="main" title="首页设置 - 版本历史" @rollback="handleVersionRollback" />
    
    <!-- 发布确认对话框 -->
    <el-dialog v-model="showPublishDialog" title="发布确认" width="500px" :close-on-click-modal="false">
      <div class="publish-dialog-content">
        <div class="publish-info"><i class="fas fa-info-circle"></i><span>发布后前台首页将立即更新，当前版本 v{{ currentVersion }} 将升级为 v{{ currentVersion + 1 }}</span></div>
        <div class="publish-form">
          <label>变更说明（可选）</label>
          <el-input v-model="publishSummary" type="textarea" :rows="3" placeholder="简要描述本次发布的主要变更..." maxlength="200" show-word-limit />
        </div>
      </div>
      <template #footer>
        <el-button @click="showPublishDialog = false">取消</el-button>
        <el-button type="primary" @click="publishData" :loading="editStatus === 'publishing'"><i class="fas fa-cloud-upload-alt mr-1"></i> 确认发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>


<style scoped>
@import '../styles/admin-common.css';

.home-settings {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* ==================== 标签切换 ==================== */
.tab-bar {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
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

/* ==================== 内容区域 ==================== */
.tab-content { padding: 24px; }

/* ==================== 横幅图片管理 ==================== */

/* 卡片列表头部 */
.banner-cards-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.cards-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

/* 图片卡片网格 */
.banner-cards {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.banner-card {
  position: relative;
  width: 180px;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid #e8e8e8;
  transition: all 0.2s;
  background: #f9fafb;
}

.banner-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.banner-card.active {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.card-content {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.card-content img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-empty {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #bbb;
  background: #f5f5f5;
}

.card-empty i { font-size: 28px; }
.card-empty span { font-size: 12px; }

.card-index {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  background: #667eea;
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

/* 悬停操作层 */
.card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.banner-card:hover .card-overlay { opacity: 1; }

.overlay-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  cursor: pointer;
  color: #333;
  font-size: 14px;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: #fff;
  transform: scale(1.1);
}

.action-btn.upload {
  background: #667eea;
  color: #fff;
}

.action-btn.upload:hover {
  background: #5a6fd6;
}

.action-btn.delete:hover {
  background: #f56c6c;
  color: #fff;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

/* 隐藏的上传组件 */
.hidden-uploader {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

/* 预览区 */
.preview-section {
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  overflow: hidden;
  background: #fafafa;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-title i { color: #667eea; }

.preview-hint {
  font-size: 12px;
  color: #999;
}

.banner-preview {
  position: relative;
  aspect-ratio: 2.4 / 1;
  background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
}

.preview-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.preview-slide.active { opacity: 1; }

.preview-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-empty {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
  gap: 8px;
}

.preview-empty i { font-size: 48px; }
.preview-empty span { font-size: 14px; }

/* 左右切换按钮 */
.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border: none;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  border-radius: 50%;
  cursor: pointer;
  color: #fff;
  font-size: 18px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.nav-btn:hover {
  background: rgba(0, 0, 0, 0.6);
  transform: translateY(-50%) scale(1.08);
}

.nav-btn.prev { left: 16px; }
.nav-btn.next { right: 16px; }

/* 指示点 */
.preview-dots {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 10;
}

.dot {
  width: 10px;
  height: 10px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.3s;
  padding: 0;
}

.dot:hover {
  background: rgba(255, 255, 255, 0.7);
}

.dot.active {
  width: 28px;
  border-radius: 5px;
  background: #fff;
}

/* ==================== 区块标题设置（与关于我们页面一致） ==================== */
.split-layout {
  display: grid;
  grid-template-columns: 480px 1fr;
  gap: 20px;
  min-height: 400px;
}

.edit-side,
.preview-side {
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

.sections-preview-content {
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

/* 使用全局样式的 section-badge 和 section-title */

/* ==================== 响应式 ==================== */
@media (max-width: 1000px) {
  .split-layout {
    grid-template-columns: 1fr;
  }
  
  .banner-card {
    width: 160px;
  }
}

@media (max-width: 600px) {
  .tab-item {
    padding: 12px 16px;
  }
  
  .tab-item span {
    display: none;
  }
  
  .banner-card {
    width: calc(50% - 8px);
  }
  
  .banner-cards {
    gap: 12px;
  }
}
</style>
