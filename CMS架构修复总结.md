# CMS 架构修复总结

## 📋 项目背景

本项目是一个生物科技公司官网的 CMS 内容管理系统，采用 Vue 3 + Pinia 前端 + Node.js + Express + SQLite 后端架构。

### 核心需求
1. **前台展示**：展示已发布的内容数据
2. **后台管理**：编辑、保存草稿、发布内容
3. **草稿机制**：保存的草稿不影响前台，发布后才更新前台

---

## 🔍 问题分析

### 发现的核心问题

经过完整测试，发现了一个**架构设计缺陷**：

```
┌─────────────────────────────────────────────────────────────────┐
│                     问题：数据加载来源错误                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  错误的数据流（修复前）：                                         │
│                                                                 │
│  后台管理页面                                                    │
│       │                                                         │
│       ▼                                                         │
│  前台 Store (productStore, brandStore, etc.)                    │
│       │                                                         │
│       ▼                                                         │
│  前台 API (contentApi.getAllPublished)                          │
│       │                                                         │
│       ▼                                                         │
│  只返回 publishedData ← ❌ 草稿数据丢失！                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 问题影响

| 场景 | 预期行为 | 实际行为（修复前） |
|-----|---------|------------------|
| 保存草稿后刷新页面 | 显示草稿数据 | ❌ 显示已发布数据，草稿丢失 |
| 编辑-保存-稍后继续 | 能继续编辑草稿 | ❌ 无法继续，草稿丢失 |
| 发布后前台更新 | 前台显示新数据 | ✅ 刷新后正常（缓存问题） |

### 问题根因

1. **后台页面复用了前台 Store**
   - 前台 Store 设计用于展示已发布数据
   - 后台页面错误地使用前台 Store 加载数据
   - 前台 Store 调用的是 `contentApi.getAllPublished()`，只返回已发布数据

2. **架构设计未区分前后台数据源**
   - 前台需要：已发布数据 (publishedData)
   - 后台需要：草稿数据优先 (draftData || publishedData)
   - 两者混用导致问题

---

## ✅ 修复方案

### 核心思路

**后台管理页面直接调用 Admin API，不经过前台 Store**

```
┌─────────────────────────────────────────────────────────────────┐
│                     正确的数据流（修复后）                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  后台管理页面                                                    │
│       │                                                         │
│       ▼                                                         │
│  Admin API (adminApi.getList / adminApi.getOne)                 │
│       │                                                         │
│       ▼                                                         │
│  返回 { draftData, publishedData, ... }                         │
│       │                                                         │
│       ▼                                                         │
│  优先使用 draftData || publishedData ← ✅ 草稿数据保留！         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 修复代码模式

```typescript
// ========================================
// 修复前（错误）
// ========================================
onMounted(async () => {
  await productStore.loadProducts()  // 从前台 API 加载
  // productStore 内部调用 contentApi.getAllPublished('product')
  // 只返回已发布数据，草稿丢失
})

// ========================================
// 修复后（正确）
// ========================================
const localProducts = ref<Product[]>([])

const loadAdminData = async () => {
  try {
    // 直接调用 Admin API
    const result = await adminApi.getList('product', { pageSize: 9999 })
    // 优先使用草稿数据
    localProducts.value = result.data.map(item => 
      item.draftData || item.publishedData
    )
  } catch (e) {
    // 降级到前台 Store（API 不可用时）
    await productStore.loadProducts()
    localProducts.value = [...productStore.products]
  }
}

onMounted(async () => {
  await loadAdminData()
})
```

---

## 📁 修改的文件清单

### 1. 产品列表 (ProductsList.vue)
```typescript
// 添加本地数据存储
const localProducts = ref<Product[]>([])

// 添加 Admin API 加载函数
const loadAdminData = async () => {
  const result = await adminApi.getList('product', { pageSize: 9999 })
  localProducts.value = result.data.map(item => item.draftData || item.publishedData)
}

// 修改 onMounted
onMounted(async () => {
  await loadAdminData()
})
```

### 2. 品牌列表 (BrandsList.vue)
```typescript
const localBrands = ref<Brand[]>([])

const loadAdminData = async () => {
  const result = await adminApi.getList('brand', { pageSize: 9999 })
  localBrands.value = result.data.map(item => item.draftData || item.publishedData)
}
```

### 3. 活动列表 (PromotionsList.vue)
```typescript
const localPromotions = ref<Promotion[]>([])

const loadAdminData = async () => {
  const result = await adminApi.getList('promotion', { pageSize: 9999 })
  localPromotions.value = result.data.map(item => item.draftData || item.publishedData)
}
```

### 4. 横幅设置 (BannerManagement.vue)
```typescript
const loadData = async () => {
  try {
    const content = await adminApi.getOne('banner', activeTab.value)
    const data = content.draftData || content.publishedData || {}
    formData.value = {
      slogans: data.slogans || [],
      defaultStats: data.defaultStats || []
    }
    // 检测是否有未发布的更改
    hasUnpublishedChanges.value = content.draftData !== null && 
      JSON.stringify(content.draftData) !== JSON.stringify(content.publishedData)
  } catch (e) {
    // 降级到前台 Store
    const banner = bannerStore.getBanner(activeTab.value)
    // ...
  }
}
```

### 5. 网站基本信息 (SiteInfo.vue)
```typescript
const loadData = async () => {
  try {
    const content = await adminApi.getOne('site_config', 'main')
    const data = content.draftData || content.publishedData || {}
    formData.value = {
      name: data.company?.name || '',
      shortName: data.company?.shortName || '',
      // ...
    }
    hasUnpublishedChanges.value = content.draftData !== null && 
      JSON.stringify(content.draftData) !== JSON.stringify(content.publishedData)
  } catch (e) {
    // 降级
  }
}
```

### 6. 联系方式 (SiteContact.vue)
```typescript
const loadData = async () => {
  try {
    const content = await adminApi.getOne('site_config', 'main')
    const data = content.draftData || content.publishedData || {}
    formData.value = {
      phones: data.contact?.phones || ['', ''],
      email: data.contact?.email || '',
      // ...
    }
  } catch (e) {
    // 降级
  }
}
```

### 7. 关于我们 (AboutContent.vue)
**无需修改** - 该页面原本就正确使用了 `adminApi.getOne('about', 'main')`

---

## 🏗️ 最终架构

### 数据流架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CMS 数据流架构                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        前台展示页面                              │   │
│  │  ProductCenter, BrandCenter, PromotionCenter, AboutPage, etc.   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        前台 Store                                │   │
│  │  productStore, brandStore, promotionStore, aboutStore, etc.     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        前台 API                                  │   │
│  │  contentApi.getPublishedList() / contentApi.getPublishedOne()   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     后端 - 前台路由                              │   │
│  │  GET /api/content/:type/published                               │   │
│  │  → 只返回 publishedData                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        后台管理页面                              │   │
│  │  ProductsList, BrandsList, PromotionsList, BannerManagement,    │   │
│  │  SiteInfo, SiteContact, AboutContent                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        Admin API                                 │   │
│  │  adminApi.getList() / adminApi.getOne()                         │   │
│  │  adminApi.saveDraft() / adminApi.publish()                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     后端 - 后台路由                              │   │
│  │  GET /api/admin/content/:type                                   │   │
│  │  → 返回 { draftData, publishedData, status, version, ... }      │   │
│  │  PUT /api/admin/content/:type/:key/draft → 保存草稿             │   │
│  │  POST /api/admin/content/:type/:key/publish → 发布              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 三级数据状态模型

```
┌─────────────────────────────────────────────────────────────────┐
│                         三级数据状态                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  编辑中数据  │───▶│  草稿数据   │───▶│  已发布数据  │         │
│  │ Local State │    │ Draft State │    │Published State│        │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│        │                  │                  │                  │
│        ▼                  ▼                  ▼                  │
│   浏览器内存          数据库              数据库                │
│   (Vue ref)        draft_data        published_data            │
│                                                                 │
│   ❌ 刷新丢失        ✅ 持久化           ✅ 持久化              │
│   ❌ 前台不可见      ❌ 前台不可见       ✅ 前台可见             │
│   ✅ 后台可见        ✅ 后台可见         ✅ 后台可见             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 测试验证结果

### 功能测试矩阵

| 模块 | 保存草稿 | 刷新保留草稿 | 发布 | 前台更新 |
|------|---------|-------------|------|---------|
| 产品列表 | ✅ | ✅ | ✅ | ✅ (刷新后) |
| 品牌列表 | ✅ | ✅ | ✅ | ✅ (刷新后) |
| 活动列表 | ✅ | ✅ | ✅ | ✅ (刷新后) |
| 横幅设置 | ✅ | ✅ | ✅ | ✅ (刷新后) |
| 网站基本信息 | ✅ | ✅ | ✅ | ✅ (刷新后) |
| 联系方式 | ✅ | ✅ | ✅ | ✅ (刷新后) |
| 关于我们 | ✅ | ✅ | ✅ | ✅ (刷新后) |

### 后端 API 测试

| API | 功能 | 状态 |
|-----|------|------|
| GET /api/admin/content/:type | 获取后台列表 | ✅ |
| GET /api/admin/content/:type/:key | 获取单条详情 | ✅ |
| PUT /api/admin/content/:type/:key/draft | 保存草稿 | ✅ |
| POST /api/admin/content/:type/:key/publish | 发布 | ✅ |
| GET /api/content/:type/published | 获取前台列表 | ✅ |
| GET /api/content/:type/:key/published | 获取前台单条 | ✅ |

---

## ⚠️ 已知限制

### 1. 前台缓存问题

**现象**：发布后前台页面不刷新的情况下看不到新数据

**原因**：
- 前台 Store 有 `loaded` 标志，一旦加载过就不会重新加载
- 发布后调用 `clearCache()` 只清除当前标签页的 Store
- 前台页面是独立标签页，有自己的 Store 实例

**解决方案**：
- 短期：发布成功后提示用户刷新前台页面
- 长期：使用 BroadcastChannel 或 WebSocket 实现跨标签页通信

### 2. 删除功能

**现状**：当前删除只是从本地数组移除，保存草稿时会同步到后端

**建议**：如需真正删除，应调用 `adminApi.delete()` API

---

## 🎯 总结

### 修复前后对比

| 方面 | 修复前 | 修复后 |
|-----|-------|-------|
| 后台数据来源 | 前台 Store (只有已发布数据) | Admin API (包含草稿数据) |
| 草稿持久化 | ❌ 刷新丢失 | ✅ 正确保留 |
| 编辑工作流 | ❌ 无法中断继续 | ✅ 可以保存后稍后继续 |
| 发布机制 | ✅ 正常 | ✅ 正常 |

### 核心原则

1. **前后台数据源分离**
   - 前台页面 → 前台 Store → 前台 API → publishedData
   - 后台页面 → Admin API → draftData || publishedData

2. **草稿优先原则**
   - 后台加载数据时：`item.draftData || item.publishedData`
   - 确保用户看到的是最新编辑的内容

3. **降级机制**
   - Admin API 不可用时，降级到前台 Store
   - 保证系统可用性

### 系统状态

✅ **CMS 发布功能已完全修复，系统可正常使用**

- 所有后台管理页面都能正确加载草稿数据
- 保存草稿后刷新页面，草稿数据正确保留
- 发布后前台页面（刷新后）显示新数据
- 后端 API 全部正常工作

---

## 📅 修复日期

2025-12-09

