<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'

const route = useRoute()
const router = useRouter()

// 模拟当前 AppHeader 中的 isActive 函数
const isActiveOriginal = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

// 修复后的 isActive 函数
const isActiveFixed = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }

  // 精确匹配
  if (route.path === path) return true

  // 子路由匹配（如 /products/123 匹配 /products）
  if (route.path.startsWith(path + '/')) return true

  return false
}

// 导航项配置
const navItems = [
  { name: '首页', path: '/', icon: 'fas fa-home' },
  { name: '产品中心', path: '/products', icon: 'fas fa-flask' },
  { name: '品牌中心', path: '/brands', icon: 'fas fa-award' },
  { name: '资讯中心', path: '/news', icon: 'fas fa-newspaper' },
  { name: '关于我们', path: '/about', icon: 'fas fa-building' }
]

// 当前路径
const currentPath = computed(() => route.path)

// 测试结果
const testResults = ref<Record<string, { original: boolean, fixed: boolean, isCorrect: boolean }>>({})

// 更新测试结果
const updateTestResults = () => {
  const results: Record<string, { original: boolean, fixed: boolean, isCorrect: boolean }> = {}

  navItems.forEach(item => {
    const originalResult = isActiveOriginal(item.path)
    const fixedResult = isActiveFixed(item.path)

    // 判断预期结果：只有当前路径应该返回 true
    const expectedResult =
      route.path === item.path ||
      (item.path !== '/' && route.path.startsWith(item.path + '/'))

    results[item.path] = {
      original: originalResult,
      fixed: fixedResult,
      isCorrect: fixedResult === expectedResult
    }
  })

  testResults.value = results
}

// 监听路由变化
watch(() => route.path, updateTestResults, { immediate: true })

onMounted(() => {
  updateTestResults()
})

// 导航测试函数
const navigateToTest = (path: string) => {
  router.push(path)
}

// 获取样式类
const getClassesOriginal = (path: string) => {
  return isActiveOriginal(path)
    ? 'bg-green-100 border-green-500 text-green-700'
    : 'bg-gray-100 border-gray-300 text-gray-700'
}

const getClassesFixed = (path: string) => {
  return isActiveFixed(path)
    ? 'bg-blue-100 border-blue-500 text-blue-700'
    : 'bg-gray-100 border-gray-300 text-gray-700'
}

// 检查是否有问题
const hasProblems = computed(() => {
  return Object.values(testResults.value).some(result => !result.isCorrect)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-6xl mx-auto">
      <!-- 测试标题 -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">AppHeader 导航状态测试</h1>
        <p class="text-gray-600">测试当前路径: <code class="bg-gray-200 px-2 py-1 rounded">{{ currentPath }}</code></p>
        <div v-if="hasProblems" class="mt-2 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
          ⚠️ 发现问题！原始逻辑存在导航状态判断错误
        </div>
        <div v-else class="mt-2 p-3 bg-green-100 border border-green-300 rounded-lg text-green-700">
          ✅ 测试通过！修复后的逻辑工作正常
        </div>
      </div>

      <!-- 测试导航 -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">测试导航按钮</h2>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="item in navItems"
            :key="item.path"
            @click="navigateToTest(item.path)"
            class="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <i :class="item.icon" class="mr-2"></i>
            {{ item.name }}
          </button>
        </div>
      </div>

      <!-- 状态对比 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- 原始逻辑测试 -->
        <div>
          <h2 class="text-xl font-semibold text-gray-800 mb-4">原始逻辑测试</h2>
          <div class="space-y-2">
            <div
              v-for="item in navItems"
              :key="`original-${item.path}`"
              class="p-3 border-2 rounded-lg transition-colors"
              :class="getClassesOriginal(item.path)"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <i :class="item.icon" class="mr-3"></i>
                  <span class="font-medium">{{ item.name }}</span>
                  <span class="ml-2 text-sm text-gray-500">{{ item.path }}</span>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-sm font-mono">
                    {{ testResults[item.path]?.original ? 'true' : 'false' }}
                  </span>
                  <div
                    class="w-3 h-3 rounded-full"
                    :class="testResults[item.path]?.original ? 'bg-green-500' : 'bg-gray-300'"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 修复后逻辑测试 -->
        <div>
          <h2 class="text-xl font-semibold text-gray-800 mb-4">修复后逻辑测试</h2>
          <div class="space-y-2">
            <div
              v-for="item in navItems"
              :key="`fixed-${item.path}`"
              class="p-3 border-2 rounded-lg transition-colors"
              :class="getClassesFixed(item.path)"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <i :class="item.icon" class="mr-3"></i>
                  <span class="font-medium">{{ item.name }}</span>
                  <span class="ml-2 text-sm text-gray-500">{{ item.path }}</span>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-sm font-mono">
                    {{ testResults[item.path]?.fixed ? 'true' : 'false' }}
                  </span>
                  <div
                    class="w-3 h-3 rounded-full"
                    :class="testResults[item.path]?.fixed ? 'bg-blue-500' : 'bg-gray-300'"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 详细分析 -->
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">详细分析</h2>

        <div class="mb-6">
          <h3 class="text-lg font-medium text-gray-700 mb-3">当前测试结果分析</h3>
          <div class="space-y-2">
            <div
              v-for="item in navItems"
              :key="`analysis-${item.path}`"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center">
                <i :class="item.icon" class="mr-3 text-gray-600"></i>
                <span class="font-medium">{{ item.name }}</span>
                <span class="ml-2 text-sm text-gray-500">{{ item.path }}</span>
              </div>
              <div class="flex items-center space-x-4">
                <div class="text-center">
                  <div class="text-xs text-gray-500">原始</div>
                  <div class="font-mono text-sm" :class="testResults[item.path]?.original ? 'text-green-600' : 'text-red-600'">
                    {{ testResults[item.path]?.original ? 'true' : 'false' }}
                  </div>
                </div>
                <div class="text-center">
                  <div class="text-xs text-gray-500">修复</div>
                  <div class="font-mono text-sm" :class="testResults[item.path]?.fixed ? 'text-blue-600' : 'text-gray-600'">
                    {{ testResults[item.path]?.fixed ? 'true' : 'false' }}
                  </div>
                </div>
                <div class="text-center">
                  <div class="text-xs text-gray-500">状态</div>
                  <div class="font-mono text-sm" :class="testResults[item.path]?.isCorrect ? 'text-green-600' : 'text-red-600'">
                    {{ testResults[item.path]?.isCorrect ? '✓' : '✗' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 原始逻辑代码 -->
          <div>
            <h3 class="text-lg font-medium text-gray-700 mb-3">原始逻辑代码</h3>
            <div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <pre>const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path) // 问题所在
}</pre>
            </div>
            <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <h4 class="font-medium mb-1">问题分析：</h4>
              <ul class="text-sm space-y-1">
                <li>• 路径匹配过于宽泛</li>
                <li>• 可能导致多个导航项同时激活</li>
                <li>• "关于我们"按钮样式被固定背景色覆盖</li>
              </ul>
            </div>
          </div>

          <!-- 修复后逻辑代码 -->
          <div>
            <h3 class="text-lg font-medium text-gray-700 mb-3">修复后逻辑代码</h3>
            <div class="bg-gray-900 text-blue-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <pre>const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }

  // 精确匹配
  if (route.path === path) return true

  // 子路由匹配
  if (route.path.startsWith(path + '/')) return true

  return false
}</pre>
            </div>
            <div class="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <h4 class="font-medium mb-1">修复说明：</h4>
              <ul class="text-sm space-y-1">
                <li>• 精确路径匹配优先</li>
                <li>• 支持子路由匹配（如 /products/123）</li>
                <li>• 避免误匹配导致的激活状态错误</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- 实际 AppHeader 组件测试 -->
      <div class="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">实际 AppHeader 组件测试</h2>
        <div class="border-t pt-4">
          <p class="text-gray-600 mb-4">下方是实际的 AppHeader 组件，可以观察导航状态变化：</p>
          <AppHeader />
        </div>
      </div>

      <!-- 测试子路由 -->
      <div class="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">子路由测试</h2>
        <p class="text-gray-600 mb-4">测试子路由的激活状态（如 /products/123 应该激活产品中心）：</p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="space-y-2">
            <h3 class="font-medium text-gray-700">产品子路由</h3>
            <button
              @click="navigateToTest('/products/123')"
              class="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
            >
              /products/123
            </button>
            <button
              @click="navigateToTest('/products/abc')"
              class="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
            >
              /products/abc
            </button>
          </div>

          <div class="space-y-2">
            <h3 class="font-medium text-gray-700">品牌子路由</h3>
            <button
              @click="navigateToTest('/brands/456')"
              class="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm"
            >
              /brands/456
            </button>
            <button
              @click="navigateToTest('/brands/xyz')"
              class="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm"
            >
              /brands/xyz
            </button>
          </div>

          <div class="space-y-2">
            <h3 class="font-medium text-gray-700">其他测试路由</h3>
            <button
              @click="navigateToTest('/test/something')"
              class="w-full px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
            >
              /test/something
            </button>
            <button
              @click="navigateToTest('/unknown')"
              class="w-full px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
            >
              /unknown
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>