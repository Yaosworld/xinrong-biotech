<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  visible: boolean
  currentVersion: number
  publishSummary: string
  isPublishing: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:publishSummary': [value: string]
  'confirm': []
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const summary = computed({
  get: () => props.publishSummary,
  set: (val) => emit('update:publishSummary', val)
})
</script>

<template>
  <el-dialog v-model="dialogVisible" title="发布确认" width="500px" :close-on-click-modal="false">
    <div class="publish-dialog-content">
      <div class="publish-info">
        <i class="fas fa-info-circle"></i>
        <span>发布后前台页面将立即更新，当前版本 v{{ currentVersion }} 将升级为 v{{ currentVersion + 1 }}</span>
      </div>
      <div class="publish-form">
        <label>变更说明（可选）</label>
        <el-input
          v-model="summary"
          type="textarea"
          :rows="3"
          placeholder="简要描述本次发布的主要变更，方便日后回滚时识别版本..."
          maxlength="200"
          show-word-limit
        />
      </div>
    </div>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="emit('confirm')" :loading="isPublishing">
        <i class="fas fa-cloud-upload-alt mr-1"></i> 确认发布
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.publish-dialog-content { display: flex; flex-direction: column; gap: 16px; }
.publish-info { display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; color: #0369a1; font-size: 13px; line-height: 1.5; }
.publish-info i { margin-top: 2px; flex-shrink: 0; }
.publish-form { display: flex; flex-direction: column; gap: 8px; }
.publish-form label { font-size: 13px; font-weight: 500; color: #333; }
.mr-1 { margin-right: 4px; }
</style>
