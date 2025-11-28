<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useConfigStore } from '@/stores/configStore'
import { useAdminStore } from '@/stores/adminStore'

const configStore = useConfigStore()
const adminStore = useAdminStore()

// 配置类型选项
const configTypes = [
  { value: 'site-info', label: '网站信息', icon: 'House' },
  { value: 'home', label: '首页配置', icon: 'HomeFilled' },
  { value: 'product-center', label: '产品中心', icon: 'Box' },
  { value: 'brand-center', label: '品牌中心', icon: 'Star' },
  { value: 'news-center', label: '资讯中心', icon: 'Bell' },
  { value: 'about', label: '关于我们', icon: 'InfoFilled' }
]

// 当前选择的配置类型
const selectedType = ref('site-info')

// 配置内容
const configContent = ref('')

// 是否正在加载
const isLoading = ref(false)

// 加载配置
const loadConfig = async () => {
  isLoading.value = true
  
  try {
    let data: any = null
    
    if (selectedType.value === 'site-info') {
      data = await configStore.loadSiteConfig()
    } else {
      data = await configStore.loadPageConfig(selectedType.value)
    }
    
    if (data) {
      configContent.value = JSON.stringify(data, null, 2)
    } else {
      configContent.value = ''
    }
  } catch (error) {
    ElMessage.error('加载配置失败')
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

// 保存配置
const saveConfig = async () => {
  try {
    // 验证JSON格式
    const parsed = JSON.parse(configContent.value)
    
    // 创建备份
    configStore.createBackup(selectedType.value, parsed)
    
    // 生成下载
    downloadConfig()
    
    ElMessage.success('配置已保存，请下载并替换对应文件')
    
    // 记录活动
    adminStore.addActivity({
      type: 'config',
      target: selectedType.value,
      description: `修改了 ${selectedType.value} 配置`
    })
  } catch (error) {
    ElMessage.error('JSON格式错误，请检查')
  }
}

// 下载配置
const downloadConfig = () => {
  const blob = new Blob([configContent.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `${selectedType.value}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 重置配置
const resetConfig = async () => {
  try {
    await ElMessageBox.confirm('确定要重置当前配置吗？未保存的更改将丢失', '提示', {
      type: 'warning'
    })
    
    await loadConfig()
    ElMessage.success('配置已重置')
  } catch {
    // 用户取消
  }
}

// 格式化JSON
const formatJson = () => {
  try {
    const parsed = JSON.parse(configContent.value)
    configContent.value = JSON.stringify(parsed, null, 2)
    ElMessage.success('JSON已格式化')
  } catch {
    ElMessage.error('JSON格式错误，无法格式化')
  }
}

// 监听配置类型变化
const handleTypeChange = () => {
  loadConfig()
}

onMounted(() => {
  configStore.init()
  loadConfig()
})
</script>

<template>
  <div class="config-manager">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-gray-800 mb-2">配置管理</h2>
      <p class="text-gray-500">编辑网站配置文件，修改后下载并替换对应文件</p>
    </div>
    
    <!-- 操作区 -->
    <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div class="flex flex-wrap items-center gap-4">
        <!-- 配置类型选择 -->
        <el-select
          v-model="selectedType"
          placeholder="选择配置类型"
          style="width: 200px"
          @change="handleTypeChange"
        >
          <el-option
            v-for="type in configTypes"
            :key="type.value"
            :label="type.label"
            :value="type.value"
          >
            <div class="flex items-center">
              <el-icon class="mr-2"><component :is="type.icon" /></el-icon>
              <span>{{ type.label }}</span>
            </div>
          </el-option>
        </el-select>
        
        <!-- 刷新 -->
        <el-button @click="loadConfig" :loading="isLoading">
          <el-icon class="mr-1"><Refresh /></el-icon>
          刷新
        </el-button>
        
        <!-- 格式化 -->
        <el-button @click="formatJson">
          <el-icon class="mr-1"><MagicStick /></el-icon>
          格式化
        </el-button>
        
        <!-- 重置 -->
        <el-button type="warning" plain @click="resetConfig">
          <el-icon class="mr-1"><RefreshLeft /></el-icon>
          重置
        </el-button>
        
        <!-- 保存并下载 -->
        <el-button type="primary" @click="saveConfig">
          <el-icon class="mr-1"><Download /></el-icon>
          保存并下载
        </el-button>
      </div>
    </div>
    
    <!-- 编辑器 -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="bg-gray-100 px-4 py-2 border-b flex items-center justify-between">
        <span class="text-sm text-gray-600">
          {{ selectedType }}.json
        </span>
        <span class="text-xs text-gray-400">
          按 Ctrl+S 快速保存
        </span>
      </div>
      
      <el-input
        v-model="configContent"
        type="textarea"
        :rows="25"
        placeholder="配置内容..."
        class="config-editor"
        @keydown.ctrl.s.prevent="saveConfig"
      />
    </div>
    
    <!-- 备份列表 -->
    <div v-if="configStore.backupCount > 0" class="mt-6 bg-white rounded-xl shadow-sm p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">
        配置备份 ({{ configStore.backupCount }})
      </h3>
      <div class="space-y-2">
        <div
          v-for="backup in configStore.backups.slice(0, 5)"
          :key="backup.id"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div>
            <span class="font-medium text-gray-700">{{ backup.type }}</span>
            <span class="text-sm text-gray-400 ml-4">
              {{ new Date(backup.timestamp).toLocaleString('zh-CN') }}
            </span>
          </div>
          <el-button
            type="primary"
            text
            size="small"
            @click="configContent = JSON.stringify(configStore.restoreFromBackup(backup.id), null, 2)"
          >
            恢复
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-editor :deep(.el-textarea__inner) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  border: none;
  border-radius: 0;
  resize: none;
}
</style>

