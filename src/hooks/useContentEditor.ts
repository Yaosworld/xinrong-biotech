/**
 * CMS 内容编辑器通用 Hook
 * 提供编辑状态管理、离开页面保护、发布流程等通用功能
 */
import { ref, computed, watch, onMounted, onBeforeUnmount, type Ref, type ComputedRef } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi, type ContentItem } from '@/api/contentApi'
import { useAdminStore } from '@/stores/adminStore'

// ==================== 类型定义 ====================
export type EditStatus = 'clean' | 'dirty' | 'saving' | 'publishing'
export type ContentStatus = 'draft' | 'published' | 'unpublished'

export interface StatusConfig {
  type: 'danger' | 'warning' | 'success' | 'info'
  icon: string
  text: string
  pulse: boolean
}

export interface UseContentEditorOptions<T = any> {
  /** 内容类型，如 'site_config', 'about', 'banner' */
  contentType: string
  /** 内容键，如 'main', 'products' */
  contentKey: string | Ref<string>
  /** 构建要保存的数据 */
  buildData: () => T
  /** 数据加载后的处理回调 */
  onDataLoaded?: (data: T | null, content: ContentItem<T>) => void
  /** 保存前的验证，返回 false 阻止保存 */
  validateBeforeSave?: () => boolean | string
  /** 保存成功后的回调 */
  onSaveSuccess?: () => void
  /** 发布成功后的回调 */
  onPublishSuccess?: (version: number) => void
  /** 清除缓存的回调 */
  clearCache?: () => void
  /** 活动日志的目标名称 */
  activityTarget: string
  /** 活动日志的描述前缀 */
  activityPrefix: string
}

export interface UseContentEditorReturn {
  // 状态
  editStatus: Ref<EditStatus>
  contentStatus: Ref<ContentStatus>
  currentVersion: Ref<number>
  originalData: Ref<string>
  showPublishDialog: Ref<boolean>
  publishSummary: Ref<string>
  showVersionHistory: Ref<boolean>
  
  // 计算属性
  hasUnsavedChanges: ComputedRef<boolean>
  statusConfig: ComputedRef<StatusConfig>
  isOperating: ComputedRef<boolean>
  
  // 方法
  loadData: () => Promise<void>
  saveData: () => Promise<void>
  openPublishDialog: () => Promise<void>
  publishData: () => Promise<void>
  resetData: () => Promise<void>
  exportConfig: (filename: string, data?: any) => void
  handleVersionRollback: () => Promise<void>
  updateOriginalData: (dataString: string) => void
  setContentStatus: (status: ContentStatus) => void
}

// ==================== Hook 实现 ====================
export function useContentEditor<T = any>(
  currentDataString: ComputedRef<string>,
  options: UseContentEditorOptions<T>
): UseContentEditorReturn {
  const adminStore = useAdminStore()
  
  // 获取 contentKey（支持响应式）
  const getContentKey = () => {
    return typeof options.contentKey === 'string' 
      ? options.contentKey 
      : options.contentKey.value
  }

  // ==================== 状态 ====================
  const editStatus = ref<EditStatus>('clean')
  const contentStatus = ref<ContentStatus>('unpublished')
  const currentVersion = ref(1)
  const originalData = ref<string>('')
  const showPublishDialog = ref(false)
  const publishSummary = ref('')
  const showVersionHistory = ref(false)

  // ==================== 计算属性 ====================
  const hasUnsavedChanges = computed(() => 
    originalData.value !== '' && currentDataString.value !== originalData.value
  )

  const isOperating = computed(() => 
    editStatus.value === 'saving' || editStatus.value === 'publishing'
  )

  // 监听数据变化，自动更新编辑状态
  watch(currentDataString, () => {
    if (!isOperating.value) {
      editStatus.value = hasUnsavedChanges.value ? 'dirty' : 'clean'
    }
  })

  // 状态标签配置
  const statusConfig = computed<StatusConfig>(() => {
    if (editStatus.value === 'dirty') {
      return { type: 'danger', icon: 'fas fa-pen', text: '编辑中 · 未保存', pulse: true }
    }
    if (editStatus.value === 'saving') {
      return { type: 'warning', icon: 'fas fa-spinner fa-spin', text: '保存中...', pulse: false }
    }
    if (editStatus.value === 'publishing') {
      return { type: 'warning', icon: 'fas fa-spinner fa-spin', text: '发布中...', pulse: false }
    }
    if (contentStatus.value === 'draft') {
      return { type: 'warning', icon: 'fas fa-file-alt', text: '草稿 · 待发布', pulse: false }
    }
    if (contentStatus.value === 'published') {
      return { type: 'success', icon: 'fas fa-check-circle', text: '已发布', pulse: false }
    }
    return { type: 'info', icon: 'fas fa-file', text: '未发布', pulse: false }
  })

  // ==================== 数据加载 ====================
  const loadData = async () => {
    try {
      const content = await adminApi.getOne<T>(options.contentType, getContentKey())
      const data = (content.draftData || content.publishedData || null) as T | null
      
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
      
      // 调用数据加载回调
      options.onDataLoaded?.(data, content)
      
      // 需要在回调后更新原始数据（因为回调会更新 formData）
      // 使用 nextTick 或直接在调用方更新
    } catch (e) {
      console.warn(`${options.contentType} API 加载失败:`, e)
      contentStatus.value = 'unpublished'
      throw e
    } finally {
      editStatus.value = 'clean'
    }
  }

  // ==================== 保存草稿 ====================
  const saveData = async () => {
    // 验证
    if (options.validateBeforeSave) {
      const result = options.validateBeforeSave()
      if (result === false) return
      if (typeof result === 'string') {
        ElMessage.warning(result)
        return
      }
    }

    try {
      editStatus.value = 'saving'
      const data = options.buildData()
      await adminApi.saveDraft(options.contentType, getContentKey(), data)
      
      originalData.value = currentDataString.value
      contentStatus.value = 'draft'
      editStatus.value = 'clean'
      
      options.onSaveSuccess?.()
      adminStore.addActivity({
        type: 'modify',
        target: options.activityTarget,
        description: `保存了${options.activityPrefix}草稿`
      })
      ElMessage.success('草稿已保存')
    } catch (error) {
      editStatus.value = hasUnsavedChanges.value ? 'dirty' : 'clean'
      ElMessage.error('保存失败')
      console.error(error)
    }
  }

  // ==================== 发布流程 ====================
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

  const publishData = async () => {
    // 验证
    if (options.validateBeforeSave) {
      const result = options.validateBeforeSave()
      if (result === false) {
        showPublishDialog.value = false
        return
      }
      if (typeof result === 'string') {
        ElMessage.warning(result)
        showPublishDialog.value = false
        return
      }
    }

    try {
      editStatus.value = 'publishing'
      showPublishDialog.value = false
      
      const data = options.buildData()
      await adminApi.saveDraft(options.contentType, getContentKey(), data)
      const result = await adminApi.publish(options.contentType, getContentKey(), publishSummary.value || undefined)
      
      originalData.value = currentDataString.value
      currentVersion.value = result.version
      contentStatus.value = 'published'
      editStatus.value = 'clean'
      
      options.clearCache?.()
      options.onPublishSuccess?.(result.version)
      
      adminStore.addActivity({
        type: 'modify',
        target: options.activityTarget,
        description: `发布了${options.activityPrefix} v${result.version}`
      })
      ElMessage.success(`发布成功！当前版本 v${result.version}`)
    } catch (error) {
      editStatus.value = hasUnsavedChanges.value ? 'dirty' : 'clean'
      ElMessage.error('发布失败')
      console.error(error)
    }
  }

  // ==================== 重置数据 ====================
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

  // ==================== 导出配置 ====================
  const exportConfig = (filename: string, data?: any) => {
    const exportData = data ?? options.buildData()
    const jsonStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
    
    adminStore.addActivity({
      type: 'download',
      target: options.activityTarget,
      description: `导出了${options.activityPrefix}配置`
    })
  }

  // ==================== 版本回滚 ====================
  const handleVersionRollback = async () => {
    await loadData()
    ElMessage.info('数据已回滚，请检查后重新发布')
  }

  // ==================== 辅助方法 ====================
  const updateOriginalData = (dataString: string) => {
    originalData.value = dataString
  }

  const setContentStatus = (status: ContentStatus) => {
    contentStatus.value = status
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

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  return {
    // 状态
    editStatus,
    contentStatus,
    currentVersion,
    originalData,
    showPublishDialog,
    publishSummary,
    showVersionHistory,
    
    // 计算属性
    hasUnsavedChanges,
    statusConfig,
    isOperating,
    
    // 方法
    loadData,
    saveData,
    openPublishDialog,
    publishData,
    resetData,
    exportConfig,
    handleVersionRollback,
    updateOriginalData,
    setContentStatus
  }
}
