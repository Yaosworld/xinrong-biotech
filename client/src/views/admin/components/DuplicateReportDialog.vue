<script setup lang="ts">
import { computed } from 'vue'
import type { DuplicateCheckResult } from '@/utils/duplicateDetector'

const props = defineProps<{
  visible: boolean
  result: DuplicateCheckResult | null
  columns: { key: string; label: string }[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'skip': []
  'importAll': []
  'cancel': []
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const totalDup = computed(() => 
  (props.result?.stats.internalDupCount || 0) + (props.result?.stats.existingDupCount || 0)
)

const getPreview = (item: any) => {
  const col = props.columns[1] || props.columns[0]
  const value = item[col?.key]
  if (!value) return '-'
  const str = String(value)
  return str.length > 20 ? str.substring(0, 20) + '...' : str
}

const handleSkip = () => {
  emit('skip')
  dialogVisible.value = false
}

const handleImportAll = () => {
  emit('importAll')
  dialogVisible.value = false
}

const handleClose = () => {
  emit('cancel')
  dialogVisible.value = false
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title=""
    width="420px"
    :show-close="true"
    :close-on-click-modal="false"
    @close="handleClose"
    class="duplicate-dialog"
  >
    <div class="report-content" v-if="result">
      <!-- 标题 -->
      <div class="report-header">
        <div class="header-icon">
          <i class="fas fa-copy"></i>
        </div>
        <h3>检测到重复数据</h3>
        <p>以下数据与现有内容重复，请选择处理方式</p>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-value">{{ result.stats.total }}</span>
          <span class="stat-label">总计</span>
        </div>
        <div class="stat-card success">
          <span class="stat-value">{{ result.stats.unique }}</span>
          <span class="stat-label">可导入</span>
        </div>
        <div class="stat-card danger">
          <span class="stat-value">{{ totalDup }}</span>
          <span class="stat-label">重复</span>
        </div>
      </div>

      <!-- 重复列表 -->
      <div class="dup-list" v-if="totalDup > 0">
        <!-- 文件内重复 -->
        <template v-if="result.internalDuplicates.length > 0">
          <div class="dup-section">
            <div class="section-title warning">
              <i class="fas fa-exclamation-triangle"></i>
              文件内重复
              <span class="count">{{ result.internalDuplicates.length }}</span>
            </div>
            <div class="dup-items">
              <div 
                v-for="dup in result.internalDuplicates.slice(0, 3)" 
                :key="dup.importIndex"
                class="dup-item"
              >
                <span class="row-num">{{ dup.importIndex + 2 }}</span>
                <span class="row-content">{{ getPreview(dup.item) }}</span>
              </div>
              <div v-if="result.internalDuplicates.length > 3" class="more-tip">
                +{{ result.internalDuplicates.length - 3 }} 条
              </div>
            </div>
          </div>
        </template>

        <!-- 与现有数据重复 -->
        <template v-if="result.existingDuplicates.length > 0">
          <div class="dup-section">
            <div class="section-title danger">
              <i class="fas fa-times-circle"></i>
              与现有数据重复
              <span class="count">{{ result.existingDuplicates.length }}</span>
            </div>
            <div class="dup-items">
              <div 
                v-for="dup in result.existingDuplicates.slice(0, 3)" 
                :key="dup.importIndex"
                class="dup-item"
              >
                <span class="row-num">{{ dup.importIndex + 2 }}</span>
                <span class="row-content">{{ getPreview(dup.item) }}</span>
              </div>
              <div v-if="result.existingDuplicates.length > 3" class="more-tip">
                +{{ result.existingDuplicates.length - 3 }} 条
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button @click="handleImportAll">全部导入</el-button>
        <el-button type="primary" @click="handleSkip">
          跳过重复，导入 {{ result?.stats.unique || 0 }} 条
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.report-content {
  padding: 0 4px;
}

.report-header {
  text-align: center;
  margin-bottom: 24px;
}

.header-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, #05548C, #43CEED);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.report-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px;
}

.report-header p {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  background: var(--admin-panel-bg);
  border-radius: 12px;
  padding: 16px 12px;
  text-align: center;
  border: 1px solid #f3f4f6;
}

.stat-card.success {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.stat-card.success .stat-value {
  color: #16a34a;
}

.stat-card.danger {
  background: #fef2f2;
  border-color: #fecaca;
}

.stat-card.danger .stat-value {
  color: #dc2626;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 600;
  color: #374151;
  line-height: 1;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #9ca3af;
  margin-top: 6px;
}

.dup-list {
  background: var(--admin-panel-bg);
  border-radius: 12px;
  padding: 16px;
}

.dup-section {
  margin-bottom: 16px;
}

.dup-section:last-child {
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 10px;
}

.section-title.warning {
  color: #d97706;
}

.section-title.danger {
  color: #dc2626;
}

.section-title .count {
  margin-left: auto;
  background: currentColor;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}

.section-title.warning .count {
  background: #fbbf24;
}

.section-title.danger .count {
  background: #f87171;
}

.dup-items {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.dup-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 13px;
}

.dup-item:last-child {
  border-bottom: none;
}

.row-num {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  background: #e5e7eb;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  margin-right: 12px;
}

.row-content {
  color: #4b5563;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-tip {
  text-align: center;
  padding: 8px;
  font-size: 12px;
  color: #9ca3af;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

<style>
/* 全局样式覆盖对话框 */
.duplicate-dialog .el-dialog__header {
  display: none;
}

.duplicate-dialog .el-dialog__body {
  padding: 24px 24px 16px;
}

.duplicate-dialog .el-dialog__footer {
  padding: 12px 24px 20px;
  border-top: 1px solid #f3f4f6;
}
</style>
