<script setup lang="ts">
/**
 * 版本历史对话框组件
 * 用于查看内容的版本历史并支持回滚操作
 */
import { ref, watch } from 'vue'
import { adminApi, type VersionInfo } from '@/api/contentApi'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps<{
  visible: boolean
  contentType: string
  contentKey: string
  title?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'rollback': [version: number]
}>()

// 状态
const loading = ref(false)
const versions = ref<VersionInfo[]>([])
const selectedVersion = ref<VersionInfo | null>(null)
const isRollingBack = ref(false)

// 加载版本历史
const loadVersions = async () => {
  if (!props.contentType || !props.contentKey) return
  
  loading.value = true
  try {
    versions.value = await adminApi.getVersions(props.contentType, props.contentKey)
  } catch (e) {
    console.error('加载版本历史失败:', e)
    ElMessage.error('加载版本历史失败')
  } finally {
    loading.value = false
  }
}

// 选择版本查看详情
const selectVersion = (version: VersionInfo) => {
  selectedVersion.value = version
}

// 回滚到指定版本
const rollbackToVersion = async (version: VersionInfo) => {
  try {
    await ElMessageBox.confirm(
      `确定要回滚到版本 ${version.version} 吗？回滚后将覆盖当前草稿数据，需要重新发布才能生效。`,
      '确认回滚',
      { confirmButtonText: '确定回滚', cancelButtonText: '取消', type: 'warning' }
    )
    
    isRollingBack.value = true
    await adminApi.rollback(props.contentType, props.contentKey, version.version)
    
    ElMessage.success(`已回滚到版本 ${version.version}，请检查数据后重新发布`)
    emit('rollback', version.version)
    handleClose()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('回滚失败')
      console.error(error)
    }
  } finally {
    isRollingBack.value = false
  }
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化 JSON 数据用于显示
const formatJson = (data: any) => {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

// 关闭对话框
const handleClose = () => {
  selectedVersion.value = null
  emit('update:visible', false)
}

// 监听 visible 变化，加载数据
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadVersions()
  }
})
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="title || '版本历史'"
    width="900px"
    @update:model-value="handleClose"
    class="version-history-dialog"
  >
    <div class="version-history-content" v-loading="loading">
      <!-- 无版本历史 -->
      <div v-if="!loading && versions.length === 0" class="empty-state">
        <i class="fas fa-history"></i>
        <p>暂无版本历史</p>
        <span>发布内容后会自动创建版本快照</span>
      </div>
      
      <!-- 版本列表 -->
      <div v-else class="version-layout">
        <!-- 左侧版本列表 -->
        <div class="version-list">
          <div class="list-header">
            <i class="fas fa-list"></i>
            <span>版本列表</span>
            <span class="version-count">{{ versions.length }} 个版本</span>
          </div>
          <div class="list-body">
            <div
              v-for="version in versions"
              :key="version.version"
              class="version-item"
              :class="{ active: selectedVersion?.version === version.version }"
              @click="selectVersion(version)"
            >
              <div class="version-info">
                <div class="version-main">
                  <span class="version-number">v{{ version.version }}</span>
                  <span class="version-date">{{ formatDate(version.createdAt) }}</span>
                </div>
                <div v-if="version.changeSummary" class="version-summary">
                  {{ version.changeSummary }}
                </div>
              </div>
              <div class="version-actions">
                <el-button
                  size="small"
                  type="warning"
                  plain
                  :loading="isRollingBack"
                  @click.stop="rollbackToVersion(version)"
                >
                  <i class="fas fa-undo mr-1"></i> 回滚
                </el-button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 右侧版本详情 -->
        <div class="version-detail">
          <div class="detail-header">
            <i class="fas fa-file-code"></i>
            <span>版本详情</span>
            <span v-if="selectedVersion" class="detail-version">v{{ selectedVersion.version }}</span>
          </div>
          <div class="detail-body">
            <div v-if="!selectedVersion" class="select-hint">
              <i class="fas fa-hand-pointer"></i>
              <p>点击左侧版本查看详情</p>
            </div>
            <div v-else class="version-data">
              <div class="data-meta">
                <div class="meta-item">
                  <label>版本号</label>
                  <span>v{{ selectedVersion.version }}</span>
                </div>
                <div class="meta-item">
                  <label>创建时间</label>
                  <span>{{ formatDate(selectedVersion.createdAt) }}</span>
                </div>
                <div v-if="selectedVersion.changeSummary" class="meta-item full">
                  <label>变更说明</label>
                  <span>{{ selectedVersion.changeSummary }}</span>
                </div>
              </div>
              <div class="data-content">
                <label>数据内容</label>
                <pre>{{ formatJson(selectedVersion.data) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.version-history-content {
  min-height: 400px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.empty-state i {
  font-size: 48px;
  color: #ddd;
  margin-bottom: 16px;
}

.empty-state p {
  margin: 0 0 8px;
  font-size: 16px;
  color: #666;
}

.empty-state span {
  font-size: 13px;
}

.version-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  min-height: 400px;
}

.version-list,
.version-detail {
  border: 1px solid var(--admin-border);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.list-header,
.detail-header {
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

.list-header i,
.detail-header i {
  color: #05548C;
}

.version-count,
.detail-version {
  margin-left: auto;
  font-size: 12px;
  font-weight: 500;
  color: #999;
  background: var(--admin-border);
  padding: 2px 8px;
  border-radius: 10px;
}

.detail-version {
  background: #05548C;
  color: #fff;
}

.list-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.version-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
  gap: 8px;
}

.version-item:hover {
  background: var(--admin-surface-alt);
}

.version-item.active {
  background: rgba(5, 84, 140, 0.1);
  border: 1px solid rgba(5, 84, 140, 0.3);
}

.version-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.version-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-number {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.version-date {
  font-size: 12px;
  color: #999;
}

.version-summary {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.select-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.select-hint i {
  font-size: 32px;
  color: #ddd;
  margin-bottom: 12px;
}

.select-hint p {
  margin: 0;
  font-size: 14px;
}

.version-data {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.data-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item.full {
  grid-column: span 2;
}

.meta-item label {
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.meta-item span {
  font-size: 14px;
  color: #333;
}

.data-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-content label {
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.data-content pre {
  margin: 0;
  padding: 12px;
  background: var(--admin-panel-bg);
  border: 1px solid var(--admin-border);
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 300px;
  white-space: pre-wrap;
  word-break: break-all;
}

.mr-1 {
  margin-right: 4px;
}
</style>
