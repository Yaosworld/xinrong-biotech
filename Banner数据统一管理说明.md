# Banner 数据统一管理说明

## 📋 概述

所有页面的 ShowcaseBanner 组件数据已统一管理，实现了单一数据源，便于维护和更新。

## 🗂️ 数据源位置

**配置文件**：`public/data/banners.json`

包含以下页面的 banner 配置：
- 产品中心 (`products`)
- 品牌中心 (`brands`)
- 资讯中心 (`promotions`)
- 关于我们 (`about`)

## 📦 数据结构

```json
{
  "products": {
    "id": "products",
    "title": "产品中心",
    "slogans": ["标语1", "标语2"],
    "defaultStats": [
      { "key": "categories", "number": "10+", "label": "产品分类" }
    ]
  },
  "brands": { ... },
  "promotions": { ... },
  "about": { ... }
}
```

## 🔧 技术实现

### Store 管理
**文件**：`src/stores/bannerStore.ts`

```typescript
import { useBannerStore } from '@/stores/bannerStore'

const bannerStore = useBannerStore()

// 获取指定页面的标语
const slogans = bannerStore.getSlogans('products')

// 获取指定页面的默认统计数据
const stats = bannerStore.getDefaultStats('products')

// 获取完整的 banner 配置
const banner = bannerStore.getBanner('products')
```

### 自动加载
在 `src/App.vue` 中，应用启动时自动加载：
```typescript
onMounted(() => {
  bannerStore.loadBanners()
})
```

## 📝 字段说明

### 每个页面的 banner 配置

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 页面标识 |
| `title` | string | 页面标题 |
| `slogans` | string[] | 标语数组，轮播显示 |
| `defaultStats` | StatItem[] | 默认统计数据 |

### StatItem 结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `key` | string | 唯一标识 |
| `number` | string | 数字显示（如 "10+"） |
| `label` | string | 标签文字 |

## 🎯 如何修改 Banner

### 1. 修改标语
编辑 `public/data/banners.json`：
```json
{
  "products": {
    "slogans": [
      "新的标语1",
      "新的标语2",
      "可以添加更多标语"
    ]
  }
}
```

### 2. 修改统计数据
```json
{
  "products": {
    "defaultStats": [
      { "key": "new", "number": "100+", "label": "新标签" }
    ]
  }
}
```

### 3. 添加新页面的 banner
```json
{
  "newPage": {
    "id": "newPage",
    "title": "新页面",
    "slogans": ["标语"],
    "defaultStats": []
  }
}
```

## 📊 已更新的页面

| 页面 | 文件 | 状态 |
|------|------|------|
| 产品中心 | `ProductCenter.vue` | ✅ 已更新 |
| 品牌中心 | `BrandCenter.vue` | ✅ 已更新 |
| 资讯中心 | `PromotionCenter.vue` | ✅ 已更新 |
| 关于我们 | `AboutPage.vue` | ✅ 已更新 |

## 🔄 动态统计数据

各页面支持动态统计数据，优先显示实际数据：

### 产品中心
- 商品种类：实际产品数量
- 产品类别：实际分类数量
- 合作品牌：实际品牌数量

### 品牌中心
- 国内品牌：实际国内品牌数量
- 国际品牌：实际国际品牌数量

### 资讯中心
- 进行中活动：实际活动数量

### 关于我们
- 使用默认统计数据

## ✨ 优势

1. **单一数据源**：所有 banner 配置集中管理
2. **易于维护**：修改一处，所有页面同步更新
3. **灵活配置**：支持动态数据和默认数据切换
4. **类型安全**：TypeScript 类型定义
5. **性能优化**：数据缓存，避免重复加载

## 🚀 Store API

### 属性
- `banners`: 所有 banner 数据
- `loading`: 加载状态
- `loaded`: 是否已加载
- `error`: 错误信息

### 方法
- `loadBanners()`: 加载数据
- `reload()`: 重新加载
- `clearCache()`: 清除缓存

### Getters
- `getBanner(pageId)`: 获取指定页面的完整配置
- `getSlogans(pageId)`: 获取指定页面的标语
- `getDefaultStats(pageId)`: 获取指定页面的默认统计数据
- `productsBanner`: 产品中心 banner
- `brandsBanner`: 品牌中心 banner
- `promotionsBanner`: 资讯中心 banner
- `aboutBanner`: 关于我们 banner

## ⚠️ 注意事项

1. **JSON 格式**：确保 JSON 格式正确
2. **页面 ID**：使用正确的页面标识（products, brands, promotions, about）
3. **数组不能为 null**：空数组用 `[]`
4. **刷新生效**：修改后需刷新页面

## 📁 相关文件

- 数据文件：`public/data/banners.json`
- Store：`src/stores/bannerStore.ts`
- 组件：`src/components/common/ShowcaseBanner.vue`
