// 导航状态逻辑测试脚本
// 模拟不同路径下的 isActive 函数行为

console.log('=== AppHeader 导航状态逻辑测试 ===\n')

// 测试路径列表
const testPaths = [
  '/',
  '/products',
  '/brands',
  '/news',
  '/about',
  '/products/123',
  '/products/abc/detail',
  '/brands/456',
  '/brands/xyz/overview',
  '/test/something',
  '/admin/dashboard'
]

// 导航项配置
const navItems = [
  { name: '首页', path: '/', icon: 'fas fa-home' },
  { name: '产品中心', path: '/products', icon: 'fas fa-flask' },
  { name: '品牌中心', path: '/brands', icon: 'fas fa-award' },
  { name: '资讯中心', path: '/news', icon: 'fas fa-newspaper' },
  { name: '关于我们', path: '/about', icon: 'fas fa-building' }
]

// 当前的 isActive 函数（存在问题的版本）
function isActiveOriginal(routePath, itemPath) {
  if (itemPath === '/') {
    return routePath === '/'
  }
  return routePath.startsWith(itemPath)
}

// 修复后的 isActive 函数
function isActiveFixed(routePath, itemPath) {
  if (itemPath === '/') {
    return routePath === '/'
  }

  // 精确匹配
  if (routePath === itemPath) return true

  // 子路由匹配（如 /products/123 匹配 /products）
  if (routePath.startsWith(itemPath + '/')) return true

  return false
}

// 预期结果函数
function getExpectedResult(routePath, itemPath) {
  // 精确匹配
  if (routePath === itemPath) return true

  // 子路由匹配（只匹配直接子路由）
  if (itemPath !== '/' && routePath.startsWith(itemPath + '/')) return true

  return false
}

// 测试函数
function runTests() {
  console.log('测试路径:', testPaths)
  console.log('导航项:', navItems.map(item => item.path))
  console.log('\n' + '='.repeat(80) + '\n')

  testPaths.forEach(routePath => {
    console.log(`📍 当前路径: ${routePath}`)
    console.log('-'.repeat(60))

    navItems.forEach(item => {
      const originalResult = isActiveOriginal(routePath, item.path)
      const fixedResult = isActiveFixed(routePath, item.path)
      const expectedResult = getExpectedResult(routePath, item.path)

      const originalCorrect = originalResult === expectedResult
      const fixedCorrect = fixedResult === expectedResult

      console.log(`  ${item.name.padEnd(8)} (${item.path.padEnd(12)}) | 原始: ${originalResult.toString().padEnd(5)} | 修复: ${fixedResult.toString().padEnd(5)} | 预期: ${expectedResult.toString().padEnd(5)} | ${originalCorrect ? '✅' : '❌'} | ${fixedCorrect ? '✅' : '❌'}`)

      // 标记问题
      if (!originalCorrect && fixedCorrect) {
        console.log(`    📋 问题: 原始逻辑错误，修复后正确`)
      } else if (originalCorrect && !fixedCorrect) {
        console.log(`    ⚠️  注意: 原始逻辑正确，修复后错误（需要检查）`)
      } else if (!originalCorrect && !fixedCorrect) {
        console.log(`    🚨 错误: 原始逻辑和修复后都错误`)
      }
    })

    console.log()
  })
}

// 特定问题分析
function analyzeProblems() {
  console.log('🔍 特定问题分析\n')

  // 分析你描述的具体问题
  console.log('问题场景: 点击"产品中心"时，"关于我们"也显示激活状态')

  const problematicScenarios = [
    {
      route: '/products',
      item: '/about',
      description: '访问产品中心时，关于我们不应该激活'
    },
    {
      route: '/products/123',
      item: '/',
      description: '访问产品详情页时，首页不应该激活'
    },
    {
      route: '/brands',
      item: '/products',
      description: '访问品牌中心时，产品中心不应该激活'
    }
  ]

  problematicScenarios.forEach(scenario => {
    const original = isActiveOriginal(scenario.route, scenario.item)
    const fixed = isActiveFixed(scenario.route, scenario.item)
    const expected = getExpectedResult(scenario.route, scenario.item)

    console.log(`\n📝 ${scenario.description}`)
    console.log(`   路径: ${scenario.route} vs ${scenario.item}`)
    console.log(`   原始逻辑: ${original} ${original === expected ? '✅' : '❌'}`)
    console.log(`   修复逻辑: ${fixed} ${fixed === expected ? '✅' : '❌'}`)
    console.log(`   预期结果: ${expected}`)
  })

  console.log('\n🎯 根本原因分析:')
  console.log('   1. 原始逻辑中，route.path.startsWith(path) 过于宽泛')
  console.log('   2. 对于路径 "/" 的特殊处理不完整')
  console.log('   3. 没有考虑到精确匹配和子路由匹配的区别')
}

// CSS样式问题分析
function analyzeStyleIssues() {
  console.log('\n🎨 CSS样式问题分析\n')

  console.log('关于"关于我们"按钮一直显示主题色的问题:')
  console.log('   1. "关于我们"按钮使用了固定的背景色 bg-primary-600')
  console.log('   2. 激活状态的样式可能被固定背景色覆盖')
  console.log('   3. CSS优先级问题可能导致激活状态不生效')
  console.log('   4. 响应式设计下，桌面端和移动端样式不一致')

  console.log('\n可能的CSS问题:')
  console.log('   ```vue')
  console.log('   <!-- 当前代码 -->')
  console.log('   <router-link')
  console.log('     to="/about"')
  console.log('     :class="[')
  console.log('       isActive(\'/about\')')
  console.log('         ? \'bg-primary-700 text-white\'   // 激活状态')
  console.log('         : \'bg-primary-600 text-white hover:bg-primary-700\'  // 非激活状态')
  console.log('     ]"')
  console.log('   >')
  console.log('     关于我们')
  console.log('   </router-link>')
  console.log('   ```')

  console.log('\n   问题: 无论激活状态如何，都显示主色调背景')
  console.log('   建议: 非激活状态应该使用更中性的颜色')
}

// 推荐解决方案
function recommendSolution() {
  console.log('\n💡 推荐解决方案\n')

  console.log('1. 修复 isActive 函数:')
  console.log('   ```typescript')
  console.log('   const isActive = (path: string) => {')
  console.log('     if (path === \'/\') {')
  console.log('       return route.path === \'/\'')
  console.log('     }')
  console.log('     ')
  console.log('     // 精确匹配')
  console.log('     if (route.path === path) return true')
  console.log('     ')
  console.log('     // 子路由匹配（如 /products/123 匹配 /products）')
  console.log('     if (route.path.startsWith(path + \'/\')) return true')
  console.log('     ')
  console.log('     return false')
  console.log('   }')
  console.log('   ```')

  console.log('\n2. 修复"关于我们"按钮样式:')
  console.log('   ```vue')
  console.log('   <router-link')
  console.log('     to="/about"')
  console.log('     :class="getNavLinkClasses(\'/about\', true)"')
  console.log('   >')
  console.log('     关于我们')
  console.log('   </router-link>')
  console.log('   ```')
  console.log('   ')
  console.log('   ```typescript')
  console.log('   const getNavLinkClasses = (path: string, isSpecial = false) => {')
  console.log('     const active = isActive(path)')
  console.log('     ')
  console.log('     if (isSpecial) {')
  console.log('       // 关于我们按钮的特殊处理')
  console.log('       return active')
  console.log('         ? \'bg-primary-700 text-white shadow-lg transform scale-105\'')
  console.log('         : \'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-md\'')
  console.log('     } else {')
  console.log('       // 普通导航项')
  console.log('       return active')
  console.log('         ? \'text-primary-600 bg-primary-50 font-semibold\'')
  console.log('         : \'text-dark-600 hover:text-primary-600 hover:bg-primary-50\'')
  console.log('     }')
  console.log('   }')
  console.log('   ```')
}

// 运行所有测试
runTests()
analyzeProblems()
analyzeStyleIssues()
recommendSolution()

console.log('\n' + '='.repeat(80))
console.log('✅ 测试完成！请访问 http://localhost:3002/test/navigation 进行交互式测试')
console.log('='.repeat(80))