<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 导航项配置
const navItems = [
  { name: '首页', path: '/', icon: 'fas fa-home', isSpecial: false },
  { name: '产品中心', path: '/products', icon: 'fas fa-flask', isSpecial: false },
  { name: '品牌中心', path: '/brands', icon: 'fas fa-award', isSpecial: false },
  { name: '资讯中心', path: '/news', icon: 'fas fa-newspaper', isSpecial: false },
  { name: '关于我们', path: '/about', icon: 'fas fa-building', isSpecial: true }
]

// 当前 isActive 函数
const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }

  if (route.path === path) {
    return true
  }

  if (route.path.startsWith(path + '/')) {
    return true
  }

  return false
}

// 当前的样式逻辑
const getNavLinkClassesCurrent = (item: any) => {
  const active = isActive(item.path)

  if (item.isSpecial) {
    // 关于我们按钮的特殊样式处理
    return active
      ? 'bg-primary-700 text-white shadow-lg transform scale-105 border border-primary-800'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:border-gray-300 border border-gray-200'
  } else {
    // 普通导航项样式
    return active
      ? 'text-primary-600 bg-primary-50 font-semibold border border-primary-200'
      : 'text-dark-600 hover:text-primary-600 hover:bg-primary-50 border border-transparent'
  }
}

// 建议的统一样式逻辑
const getNavLinkClassesUnified = (item: any) => {
  const active = isActive(item.path)

  // 统一的样式系统，所有导航项使用相同的逻辑
  return active
    ? 'text-primary-600 bg-primary-50 font-semibold border border-primary-200 shadow-sm'
    : 'text-dark-600 hover:text-primary-600 hover:bg-primary-50 border border-transparent hover:shadow-sm'
}

// 另一种方案：保持关于我们突出，但样式更统一
const getNavLinkClassesConsistent = (item: any) => {
  const active = isActive(item.path)

  if (item.isSpecial) {
    // 关于我们按钮 - 突出但与其他项样式逻辑一致
    return active
      ? 'text-white bg-primary-600 font-semibold shadow-md border border-primary-700 transform scale-105'
      : 'text-gray-700 bg-gray-100 font-medium hover:bg-gray-200 border border-gray-300 hover:shadow-md'
  } else {
    // 普通导航项 - 与关于我们保持相似的视觉层次
    return active
      ? 'text-primary-600 bg-primary-50 font-semibold border border-primary-200 shadow-sm'
      : 'text-dark-600 hover:text-primary-600 hover:bg-primary-50 border border-transparent hover:shadow-sm'
  }
}

// 当前路径
const currentPath = computed(() => route.path)

// 导航测试函数
const navigateToTest = (path: string) => {
  router.push(path)
}

// 样式分析
const styleAnalysis = computed(() => {
  return navItems.map(item => {
    const active = isActive(item.path)
    const currentStyles = getNavLinkClassesCurrent(item)
    const unifiedStyles = getNavLinkClassesUnified(item)
    const consistentStyles = getNavLinkClassesConsistent(item)

    return {
      name: item.name,
      path: item.path,
      isActive: active,
      isSpecial: item.isSpecial,
      currentStyles: currentStyles.split(' '),
      unifiedStyles: unifiedStyles.split(' '),
      consistentStyles: consistentStyles.split(' ')
    }
  })
})

onMounted(() => {
  console.log('样式对比测试页面已加载')
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- 测试标题 -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">导航样式对比测试</h1>
        <p class="text-gray-600">当前路径: <code class="bg-gray-200 px-2 py-1 rounded">{{ currentPath }}</code></p>
      </div>

      <!-- 测试导航 -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">测试导航</h2>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="item in navItems"
            :key="item.path"
            @click="navigateToTest(item.path)"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <i :class="item.icon" class="mr-2"></i>
            {{ item.name }}
          </button>
        </div>
      </div>

      <!-- 样式对比 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <!-- 当前样式 -->
        <div>
          <h2 class="text-xl font-semibold text-gray-800 mb-4">当前样式（有问题）</h2>
          <div class="space-y-2">
            <div
              v-for="item in navItems"
              :key="`current-${item.path}`"
              class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200"
              :class="getNavLinkClassesCurrent(item)"
            >
              <i :class="item.icon" class="text-center w-4"></i>
              <span>{{ item.name }}</span>
              <div v-if="item.isActive" class="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded">激活</div>
            </div>
          </div>
          <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <h4 class="font-medium mb-2">问题分析：</h4>
            <ul class="text-sm space-y-1">
              <li>• 关于我们使用完全不同的样式系统</li>
              <li>• 非激活状态使用灰色背景，与其他项不一致</li>
              <li>• 视觉上显得孤立，破坏整体设计</li>
            </ul>
          </div>
        </div>

        <!-- 统一样式 -->
        <div>
          <h2 class="text-xl font-semibold text-gray-800 mb-4">统一样式（方案1）</h2>
          <div class="space-y-2">
            <div
              v-for="item in navItems"
              :key="`unified-${item.path}`"
              class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200"
              :class="getNavLinkClassesUnified(item)"
            >
              <i :class="item.icon" class="text-center w-4"></i>
              <span>{{ item.name }}</span>
              <div v-if="item.isActive" class="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded">激活</div>
            </div>
          </div>
          <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
            <h4 class="font-medium mb-2">优点：</h4>
            <ul class="text-sm space-y-1">
              <li>• 所有导航项使用统一的样式逻辑</li>
              <li>• 视觉一致性很好</li>
              <li>• 维护简单</li>
            </ul>
            <h4 class="font-medium mb-2 mt-3">缺点：</h4>
            <ul class="text-sm space-y-1">
              <li>• 关于我们失去了突出的视觉效果</li>
              <li>• 无法体现其特殊重要性</li>
            </ul>
          </div>
        </div>

        <!-- 一致但突出 -->
        <div>
          <h2 class="text-xl font-semibold text-gray-800 mb-4">一致突出（推荐）</h2>
          <div class="space-y-2">
            <div
              v-for="item in navItems"
              :key="`consistent-${item.path}`"
              class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200"
              :class="getNavLinkClassesConsistent(item)"
            >
              <i :class="item.icon" class="text-center w-4"></i>
              <span>{{ item.name }}</span>
              <div v-if="item.isActive" class="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded">激活</div>
            </div>
          </div>
          <div class="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <h4 class="font-medium mb-2">优点：</h4>
            <ul class="text-sm space-y-1">
              <li>• 关于我们保持突出地位</li>
              <li>• 样式逻辑统一，视觉协调</li>
              <li>• 激活状态清晰明确</li>
              <li>• 体现了关于我们的重要性</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 详细样式分析 -->
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">详细样式分析</h2>

        <div class="space-y-4">
          <div
            v-for="item in styleAnalysis"
            :key="`analysis-${item.path}`"
            class="border-b pb-4"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center">
                <i :class="item.icon" class="mr-2 text-gray-600"></i>
                <span class="font-medium text-gray-800">{{ item.name }}</span>
                <span class="ml-2 text-sm text-gray-500">{{ item.path }}</span>
                <span v-if="item.isSpecial" class="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">特殊</span>
                <span v-if="item.isActive" class="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">激活</span>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- 当前样式 -->
              <div>
                <h4 class="text-sm font-medium text-gray-700 mb-2">当前样式</h4>
                <div class="bg-gray-100 p-3 rounded text-xs font-mono space-y-1">
                  <div
                    v-for="style in item.currentStyles"
                    :key="`current-${item.path}-${style}`"
                    class="text-gray-700"
                  >
                    {{ style }}
                  </div>
                </div>
              </div>

              <!-- 统一样式 -->
              <div>
                <h4 class="text-sm font-medium text-gray-700 mb-2">统一样式</h4>
                <div class="bg-gray-100 p-3 rounded text-xs font-mono space-y-1">
                  <div
                    v-for="style in item.unifiedStyles"
                    :key="`unified-${item.path}-${style}`"
                    class="text-gray-700"
                  >
                    {{ style }}
                  </div>
                </div>
              </div>

              <!-- 一致突出 -->
              <div>
                <h4 class="text-sm font-medium text-gray-700 mb-2">一致突出（推荐）</h4>
                <div class="bg-gray-100 p-3 rounded text-xs font-mono space-y-1">
                  <div
                    v-for="style in item.consistentStyles"
                    :key="`consistent-${item.path}-${style}`"
                    class="text-gray-700"
                  >
                    {{ style }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 样式问题总结 -->
      <div class="mt-8 bg-yellow-50 p-6 rounded-lg border border-yellow-200">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">样式问题总结</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="font-medium text-gray-700 mb-3">当前问题</h3>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-start">
                <span class="text-red-500 mr-2">❌</span>
                <span><strong>视觉不一致：</strong>关于我们使用完全不同的背景色系统</span>
              </li>
              <li class="flex items-start">
                <span class="text-red-500 mr-2">❌</span>
                <span><strong>样式孤立：</strong>灰色背景与其他导航项的浅色背景不协调</span>
              </li>
              <li class="flex items-start">
                <span class="text-red-500 mr-2">❌</span>
                <span><strong>用户体验差：</strong>用户很难理解为什么关于我们样式不同</span>
              </li>
              <li class="flex items-start">
                <span class="text-red-500 mr-2">❌</span>
                <span><strong>维护困难：</strong>两套样式系统增加了维护复杂度</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 class="font-medium text-gray-700 mb-3">推荐解决方案</h3>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-start">
                <span class="text-green-500 mr-2">✅</span>
                <span><strong>统一样式逻辑：</strong>所有导航项使用相同的基础样式</span>
              </li>
              <li class="flex items-start">
                <span class="text-green-500 mr-2">✅</span>
                <span><strong>保持突出：</strong>关于我们使用更深的背景色来突出重要性</span>
              </li>
              <li class="flex items-start">
                <span class="text-green-500 mr-2">✅</span>
                <span><strong>视觉协调：</strong>激活状态使用相同的视觉语言</span>
              </li>
              <li class="flex items-start">
                <span class="text-green-500 mr-2">✅</span>
                <span><strong>易于维护：</strong>统一样式管理，减少代码复杂度</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 实际组件测试 -->
      <div class="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">实际组件测试</h2>
        <div class="border-t pt-4">
          <p class="text-gray-600 mb-4">下方是实际的 AppHeader 组件，观察"关于我们"的样式表现：</p>
          <!-- 这里可以实际引入 AppHeader 组件进行测试 -->
          <div class="bg-gray-100 p-4 rounded-lg">
            <p class="text-center text-gray-500">请访问实际页面查看 AppHeader 组件效果</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>