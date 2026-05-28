<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAdminStore } from '@/stores/adminStore'
import { adminApi } from '@/api/contentApi'
import { ElMessage, ElMessageBox } from 'element-plus'
import HomeImagePicker from '@/components/admin/HomeImagePicker.vue'
import VersionHistoryDialog from '../components/VersionHistoryDialog.vue'

const adminStore = useAdminStore()

// ==================== 标签切换 ====================
const activeTab = ref<'banners' | 'hero' | 'sections'>('banners')

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
// 横幅数据结构：使用 imageId 关联图片库
interface BannerItem {
  id: string           // 横幅位置唯一标识
  imageId: number | null  // 关联的图片库图片ID
  url: string          // 图片URL（用于显示）
  filename: string     // 文件名
  heroGroupId: string  // 绑定的文案组
}

interface HeroGroupItem {
  id: string
  name: string
  keywords: string
  title: string
  subtitle: string
}

const DEFAULT_HERO_GROUP_ID = 'hero_default'
const defaultHero = {
  keywords: '试剂 | 耗材 | 仪器 | PCR | 细胞 | 分子生物 | 血清 | 培养基',
  title: '科研试剂耗材一站式供应',
  subtitle: '信立科研 · 荣筑未来'
}

const createId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const createHeroGroup = (overrides: Partial<HeroGroupItem> = {}): HeroGroupItem => ({
  id: overrides.id || createId('hero'),
  name: overrides.name || '未命名文案组',
  keywords: overrides.keywords || '',
  title: overrides.title || '',
  subtitle: overrides.subtitle || ''
})

const createEmptySections = () => ({
  products: { badge: '', title: '' },
  brands: { badge: '', title: '' },
  promotions: { badge: '', title: '' }
})

const bannerImages = ref<BannerItem[]>([])
const heroGroups = ref<HeroGroupItem[]>([
  createHeroGroup({
    id: DEFAULT_HERO_GROUP_ID,
    name: '默认文案',
    ...defaultHero
  })
])
const selectedHeroGroupId = ref<string>(DEFAULT_HERO_GROUP_ID)
const sections = ref(createEmptySections())

const originalData = ref<string>('')

// ==================== 计算属性 ====================
const currentDataString = computed(() => JSON.stringify({
  slides: bannerImages.value,
  heroGroups: heroGroups.value,
  sections: sections.value
}))
const hasUnsavedChanges = computed(() => originalData.value !== '' && currentDataString.value !== originalData.value)

const getHeroGroupById = (groupId?: string | null) =>
  heroGroups.value.find(group => group.id === groupId) || heroGroups.value[0] || null

const normalizeHeroGroups = (
  groups?: any[],
  legacyHero?: { keywords?: string; title?: string; subtitle?: string }
): HeroGroupItem[] => {
  if (Array.isArray(groups) && groups.length > 0) {
    return groups.map((group, index) => createHeroGroup({
      id: group?.id || createId(`hero_${index + 1}`),
      name: group?.name || `文案组 ${index + 1}`,
      keywords: group?.keywords || '',
      title: group?.title || '',
      subtitle: group?.subtitle || ''
    }))
  }

  return [
    createHeroGroup({
      id: DEFAULT_HERO_GROUP_ID,
      name: '默认文案',
      keywords: legacyHero?.keywords || defaultHero.keywords,
      title: legacyHero?.title || defaultHero.title,
      subtitle: legacyHero?.subtitle || defaultHero.subtitle
    })
  ]
}

const normalizeSlides = (data: any, availableHeroGroups: HeroGroupItem[]): BannerItem[] => {
  const fallbackHeroGroupId = availableHeroGroups[0]?.id || DEFAULT_HERO_GROUP_ID
  const rawSlides = Array.isArray(data?.slides)
    ? data.slides
    : Array.isArray(data?.images)
      ? data.images
      : []

  if (rawSlides.length === 0) {
    return [{
      id: createId('slide'),
      imageId: null,
      url: '',
      filename: '',
      heroGroupId: fallbackHeroGroupId
    }]
  }

  return rawSlides.map((slide: any, index: number) => ({
    id: slide?.id || createId(`slide_${index + 1}`),
    imageId: typeof slide?.imageId === 'number' ? slide.imageId : null,
    url: slide?.url || '',
    filename: slide?.filename || '',
    heroGroupId: slide?.heroGroupId || fallbackHeroGroupId
  }))
}

const syncBannerHeroGroupIds = () => {
  const fallbackHeroGroupId = heroGroups.value[0]?.id || DEFAULT_HERO_GROUP_ID
  const validIds = new Set(heroGroups.value.map(group => group.id))

  bannerImages.value.forEach(banner => {
    if (!banner.heroGroupId || !validIds.has(banner.heroGroupId)) {
      banner.heroGroupId = fallbackHeroGroupId
    }
  })
}

const ensureSelectedHeroGroup = () => {
  if (!selectedHeroGroupId.value || !heroGroups.value.some(group => group.id === selectedHeroGroupId.value)) {
    selectedHeroGroupId.value = heroGroups.value[0]?.id || DEFAULT_HERO_GROUP_ID
  }
}

const currentPreviewHeroGroup = computed(() => {
  const previewBanner = bannerImages.value[previewIndex.value] || bannerImages.value[0] || null
  return getHeroGroupById(previewBanner?.heroGroupId)
})

const currentPreviewHero = computed(() => ({
  keywords: currentPreviewHeroGroup.value?.keywords || defaultHero.keywords,
  title: currentPreviewHeroGroup.value?.title || defaultHero.title,
  subtitle: currentPreviewHeroGroup.value?.subtitle || defaultHero.subtitle
}))

const selectedHeroGroup = computed(() => getHeroGroupById(selectedHeroGroupId.value))

const selectedHeroPreview = computed(() => ({
  keywords: selectedHeroGroup.value?.keywords || defaultHero.keywords,
  title: selectedHeroGroup.value?.title || defaultHero.title,
  subtitle: selectedHeroGroup.value?.subtitle || defaultHero.subtitle
}))

const selectedHeroSlides = computed(() => {
  if (!selectedHeroGroup.value) return []
  return bannerImages.value.filter(banner => banner.heroGroupId === selectedHeroGroup.value?.id)
})

const selectedHeroPreviewBanner = computed(() => {
  return selectedHeroSlides.value[0] || bannerImages.value[previewIndex.value] || bannerImages.value[0] || null
})

const getHeroGroupUsageCount = (groupId: string) =>
  bannerImages.value.filter(banner => banner.heroGroupId === groupId).length

// 已使用的图片ID集合（用于防止重复选择）
const getUsedImageIds = (excludeIndex: number): Set<number> => {
  const ids = new Set<number>()
  bannerImages.value.forEach((banner, index) => {
    if (index !== excludeIndex && banner.imageId) {
      ids.add(banner.imageId)
    }
  })
  return ids
}

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

const normalizeSections = (data?: any) => ({
  products: {
    badge: data?.products?.badge || '',
    title: data?.products?.title || ''
  },
  brands: {
    badge: data?.brands?.badge || '',
    title: data?.brands?.title || ''
  },
  promotions: {
    badge: data?.promotions?.badge || '',
    title: data?.promotions?.title || ''
  }
})

// ==================== 数据加载 ====================
const loadData = async () => {
  try {
    const content = await adminApi.getOne('home_config', 'main')
    const data = (content.draftData || content.publishedData || {}) as any

    heroGroups.value = normalizeHeroGroups(data.heroGroups, data.hero)
    bannerImages.value = normalizeSlides(data, heroGroups.value)
    syncBannerHeroGroupIds()
    ensureSelectedHeroGroup()
    sections.value = normalizeSections(data.sections)
    
    const hasDraft = content.draftData !== null
    const hasPublished = content.publishedData !== null
    const draftDiffersFromPublished = hasDraft && hasPublished && JSON.stringify(content.draftData) !== JSON.stringify(content.publishedData)
    
    contentStatus.value = (draftDiffersFromPublished || (hasDraft && !hasPublished)) ? 'draft' : hasPublished ? 'published' : 'unpublished'
    currentVersion.value = content.version || 1
    originalData.value = currentDataString.value
    editStatus.value = 'clean'
  } catch (e) {
    console.error('加载首页设置失败:', e)
    heroGroups.value = [
      createHeroGroup({
        id: DEFAULT_HERO_GROUP_ID,
        name: '默认文案',
        ...defaultHero
      })
    ]
    selectedHeroGroupId.value = DEFAULT_HERO_GROUP_ID
    bannerImages.value = [{
      id: createId('slide'),
      imageId: null,
      url: '',
      filename: '',
      heroGroupId: DEFAULT_HERO_GROUP_ID
    }]
    sections.value = createEmptySections()
    originalData.value = currentDataString.value
    contentStatus.value = 'unpublished'
    editStatus.value = 'clean'
    ElMessage.error('加载首页设置失败，请检查后台接口')
  }
}

// ==================== 横幅操作 ====================
const previewIndex = ref(0)
const pickerRefs = ref<Record<number, any>>({})
const currentPreviewBanner = computed(() => bannerImages.value[previewIndex.value] || bannerImages.value[0] || null)
const addBanner = () => bannerImages.value.push({
  id: createId('slide'),
  imageId: null,
  url: '',
  filename: '',
  heroGroupId: heroGroups.value[0]?.id || DEFAULT_HERO_GROUP_ID
})

// 打开图片选择器
const openImagePicker = (index: number) => {
  const picker = pickerRefs.value[index]
  if (picker?.openPicker) {
    picker.openPicker()
  }
}

// 处理图片选择变化
const handleImageChange = (index: number, imageInfo: { id: number; url: string; filename: string } | null) => {
  if (imageInfo) {
    bannerImages.value[index].imageId = imageInfo.id
    bannerImages.value[index].url = imageInfo.url
    bannerImages.value[index].filename = imageInfo.filename
  } else {
    bannerImages.value[index].imageId = null
    bannerImages.value[index].url = ''
    bannerImages.value[index].filename = ''
  }
}

const bindHeroGroupToBanner = (index: number, heroGroupId: string) => {
  bannerImages.value[index].heroGroupId = heroGroupId
}

const removeBanner = async (index: number) => {
  if (bannerImages.value.length <= 1) { ElMessage.warning('至少保留一个横幅位置'); return }
  try {
    await ElMessageBox.confirm('确定要删除这个横幅位置吗？', '确认删除', { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' })
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

// ==================== 文案组操作 ====================
const addHeroGroup = () => {
  const nextIndex = heroGroups.value.length + 1
  const newGroup = createHeroGroup({
    name: `文案组 ${nextIndex}`
  })
  heroGroups.value.push(newGroup)
  selectedHeroGroupId.value = newGroup.id
}

const removeHeroGroup = async (groupId: string) => {
  if (heroGroups.value.length <= 1) {
    ElMessage.warning('至少保留一个文案组')
    return
  }

  const targetGroup = getHeroGroupById(groupId)
  if (!targetGroup) return

  const fallbackGroup = heroGroups.value.find(group => group.id !== groupId)
  if (!fallbackGroup) return

  const usageCount = getHeroGroupUsageCount(groupId)
  const confirmText = usageCount > 0
    ? `该文案组已绑定 ${usageCount} 张横幅，删除后这些横幅将自动改绑到「${fallbackGroup.name}」。确定继续吗？`
    : '确定要删除这个文案组吗？'

  try {
    await ElMessageBox.confirm(confirmText, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    bannerImages.value.forEach(banner => {
      if (banner.heroGroupId === groupId) {
        banner.heroGroupId = fallbackGroup.id
      }
    })

    heroGroups.value = heroGroups.value.filter(group => group.id !== groupId)
    selectedHeroGroupId.value = fallbackGroup.id
    syncBannerHeroGroupIds()
  } catch {}
}

const duplicateHeroGroup = (groupId: string) => {
  const group = getHeroGroupById(groupId)
  if (!group) return

  const copy = createHeroGroup({
    name: `${group.name} 副本`,
    keywords: group.keywords,
    title: group.title,
    subtitle: group.subtitle
  })

  heroGroups.value.push(copy)
  selectedHeroGroupId.value = copy.id
}

// ==================== 保存发布 ====================
// 构建保存数据，只保存有图片的横幅
const buildData = () => ({ 
  slides: bannerImages.value.filter(b => b.imageId && b.url).map(b => ({
    id: b.id,
    imageId: b.imageId,
    url: b.url,
    filename: b.filename,
    heroGroupId: b.heroGroupId || heroGroups.value[0]?.id || DEFAULT_HERO_GROUP_ID
  })),
  heroGroups: heroGroups.value.map(group => ({
    id: group.id,
    name: group.name.trim() || '未命名文案组',
    keywords: group.keywords,
    title: group.title,
    subtitle: group.subtitle
  })),
  sections: sections.value 
})

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
        <span class="subtitle">管理首页横幅图片、横幅文案和区块标题</span>
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
      <div class="tab-item" :class="{ active: activeTab === 'hero' }" @click="activeTab = 'hero'">
        <i class="fas fa-font"></i><span>横幅文案</span>
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
              <div v-else class="card-empty" @click.stop="openImagePicker(index)">
                <i class="fas fa-image"></i>
                <span>点击选择图片</span>
              </div>
            </div>
            <!-- 序号 -->
            <div class="card-index">{{ index + 1 }}</div>
            <!-- 悬停操作层 -->
            <div class="card-overlay">
              <div class="overlay-actions">
                <button class="action-btn upload" title="选择图片" @click.stop="openImagePicker(index)">
                  <i class="fas fa-images"></i>
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
            <!-- 隐藏的图片选择器 -->
            <HomeImagePicker 
              :ref="(el: any) => pickerRefs[index] = el"
              v-model="bannerImages[index].imageId"
              :used-image-ids="getUsedImageIds(index)"
              :current-index="index"
              placeholder="点击选择横幅图片"
              class="hidden-picker"
              @image-change="(info) => handleImageChange(index, info)"
            />
            <div class="card-meta" @click.stop>
              <div class="card-meta-label">绑定文案组</div>
              <el-select
                v-model="bannerImages[index].heroGroupId"
                size="small"
                class="banner-hero-select"
                @change="value => bindHeroGroupToBanner(index, value)"
              >
                <el-option
                  v-for="group in heroGroups"
                  :key="group.id"
                  :label="`${group.name} (${getHeroGroupUsageCount(group.id)} 张)`"
                  :value="group.id"
                />
              </el-select>
            </div>
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
            <div class="preview-hero-overlay">
              <div class="preview-hero-panel">
                <div class="preview-hero-keywords">{{ currentPreviewHero.keywords }}</div>
                <h2 class="preview-hero-title">{{ currentPreviewHero.title }}</h2>
                <p class="preview-hero-subtitle">{{ currentPreviewHero.subtitle }}</p>
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

      <!-- 横幅文案设置 -->
      <div v-show="activeTab === 'hero'" class="tab-content">
        <div class="split-layout">
          <div class="edit-side">
            <div class="edit-header">
              <div class="edit-title"><i class="fas fa-font"></i><span>横幅文案组设置</span></div>
              <div class="hero-header-actions">
                <el-button size="small" type="primary" plain @click="addHeroGroup">
                  <i class="fas fa-plus mr-1"></i> 添加文案组
                </el-button>
              </div>
            </div>
            <div class="sections-edit">
              <div class="hero-group-list">
                <button
                  v-for="group in heroGroups"
                  :key="group.id"
                  type="button"
                  class="hero-group-chip"
                  :class="{ active: selectedHeroGroupId === group.id }"
                  @click="selectedHeroGroupId = group.id"
                >
                  <span class="hero-group-chip-name">{{ group.name }}</span>
                  <span class="hero-group-chip-count">{{ getHeroGroupUsageCount(group.id) }} 张图</span>
                </button>
              </div>

              <div v-if="selectedHeroGroup" class="section-edit-item">
                <div class="section-edit-header hero-group-edit-header">
                  <div class="hero-group-edit-title">
                    <i class="fas fa-pen-nib"></i>
                    <span>编辑文案组</span>
                  </div>
                  <div class="hero-group-edit-actions">
                    <el-button size="small" text @click="duplicateHeroGroup(selectedHeroGroup.id)">
                      <i class="fas fa-copy mr-1"></i> 复制
                    </el-button>
                    <el-button size="small" text type="danger" @click="removeHeroGroup(selectedHeroGroup.id)">
                      <i class="fas fa-trash mr-1"></i> 删除
                    </el-button>
                  </div>
                </div>
                <div class="section-edit-fields">
                  <div class="field-row">
                    <label>文案组名称</label>
                    <el-input
                      v-model="selectedHeroGroup.name"
                      placeholder="如：科研综合文案"
                    />
                  </div>
                  <div class="field-help">这个名称主要用于后台识别与绑定，不会直接显示到前台首页。</div>
                </div>
              </div>

              <div v-if="selectedHeroGroup" class="section-edit-item">
                <div class="section-edit-header"><i class="fas fa-tags"></i><span>顶部关键词条</span></div>
                <div class="section-edit-fields">
                  <div class="field-row">
                    <label>关键词行</label>
                    <el-input
                      v-model="selectedHeroGroup.keywords"
                      type="textarea"
                      :rows="2"
                      placeholder="如：试剂 | 耗材 | 仪器 | PCR | 细胞 | 分子生物 | 血清 | 培养基"
                    />
                  </div>
                  <div class="field-help">建议使用竖线分隔关键词，前台会按一整行显示。</div>
                </div>
              </div>

              <div v-if="selectedHeroGroup" class="section-edit-item">
                <div class="section-edit-header"><i class="fas fa-heading"></i><span>主标题</span></div>
                <div class="section-edit-fields">
                  <div class="field-row">
                    <label>主标题内容</label>
                    <el-input
                      v-model="selectedHeroGroup.title"
                      placeholder="如：科研试剂耗材一站式供应"
                    />
                  </div>
                </div>
              </div>

              <div v-if="selectedHeroGroup" class="section-edit-item">
                <div class="section-edit-header"><i class="fas fa-quote-right"></i><span>副标题 / 标语</span></div>
                <div class="section-edit-fields">
                  <div class="field-row">
                    <label>副标题内容</label>
                    <el-input
                      v-model="selectedHeroGroup.subtitle"
                      placeholder="如：信立科研 · 荣筑未来"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="preview-side">
            <div class="preview-header"><i class="fas fa-eye"></i><span>效果预览</span></div>
            <div class="preview-content hero-preview-content">
              <div class="hero-preview-stage">
                <img v-if="selectedHeroPreviewBanner && selectedHeroPreviewBanner.url" :src="selectedHeroPreviewBanner.url" alt="" />
                <div v-else class="hero-preview-fallback">
                  <i class="fas fa-image"></i>
                  <span>当前文案组还没有绑定横幅图片</span>
                </div>
                <div class="hero-preview-mask"></div>
                <div class="preview-hero-overlay">
                  <div class="preview-hero-panel">
                    <div class="preview-hero-keywords">{{ selectedHeroPreview.keywords }}</div>
                    <h2 class="preview-hero-title">{{ selectedHeroPreview.title }}</h2>
                    <p class="preview-hero-subtitle">{{ selectedHeroPreview.subtitle }}</p>
                  </div>
                </div>
              </div>
              <p class="hero-preview-tip">预览优先使用当前文案组绑定的第一张横幅图片；如果该文案组暂未绑定图片，则显示默认背景。</p>
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
  border-bottom: 1px solid var(--admin-border);
  background: var(--admin-surface-alt);
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
  color: #05548C;
  background: rgba(5, 84, 140, 0.05);
}

.tab-item.active {
  color: #05548C;
  border-bottom-color: #05548C;
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
  border: 2px solid var(--admin-border);
  transition: all 0.2s;
  background: var(--admin-panel-bg);
}

.banner-card:hover {
  border-color: #05548C;
  box-shadow: 0 4px 12px rgba(5, 84, 140, 0.15);
}

.banner-card.active {
  border-color: #05548C;
  box-shadow: 0 0 0 3px rgba(5, 84, 140, 0.2);
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
  background: var(--admin-surface-alt);
}

.card-empty i { font-size: 28px; }
.card-empty span { font-size: 12px; }

.card-index {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  background: #05548C;
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.card-meta {
  padding: 10px;
  border-top: 1px solid var(--admin-border);
  background: #fff;
}

.card-meta-label {
  margin-bottom: 6px;
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.banner-hero-select {
  width: 100%;
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
  background: #05548C;
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

/* 隐藏的图片选择器 */
.hidden-picker {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

/* 预览区 */
.preview-section {
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--admin-surface-alt);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid var(--admin-border);
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-title i { color: #05548C; }

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

.preview-hero-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  pointer-events: none;
  z-index: 5;
}

.preview-hero-panel {
  width: min(78%, 760px);
  padding: 28px 48px;
  text-align: center;
  background: rgba(5, 84, 140, 0.72);
  backdrop-filter: blur(4px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
}

.preview-hero-keywords {
  display: inline-block;
  padding: 10px 28px;
  margin-bottom: 22px;
  background: rgba(255, 255, 255, 0.96);
  color: #05548C;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  white-space: pre-line;
}

.preview-hero-title {
  margin: 0 0 18px;
  color: #fff;
  font-size: clamp(30px, 3.2vw, 64px);
  font-weight: 800;
  letter-spacing: 4px;
  line-height: 1.2;
  white-space: pre-line;
}

.preview-hero-subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.96);
  font-size: clamp(18px, 1.5vw, 28px);
  font-weight: 400;
  letter-spacing: 6px;
  white-space: pre-line;
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
  border: 1px solid var(--admin-border);
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
  background: var(--admin-panel-bg);
  border-bottom: 1px solid var(--admin-border);
}

.edit-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.edit-title i { color: #05548C; }

.hero-header-actions {
  display: flex;
  align-items: center;
}

.sections-edit {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero-group-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero-group-chip {
  min-width: 150px;
  padding: 10px 12px;
  border: 1px solid var(--admin-border);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.hero-group-chip:hover {
  border-color: #05548C;
  box-shadow: 0 4px 12px rgba(5, 84, 140, 0.1);
}

.hero-group-chip.active {
  border-color: #05548C;
  background: rgba(5, 84, 140, 0.05);
  box-shadow: 0 0 0 2px rgba(5, 84, 140, 0.12);
}

.hero-group-chip-name {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.hero-group-chip-count {
  font-size: 12px;
  color: #909399;
}

.section-edit-item {
  border: 1px solid var(--admin-border);
  border-radius: 8px;
  overflow: hidden;
}

.section-edit-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--admin-panel-bg);
  border-bottom: 1px solid var(--admin-border);
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.section-edit-header i { color: #05548C; }

.hero-group-edit-header {
  justify-content: space-between;
}

.hero-group-edit-title,
.hero-group-edit-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

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

.field-help {
  font-size: 12px;
  line-height: 1.6;
  color: #909399;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--admin-panel-bg);
  border-bottom: 1px solid var(--admin-border);
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.preview-header i { color: #05548C; }

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #fff;
}

.hero-preview-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero-preview-stage {
  position: relative;
  aspect-ratio: 2.4 / 1;
  overflow: hidden;
  border-radius: 12px;
  background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
}

.hero-preview-stage img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-preview-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.55);
}

.hero-preview-fallback i {
  font-size: 44px;
}

.hero-preview-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0.72));
}

.hero-preview-tip {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: #909399;
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
  background: var(--admin-panel-bg);
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

  .hero-group-chip {
    min-width: calc(50% - 5px);
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

  .card-meta {
    padding: 8px;
  }

  .hero-group-chip {
    width: 100%;
    min-width: 100%;
  }

  .preview-hero-panel {
    width: 100%;
    padding: 20px 18px;
  }

  .preview-hero-keywords {
    font-size: 12px;
    padding: 8px 16px;
    margin-bottom: 16px;
  }

  .preview-hero-title {
    letter-spacing: 1px;
  }

  .preview-hero-subtitle {
    letter-spacing: 2px;
  }
}
</style>
