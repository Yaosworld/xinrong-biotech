<script setup lang="ts">
import type { StatusConfig } from '@/hooks/useContentEditor'

defineProps<{
  statusConfig: StatusConfig
  currentVersion: number
  hasUnsavedChanges: boolean
  isOperating: boolean
  isSaving: boolean
  isPublishing: boolean
  showExportAll?: boolean
}>()

const emit = defineEmits<{
  'version-history': []
  'reset': []
  'export': []
  'export-all': []
  'save': []
  'publish': []
}>()
</script>

<template>
  <div class="editor-toolbar">
    <!-- 状态标签 -->
    <el-tag :type="statusConfig.type" size="small" :class="['status-tag', { pulse: statusConfig.pulse }]">
      <i :class="statusConfig.icon" class="mr-1"></i> {{ statusConfig.text }}
    </el-tag>
    <el-tag type="info" size="small" class="version-tag">v{{ currentVersion }}</el-tag>
    
    <!-- 操作按钮 -->
    <el-button @click="emit('version-history')" :disabled="isOperating">
      <i class="fas fa-history mr-1"></i> 版本历史
    </el-button>
    <el-button @click="emit('reset')" :disabled="!hasUnsavedChanges || isOperating">
      <i class="fas fa-undo mr-1"></i> 重置
    </el-button>
    <el-button v-if="showExportAll" @click="emit('export-all')">
      <i class="fas fa-download mr-1"></i> 导出全部
    </el-button>
    <el-button @click="emit('export')">
      <i class="fas fa-download mr-1"></i> 导出
    </el-button>
    <el-button :loading="isSaving" :disabled="!hasUnsavedChanges || isPublishing" @click="emit('save')">
      <i class="fas fa-save mr-1"></i> 保存草稿
    </el-button>
    <el-button type="primary" :loading="isPublishing" :disabled="isSaving" @click="emit('publish')">
      <i class="fas fa-cloud-upload-alt mr-1"></i> 发布
    </el-button>
  </div>
</template>

<style scoped>
.editor-toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.status-tag { margin-right: 4px; }
.status-tag.pulse { animation: pulse-animation 1.5s infinite; }
@keyframes pulse-animation { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
.version-tag { margin-right: 8px; }
.mr-1 { margin-right: 4px; }
</style>
