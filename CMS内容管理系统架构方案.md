# CMS 内容管理系统架构方案

## 📋 项目背景与现状

### 当前架构
```
前台展示 (Vue 3 + Pinia)
    ↓ fetch
静态 JSON 文件 (public/data/*.json)
    ↑ 手动导出
后台管理 (内存编辑)
```

### 核心痛点
1. **数据无法持久化** - 后台编辑的数据只存在内存中，刷新即丢失
2. **多状态数据混乱** - 编辑中、已保存、已发布数据难以区分
3. **无版本控制** - 无法回滚到历史版本
4. **发布即生效** - 缺乏草稿机制，编辑错误直接影响线上

### 服务器环境
- **阿里云轻量应用服务器**
- **配置**: 2核 CPU / 2GB 内存
- **适合**: 轻量级 Node.js 后端 + SQLite

---

## 🎯 核心架构：三级数据状态模型

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
│   (Pinia Store)    draft_data        published_data            │
│                                                                 │
│   ❌ 刷新丢失        ✅ 持久化           ✅ 持久化              │
│   ❌ 前台不可见      ❌ 前台不可见       ✅ 前台可见             │
│   ✅ 后台可见        ✅ 后台可见         ✅ 后台可见             │
└─────────────────────────────────────────────────────────────────┘
```

### 状态定义

| 状态 | 存储位置 | 持久化 | 前台可见 | 说明 |
|-----|---------|-------|---------|------|
| 编辑中 (Local) | 浏览器内存 | ❌ | ❌ | 正在输入但未保存，刷新丢失 |
| 草稿 (Draft) | DB draft_data | ✅ | ❌ | 已保存的工作副本，仅后台可见 |
| 已发布 (Published) | DB published_data | ✅ | ✅ | 线上展示的正式数据 |


---

## 📊 现有业务模块分析

### 内容类型与数据结构

根据现有代码分析，系统包含以下内容类型：

| 内容类型 | 数据文件 | 前台页面 | 后台管理 | 数据量级 | 分页需求 |
|---------|---------|---------|---------|---------|---------|
| **产品 (product)** | products.json | ProductCenter/Detail | ProductsList | 大 (1000+) | ✅ 必须 |
| **品牌 (brand)** | brands.json | BrandCenter/Detail | BrandsList | 中 (50-200) | ❌ 可选 |
| **活动 (promotion)** | promotions.json | PromotionCenter/Detail | PromotionsList | 小 (10-50) | ✅ 建议 |
| **横幅 (banner)** | banners.json | 各页面ShowcaseBanner | BannerManagement | 极小 (4条) | ❌ 不需要 |
| **关于我们 (about)** | about.json | AboutPage | AboutContent | 极小 (1条) | ❌ 不需要 |
| **网站配置 (site_config)** | site-config.json | 全局 | SiteInfo/SiteContact | 极小 (1条) | ❌ 不需要 |

### 现有 Store 架构分析

```
src/stores/
├── productStore.ts    # 产品数据 - 支持筛选、排序、分页
├── brandStore.ts      # 品牌数据 - 支持分类(自主/代理)、排序
├── promotionStore.ts  # 活动数据 - 支持状态计算、排序
├── bannerStore.ts     # 横幅数据 - 按页面分组
├── aboutStore.ts      # 关于我们 - 单页面数据
├── siteStore.ts       # 网站配置 - 全局配置
└── adminStore.ts      # 后台管理 - 活动记录、上传状态
```

### 现有分页实现 (usePagination.ts)

当前分页是**前端分页**：
- 一次性加载全部数据到内存
- 前端计算分页切片
- 适合数据量小的场景

```typescript
// 当前实现 - 前端分页
const { currentPageItems, paginationInfo, goToPage } = usePagination(
  computed(() => productStore.sortedProducts),  // 全量数据
  { initialPageSize: 12 }
)
```

---

## 🔄 分页策略设计（重点）

### 问题分析

| 数据类型 | 预估数量 | 当前方案 | 问题 |
|---------|---------|---------|------|
| 产品 | 1000-5000+ | 前端分页 | 首次加载慢，内存占用大 |
| 品牌 | 50-200 | 无分页 | 可接受 |
| 活动 | 10-50 | 前端分页 | 可接受 |

### 解决方案：混合分页策略

```
┌─────────────────────────────────────────────────────────────────┐
│                       混合分页策略                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  小数据量 (< 500条)                                      │   │
│  │  品牌、活动、横幅、配置                                   │   │
│  │  → 前端分页 (一次加载全部)                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  大数据量 (> 500条)                                      │   │
│  │  产品                                                    │   │
│  │  → 后端分页 (按需加载)                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 后端分页 API 设计

```typescript
// GET /api/content/product/published?page=1&pageSize=12&search=xxx&categoryId=C01&brand=xxx&sortBy=name-asc

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  filters: {
    search?: string
    categoryId?: string
    brand?: string
  }
}
```

### 前台产品列表优化方案

```typescript
// 新的 productStore - 支持后端分页
export const useProductStore = defineStore('product', () => {
  // 分页数据（当前页）
  const currentPageData = ref<Product[]>([])
  const pagination = ref({
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 0
  })
  
  // 筛选条件
  const filters = ref<ProductFilters>({
    search: '',
    categoryId: '',
    brand: ''
  })
  
  // 加载分页数据
  async function loadPage(page: number = 1) {
    loading.value = true
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pagination.value.pageSize),
        ...(filters.value.search && { search: filters.value.search }),
        ...(filters.value.categoryId && { categoryId: filters.value.categoryId }),
        ...(filters.value.brand && { brand: filters.value.brand })
      })
      
      const res = await fetch(`/api/content/product/published?${params}`)
      const result = await res.json()
      
      currentPageData.value = result.data
      pagination.value = result.pagination
    } finally {
      loading.value = false
    }
  }
  
  // 筛选条件变化时重新加载
  watch(filters, () => loadPage(1), { deep: true })
  
  return { currentPageData, pagination, filters, loadPage }
})
```


---

## 📤 Excel 导入策略设计（重点）

### 当前实现分析

现有 `ExcelProcessor` 类支持：
- 产品、品牌、活动的 Excel 解析
- 字段验证（必填检查、格式检查）
- 数据格式化

### 导入模式设计

```
┌─────────────────────────────────────────────────────────────────┐
│                     Excel 导入模式选择                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   覆盖模式   │  │   合并模式   │  │  增量模式   │             │
│  │  (Replace)  │  │   (Merge)   │  │  (Append)   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│        │                │                │                      │
│        ▼                ▼                ▼                      │
│   清空现有数据      按ID匹配更新      仅添加新数据               │
│   导入全部新数据    新ID则添加        跳过已存在ID               │
│                    旧ID则更新                                   │
│                                                                 │
│  适用场景:         适用场景:         适用场景:                   │
│  - 数据重建        - 日常更新        - 批量新增                  │
│  - 初始化导入      - 部分修改        - 追加数据                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 导入流程设计

```
┌─────────────────────────────────────────────────────────────────┐
│                      Excel 导入完整流程                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 文件上传                                                    │
│     ↓                                                           │
│  2. 前端解析 Excel (xlsx库)                                     │
│     ↓                                                           │
│  3. 数据验证                                                    │
│     ├── 必填字段检查                                            │
│     ├── 数据格式检查                                            │
│     ├── ID 唯一性检查                                           │
│     └── 关联数据检查 (如分类ID是否存在)                          │
│     ↓                                                           │
│  4. 预览确认                                                    │
│     ├── 显示将要导入的数据                                      │
│     ├── 显示验证警告/错误                                       │
│     ├── 选择导入模式 (覆盖/合并/增量)                           │
│     └── 显示影响统计 (新增X条/更新X条/删除X条)                   │
│     ↓                                                           │
│  5. 执行导入                                                    │
│     ├── 保存到草稿 (draft_data)                                 │
│     └── 记录操作日志                                            │
│     ↓                                                           │
│  6. 发布确认                                                    │
│     └── 用户确认后发布到线上                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 导入冲突处理策略

| 场景 | 覆盖模式 | 合并模式 | 增量模式 |
|-----|---------|---------|---------|
| Excel中有，DB中无 | 新增 | 新增 | 新增 |
| Excel中有，DB中有 | 覆盖 | 更新 | 跳过 |
| Excel中无，DB中有 | 删除 | 保留 | 保留 |

### 增强的 Excel 处理器

```typescript
// src/utils/excelProcessor.ts - 增强版

export interface ImportOptions {
  mode: 'replace' | 'merge' | 'append'
  skipDuplicates?: boolean      // 增量模式下跳过重复
  updateExisting?: boolean      // 合并模式下更新已存在
  validateRelations?: boolean   // 是否验证关联数据
}

export interface ImportPreview {
  toAdd: any[]        // 将要新增的数据
  toUpdate: any[]     // 将要更新的数据
  toDelete: any[]     // 将要删除的数据 (仅覆盖模式)
  unchanged: any[]    // 无变化的数据
  errors: string[]    // 验证错误
  warnings: string[]  // 验证警告
}

export class ExcelProcessor {
  /**
   * 预览导入结果（不实际执行）
   */
  static async previewImport(
    file: File,
    existingData: any[],
    options: ImportOptions,
    idField: string = 'id'
  ): Promise<ImportPreview> {
    const result = await this.processProducts(file)
    if (!result.success) {
      return {
        toAdd: [],
        toUpdate: [],
        toDelete: [],
        unchanged: [],
        errors: result.validation.errors,
        warnings: result.validation.warnings
      }
    }

    const newData = result.data
    const existingMap = new Map(existingData.map(item => [item[idField], item]))
    const newMap = new Map(newData.map(item => [item[idField], item]))

    const preview: ImportPreview = {
      toAdd: [],
      toUpdate: [],
      toDelete: [],
      unchanged: [],
      errors: result.validation.errors,
      warnings: result.validation.warnings
    }

    // 分析新数据
    for (const item of newData) {
      const id = item[idField]
      if (existingMap.has(id)) {
        // 已存在
        if (options.mode === 'append') {
          preview.unchanged.push(item)
          preview.warnings.push(`ID "${id}" 已存在，将跳过`)
        } else {
          // 检查是否有变化
          const existing = existingMap.get(id)
          if (JSON.stringify(existing) !== JSON.stringify(item)) {
            preview.toUpdate.push(item)
          } else {
            preview.unchanged.push(item)
          }
        }
      } else {
        preview.toAdd.push(item)
      }
    }

    // 覆盖模式：标记要删除的数据
    if (options.mode === 'replace') {
      for (const item of existingData) {
        if (!newMap.has(item[idField])) {
          preview.toDelete.push(item)
        }
      }
    }

    return preview
  }

  /**
   * 执行导入
   */
  static executeImport(
    existingData: any[],
    preview: ImportPreview,
    options: ImportOptions,
    idField: string = 'id'
  ): any[] {
    let result: any[]

    switch (options.mode) {
      case 'replace':
        // 覆盖：直接使用新数据
        result = [...preview.toAdd, ...preview.toUpdate]
        break

      case 'merge':
        // 合并：保留未变化的，更新已变化的，添加新的
        const existingMap = new Map(existingData.map(item => [item[idField], item]))
        for (const item of preview.toUpdate) {
          existingMap.set(item[idField], item)
        }
        for (const item of preview.toAdd) {
          existingMap.set(item[idField], item)
        }
        result = Array.from(existingMap.values())
        break

      case 'append':
        // 增量：仅添加新数据
        result = [...existingData, ...preview.toAdd]
        break

      default:
        result = existingData
    }

    return result
  }
}
```


---

## 🧩 数据结构设计：去关联化 + JSONB

### 设计原则：实体独立性（数据孤岛）

各内容类型（产品、品牌、促销）之间 **不使用外键关联**，每条数据都是独立文档。

```
✅ 去关联化设计（采用）
┌──────────────────────────────────────┐
│            products                  │
│  {                                   │
│    "id": "P1001",                    │
│    "name": "试剂A",                  │
│    "brand": "赛默飞",  ← 直接存名称   │
│    "categoryId": "C01"               │
│  }                                   │
└──────────────────────────────────────┘
```

### 优势
- **版本回滚独立** - 回滚产品不影响品牌数据
- **无依赖检查** - 删除品牌不需要检查产品引用
- **快照完整** - 每个版本都是自包含的完整数据

---

## 🏗️ 技术架构（阿里云轻量服务器版）

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                     阿里云轻量应用服务器 (2C2G)                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      Nginx                               │   │
│  │              (反向代理 + 静态资源)                        │   │
│  └─────────────────────┬───────────────────────────────────┘   │
│                        │                                        │
│         ┌──────────────┴──────────────┐                        │
│         │                             │                        │
│         ▼                             ▼                        │
│  ┌─────────────────┐         ┌─────────────────┐              │
│  │   前端静态文件   │         │   Node.js API   │              │
│  │   (Vue Build)   │         │   (Express)     │              │
│  │   端口: 80      │         │   端口: 3000    │              │
│  └─────────────────┘         └────────┬────────┘              │
│                                       │                        │
│                                       ▼                        │
│                              ┌─────────────────┐              │
│                              │     SQLite      │              │
│                              │   (轻量数据库)   │              │
│                              │   data/cms.db   │              │
│                              └─────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 技术选型

| 层级 | 技术 | 说明 |
|-----|------|------|
| Web 服务器 | Nginx | 反向代理、静态资源、SSL |
| 前端 | Vue 3 + Vite | 现有技术栈，打包后静态部署 |
| 后端 | Node.js + Express | 轻量、与前端技术栈统一 |
| 数据库 | **SQLite** | 零配置、文件型、2G内存足够 |
| 进程管理 | PM2 | Node.js 进程守护 |

### 为什么选 SQLite？

| 对比项 | SQLite | MySQL/PostgreSQL |
|-------|--------|------------------|
| 内存占用 | ~10MB | ~200-500MB |
| 配置复杂度 | 零配置 | 需要安装配置 |
| 性能 (小数据量) | 极快 | 快 |
| 适合场景 | <10万条数据 | 大规模数据 |
| 备份 | 复制文件即可 | 需要 dump |

**你的场景**：产品/品牌/促销加起来可能就几千条数据，SQLite 完全够用，而且省内存。

---

## 💾 数据库设计 (SQLite)

### 表结构设计

```sql
-- 内容主表
CREATE TABLE IF NOT EXISTS contents (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  content_type    TEXT NOT NULL,        -- 'product', 'brand', 'promotion', 'banner', 'about', 'site_config'
  content_key     TEXT NOT NULL,        -- 业务唯一标识，如 'P1001', 'B001'
  
  -- 双数据模型（核心）
  draft_data      TEXT,                 -- 草稿数据 (JSON 字符串)
  published_data  TEXT,                 -- 已发布数据 (JSON 字符串)
  
  -- 状态
  status          TEXT DEFAULT 'draft', -- draft, published, deleted
  version         INTEGER DEFAULT 1,    -- 当前版本号
  
  -- 排序（用于品牌等需要排序的内容）
  sort_order      INTEGER DEFAULT 0,
  
  -- 时间戳
  created_at      TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at      TEXT DEFAULT (datetime('now', 'localtime')),
  published_at    TEXT,
  
  UNIQUE(content_type, content_key)
);

-- 版本历史表
CREATE TABLE IF NOT EXISTS content_versions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id      INTEGER NOT NULL,
  version         INTEGER NOT NULL,
  data            TEXT NOT NULL,        -- 该版本的完整数据快照 (JSON)
  change_summary  TEXT,                 -- 变更摘要
  created_at      TEXT DEFAULT (datetime('now', 'localtime')),
  
  UNIQUE(content_id, version),
  FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
);

-- 导入记录表（追踪Excel导入历史）
CREATE TABLE IF NOT EXISTS import_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  content_type    TEXT NOT NULL,
  import_mode     TEXT NOT NULL,        -- 'replace', 'merge', 'append'
  file_name       TEXT,
  total_count     INTEGER,
  added_count     INTEGER,
  updated_count   INTEGER,
  deleted_count   INTEGER,
  error_count     INTEGER,
  created_at      TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_contents_type ON contents(content_type);
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
CREATE INDEX IF NOT EXISTS idx_contents_sort ON contents(content_type, sort_order);
CREATE INDEX IF NOT EXISTS idx_versions_content ON content_versions(content_id);
```


---

## 🔄 关键操作流程

### 数据流转

```
┌─────────────────────────────────────────────────────────────────────┐
│                           后台管理界面                               │
│                                                                     │
│   ┌─────────┐         ┌─────────┐         ┌─────────┐              │
│   │  编辑   │────────▶│  保存   │────────▶│  发布   │              │
│   │  输入   │         │  草稿   │         │  上线   │              │
│   └─────────┘         └─────────┘         └─────────┘              │
│        │                   │                   │                    │
│        ▼                   ▼                   ▼                    │
│   Local State         draft_data          published_data           │
│   (浏览器内存)         (SQLite)            (SQLite)                 │
│                            │                   │                    │
│                            │              创建版本快照               │
│                            │                   │                    │
│                            ▼                   ▼                    │
│                      ┌─────────┐       content_versions             │
│                      │  回滚   │◀──── 从版本历史恢复                │
│                      └─────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 操作说明

| 操作 | 触发动作 | 系统行为 | 影响范围 |
|-----|---------|---------|---------|
| **保存草稿** | 点击"保存" | Local → draft_data | 仅后台可见 |
| **发布** | 点击"发布" | draft_data → published_data + 版本快照 | 前台实时更新 |
| **回滚** | 点击"回滚" | content_versions → draft_data | 仅覆盖草稿，需再发布 |
| **删除** | 点击"删除" | status = 'deleted' | 软删除，数据保留 |

---

## 🛠️ 后端 API 设计

### 项目结构

```
server/                           # 后端目录 (新增)
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                  # 入口文件
│   ├── db.ts                     # 数据库连接
│   ├── routes/
│   │   ├── content.ts            # 内容管理路由
│   │   └── import.ts             # 导入管理路由
│   ├── services/
│   │   ├── contentService.ts     # 内容服务
│   │   └── importService.ts      # 导入服务
│   └── types.ts                  # 类型定义
└── data/
    └── cms.db                    # SQLite 数据库文件
```

### API 路由设计

#### 1. 内容查询 API

```typescript
// ========================================
// 前台 API（只返回已发布数据）
// ========================================

// 获取已发布列表（支持分页）
GET /api/content/:type/published
Query: page, pageSize, search, categoryId, brand, sortBy
Response: { data: [], pagination: { page, pageSize, total, totalPages } }

// 获取单条已发布数据
GET /api/content/:type/:key/published
Response: { data: {...} }

// ========================================
// 后台 API（返回草稿+已发布数据）
// ========================================

// 获取所有数据（后台列表）
GET /api/admin/content/:type
Query: page, pageSize, search, status, category
Response: { data: [], pagination: {...} }

// 获取单条数据详情
GET /api/admin/content/:type/:key
Response: { 
  id, contentType, contentKey, 
  draftData, publishedData, 
  status, version, 
  createdAt, updatedAt, publishedAt 
}

// 获取版本历史
GET /api/admin/content/:type/:key/versions
Response: [{ version, data, changeSummary, createdAt }]
```

#### 2. 内容写入 API

```typescript
// 保存草稿
PUT /api/admin/content/:type/:key/draft
Body: { ...data }
Response: { success: true }

// 创建新内容
POST /api/admin/content/:type
Body: { contentKey, data }
Response: { success: true, contentKey }

// 删除（软删除）
DELETE /api/admin/content/:type/:key
Response: { success: true }

// 批量删除
DELETE /api/admin/content/:type/batch
Body: { keys: ['key1', 'key2'] }
Response: { success: true, deletedCount }
```

#### 3. 发布管理 API

```typescript
// 发布单条
POST /api/admin/content/:type/:key/publish
Response: { success: true, version }

// 批量发布
POST /api/admin/content/:type/batch-publish
Body: { keys: ['key1', 'key2'] }
Response: { success: true, publishedCount }

// 撤回发布
POST /api/admin/content/:type/:key/unpublish
Response: { success: true }

// 回滚到指定版本
POST /api/admin/content/:type/:key/rollback
Body: { version: 3 }
Response: { success: true }
```

#### 4. 导入管理 API

```typescript
// 预览导入（不实际执行）
POST /api/admin/import/:type/preview
Body: FormData { file, mode: 'replace'|'merge'|'append' }
Response: {
  toAdd: [...],
  toUpdate: [...],
  toDelete: [...],
  unchanged: [...],
  errors: [...],
  warnings: [...]
}

// 执行导入
POST /api/admin/import/:type/execute
Body: { 
  mode: 'replace'|'merge'|'append',
  data: [...],  // 预览确认后的数据
  autoPublish: false  // 是否自动发布
}
Response: { 
  success: true, 
  addedCount, updatedCount, deletedCount,
  importLogId
}

// 获取导入历史
GET /api/admin/import/:type/logs
Response: [{ id, mode, fileName, counts, createdAt }]
```

#### 5. 排序管理 API

```typescript
// 更新排序（品牌等需要排序的内容）
PUT /api/admin/content/:type/sort
Body: { 
  category?: string,  // 可选，按分类排序
  orders: [{ key: 'B001', sortOrder: 1 }, ...] 
}
Response: { success: true }

// 移动单项
PUT /api/admin/content/:type/:key/move
Body: { direction: 'up'|'down', category?: string }
Response: { success: true }
```


---

## 🖥️ 前端改造方案

### 1. API 调用层

```typescript
// src/api/contentApi.ts

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export const contentApi = {
  // ========================================
  // 前台查询（已发布数据）
  // ========================================
  
  // 获取已发布列表（支持分页）
  async getPublishedList<T>(
    contentType: string, 
    params?: {
      page?: number
      pageSize?: number
      search?: string
      categoryId?: string
      brand?: string
      sortBy?: string
    }
  ): Promise<PaginatedResponse<T>> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          query.set(key, String(value))
        }
      })
    }
    const res = await fetch(`${API_BASE}/content/${contentType}/published?${query}`)
    if (!res.ok) throw new Error('获取数据失败')
    return res.json()
  },
  
  // 获取单条已发布数据
  async getPublishedOne<T>(contentType: string, contentKey: string): Promise<T> {
    const res = await fetch(`${API_BASE}/content/${contentType}/${contentKey}/published`)
    if (!res.ok) throw new Error('获取数据失败')
    return res.json()
  },

  // ========================================
  // 后台管理
  // ========================================
  
  // 获取所有数据（后台）
  async getAdminList<T>(contentType: string, params?: any): Promise<PaginatedResponse<ContentItem<T>>> {
    const query = new URLSearchParams(params)
    const res = await fetch(`${API_BASE}/admin/content/${contentType}?${query}`)
    if (!res.ok) throw new Error('获取数据失败')
    return res.json()
  },
  
  // 保存草稿
  async saveDraft<T>(contentType: string, contentKey: string, data: T): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/content/${contentType}/${contentKey}/draft`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error('保存草稿失败')
  },
  
  // 批量保存草稿
  async batchSaveDraft<T>(contentType: string, items: { key: string; data: T }[]): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/content/${contentType}/batch-draft`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    })
    if (!res.ok) throw new Error('批量保存失败')
  },
  
  // 发布
  async publish(contentType: string, contentKey: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/content/${contentType}/${contentKey}/publish`, {
      method: 'POST'
    })
    if (!res.ok) throw new Error('发布失败')
  },
  
  // 批量发布
  async batchPublish(contentType: string, contentKeys: string[]): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/content/${contentType}/batch-publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys: contentKeys })
    })
    if (!res.ok) throw new Error('批量发布失败')
  },
  
  // 获取版本历史
  async getVersions(contentType: string, contentKey: string): Promise<VersionInfo[]> {
    const res = await fetch(`${API_BASE}/admin/content/${contentType}/${contentKey}/versions`)
    if (!res.ok) throw new Error('获取版本历史失败')
    return res.json()
  },
  
  // 回滚
  async rollback(contentType: string, contentKey: string, version: number): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/content/${contentType}/${contentKey}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version })
    })
    if (!res.ok) throw new Error('回滚失败')
  }
}

// 导入 API
export const importApi = {
  // 预览导入
  async preview(contentType: string, file: File, mode: ImportMode): Promise<ImportPreview> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mode', mode)
    
    const res = await fetch(`${API_BASE}/admin/import/${contentType}/preview`, {
      method: 'POST',
      body: formData
    })
    if (!res.ok) throw new Error('预览失败')
    return res.json()
  },
  
  // 执行导入
  async execute(
    contentType: string, 
    data: any[], 
    mode: ImportMode,
    autoPublish: boolean = false
  ): Promise<ImportResult> {
    const res = await fetch(`${API_BASE}/admin/import/${contentType}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, mode, autoPublish })
    })
    if (!res.ok) throw new Error('导入失败')
    return res.json()
  }
}

// 类型定义
export type ImportMode = 'replace' | 'merge' | 'append'

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface ContentItem<T = any> {
  id: number
  contentType: string
  contentKey: string
  draftData: T | null
  publishedData: T | null
  status: 'draft' | 'published' | 'deleted'
  version: number
  sortOrder: number
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  // 计算属性
  hasUnpublishedChanges: boolean  // 草稿与已发布不一致
}

export interface VersionInfo {
  version: number
  data: any
  changeSummary: string | null
  createdAt: string
}

export interface ImportPreview {
  toAdd: any[]
  toUpdate: any[]
  toDelete: any[]
  unchanged: any[]
  errors: string[]
  warnings: string[]
}

export interface ImportResult {
  success: boolean
  addedCount: number
  updatedCount: number
  deletedCount: number
  importLogId: number
}
```

### 2. Store 改造示例（产品）

```typescript
// src/stores/productStore.ts - 改造版

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { contentApi } from '@/api/contentApi'
import type { Product, ProductFilters } from '@/types'

export const useProductStore = defineStore('product', () => {
  // ========================================
  // State
  // ========================================
  
  // 当前页数据
  const products = ref<Product[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // 分页状态
  const pagination = ref({
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 0
  })
  
  // 筛选状态
  const filters = ref<ProductFilters>({
    search: '',
    categoryId: '',
    brand: ''
  })
  
  // 排序状态
  const sortBy = ref<string>('name-asc')
  
  // 所有品牌列表（用于筛选器）
  const allBrands = ref<string[]>([])

  // ========================================
  // Actions
  // ========================================
  
  // 加载产品列表（分页）
  async function loadProducts(page: number = 1) {
    loading.value = true
    error.value = null
    
    try {
      const result = await contentApi.getPublishedList<Product>('product', {
        page,
        pageSize: pagination.value.pageSize,
        search: filters.value.search || undefined,
        categoryId: filters.value.categoryId || undefined,
        brand: filters.value.brand || undefined,
        sortBy: sortBy.value
      })
      
      products.value = result.data
      pagination.value = result.pagination
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      loading.value = false
    }
  }
  
  // 加载品牌列表（用于筛选器）
  async function loadBrandOptions() {
    try {
      const result = await contentApi.getPublishedList<Product>('product', {
        pageSize: 9999  // 获取全部用于提取品牌
      })
      const brands = result.data
        .map(p => p.brand)
        .filter((b): b is string => !!b)
      allBrands.value = [...new Set(brands)].sort()
    } catch (e) {
      console.error('加载品牌列表失败:', e)
    }
  }
  
  // 根据ID获取产品
  async function getProductById(id: string): Promise<Product | null> {
    try {
      return await contentApi.getPublishedOne<Product>('product', id)
    } catch {
      return null
    }
  }
  
  // 更新筛选条件
  function setFilter<K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) {
    filters.value[key] = value
    loadProducts(1)  // 重新加载第一页
  }
  
  // 清空筛选
  function clearAllFilters() {
    filters.value = { search: '', categoryId: '', brand: '' }
    loadProducts(1)
  }
  
  // 设置排序
  function setSortBy(sort: string) {
    sortBy.value = sort
    loadProducts(1)
  }
  
  // 设置每页数量
  function setPageSize(size: number) {
    pagination.value.pageSize = size
    loadProducts(1)
  }
  
  // 跳转页面
  function goToPage(page: number) {
    loadProducts(page)
  }

  return {
    // State
    products,
    loading,
    error,
    pagination,
    filters,
    sortBy,
    allBrands,
    
    // Actions
    loadProducts,
    loadBrandOptions,
    getProductById,
    setFilter,
    clearAllFilters,
    setSortBy,
    setPageSize,
    goToPage
  }
})
```


### 3. 后台管理 Store（新增）

```typescript
// src/stores/adminContentStore.ts - 后台内容管理通用 Store

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { contentApi, importApi, type ContentItem, type ImportPreview, type ImportMode } from '@/api/contentApi'
import { ElMessage } from 'element-plus'

export const useAdminContentStore = defineStore('adminContent', () => {
  // ========================================
  // State
  // ========================================
  
  // 当前内容类型
  const contentType = ref<string>('')
  
  // 数据列表
  const items = ref<ContentItem[]>([])
  const loading = ref(false)
  
  // 分页
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })
  
  // 选中项
  const selectedKeys = ref<string[]>([])
  
  // 导入状态
  const importPreview = ref<ImportPreview | null>(null)
  const importing = ref(false)

  // ========================================
  // Getters
  // ========================================
  
  // 有未发布更改的项
  const itemsWithChanges = computed(() => 
    items.value.filter(item => item.hasUnpublishedChanges)
  )
  
  // 草稿项
  const draftItems = computed(() => 
    items.value.filter(item => item.status === 'draft')
  )
  
  // 已发布项
  const publishedItems = computed(() => 
    items.value.filter(item => item.status === 'published')
  )

  // ========================================
  // Actions
  // ========================================
  
  // 初始化（设置内容类型）
  function init(type: string) {
    contentType.value = type
    items.value = []
    selectedKeys.value = []
    importPreview.value = null
  }
  
  // 加载列表
  async function loadItems(page: number = 1) {
    if (!contentType.value) return
    
    loading.value = true
    try {
      const result = await contentApi.getAdminList(contentType.value, {
        page,
        pageSize: pagination.value.pageSize
      })
      
      items.value = result.data
      pagination.value = result.pagination
    } catch (e) {
      ElMessage.error('加载数据失败')
    } finally {
      loading.value = false
    }
  }
  
  // 保存单项草稿
  async function saveDraft(key: string, data: any) {
    try {
      await contentApi.saveDraft(contentType.value, key, data)
      ElMessage.success('保存成功')
      await loadItems(pagination.value.page)
    } catch (e) {
      ElMessage.error('保存失败')
      throw e
    }
  }
  
  // 批量保存草稿
  async function batchSaveDraft(itemsToSave: { key: string; data: any }[]) {
    try {
      await contentApi.batchSaveDraft(contentType.value, itemsToSave)
      ElMessage.success(`保存了 ${itemsToSave.length} 条数据`)
      await loadItems(pagination.value.page)
    } catch (e) {
      ElMessage.error('批量保存失败')
      throw e
    }
  }
  
  // 发布单项
  async function publish(key: string) {
    try {
      await contentApi.publish(contentType.value, key)
      ElMessage.success('发布成功')
      await loadItems(pagination.value.page)
    } catch (e) {
      ElMessage.error('发布失败')
      throw e
    }
  }
  
  // 批量发布
  async function batchPublish(keys?: string[]) {
    const keysToPublish = keys || selectedKeys.value
    if (keysToPublish.length === 0) {
      ElMessage.warning('请先选择要发布的数据')
      return
    }
    
    try {
      await contentApi.batchPublish(contentType.value, keysToPublish)
      ElMessage.success(`发布了 ${keysToPublish.length} 条数据`)
      selectedKeys.value = []
      await loadItems(pagination.value.page)
    } catch (e) {
      ElMessage.error('批量发布失败')
      throw e
    }
  }
  
  // 发布所有有更改的项
  async function publishAllChanges() {
    const keys = itemsWithChanges.value.map(item => item.contentKey)
    if (keys.length === 0) {
      ElMessage.info('没有需要发布的更改')
      return
    }
    await batchPublish(keys)
  }
  
  // ========================================
  // 导入相关
  // ========================================
  
  // 预览导入
  async function previewImport(file: File, mode: ImportMode) {
    importing.value = true
    try {
      importPreview.value = await importApi.preview(contentType.value, file, mode)
      return importPreview.value
    } catch (e) {
      ElMessage.error('预览失败')
      throw e
    } finally {
      importing.value = false
    }
  }
  
  // 执行导入
  async function executeImport(mode: ImportMode, autoPublish: boolean = false) {
    if (!importPreview.value) {
      ElMessage.warning('请先预览导入数据')
      return
    }
    
    // 合并要导入的数据
    const dataToImport = [
      ...importPreview.value.toAdd,
      ...importPreview.value.toUpdate
    ]
    
    if (dataToImport.length === 0) {
      ElMessage.info('没有需要导入的数据')
      return
    }
    
    importing.value = true
    try {
      const result = await importApi.execute(contentType.value, dataToImport, mode, autoPublish)
      
      ElMessage.success(
        `导入完成：新增 ${result.addedCount} 条，更新 ${result.updatedCount} 条` +
        (result.deletedCount > 0 ? `，删除 ${result.deletedCount} 条` : '')
      )
      
      importPreview.value = null
      await loadItems(1)
      
      return result
    } catch (e) {
      ElMessage.error('导入失败')
      throw e
    } finally {
      importing.value = false
    }
  }
  
  // 清除导入预览
  function clearImportPreview() {
    importPreview.value = null
  }

  return {
    // State
    contentType,
    items,
    loading,
    pagination,
    selectedKeys,
    importPreview,
    importing,
    
    // Getters
    itemsWithChanges,
    draftItems,
    publishedItems,
    
    // Actions
    init,
    loadItems,
    saveDraft,
    batchSaveDraft,
    publish,
    batchPublish,
    publishAllChanges,
    previewImport,
    executeImport,
    clearImportPreview
  }
})
```

### 4. 后台组件改造

#### 状态指示器组件

```vue
<!-- src/views/admin/components/ContentStatusBadge.vue -->
<script setup lang="ts">
defineProps<{
  status: 'draft' | 'published' | 'deleted'
  hasChanges?: boolean
}>()
</script>

<template>
  <div class="status-badge-wrapper">
    <el-tag 
      :type="status === 'published' ? 'success' : status === 'draft' ? 'warning' : 'info'"
      size="small"
    >
      {{ status === 'published' ? '已发布' : status === 'draft' ? '草稿' : '已删除' }}
    </el-tag>
    <el-tag v-if="hasChanges" type="danger" size="small" class="ml-1">
      有更改
    </el-tag>
  </div>
</template>
```

#### 导入对话框组件

```vue
<!-- src/views/admin/components/ImportDialog.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { ImportPreview, ImportMode } from '@/api/contentApi'

const props = defineProps<{
  visible: boolean
  preview: ImportPreview | null
  loading: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'preview': [file: File, mode: ImportMode]
  'execute': [mode: ImportMode, autoPublish: boolean]
}>()

const importMode = ref<ImportMode>('merge')
const autoPublish = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)

const modeOptions = [
  { value: 'merge', label: '合并模式', desc: '更新已存在的，添加新的，保留未涉及的' },
  { value: 'append', label: '增量模式', desc: '仅添加新数据，跳过已存在的' },
  { value: 'replace', label: '覆盖模式', desc: '清空现有数据，完全使用新数据（危险）' }
]

const summary = computed(() => {
  if (!props.preview) return null
  return {
    add: props.preview.toAdd.length,
    update: props.preview.toUpdate.length,
    delete: props.preview.toDelete.length,
    unchanged: props.preview.unchanged.length,
    errors: props.preview.errors.length,
    warnings: props.preview.warnings.length
  }
})

const handleFileSelect = () => {
  fileInputRef.value?.click()
}

const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    selectedFile.value = file
    emit('preview', file, importMode.value)
  }
}

const handleExecute = () => {
  if (!props.preview || props.preview.errors.length > 0) {
    ElMessage.error('存在验证错误，无法导入')
    return
  }
  emit('execute', importMode.value, autoPublish.value)
}

const handleClose = () => {
  selectedFile.value = null
  emit('update:visible', false)
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="导入数据"
    width="700px"
    @update:model-value="handleClose"
  >
    <!-- 步骤1：选择模式和文件 -->
    <div class="import-step">
      <h4>1. 选择导入模式</h4>
      <el-radio-group v-model="importMode" class="mode-group">
        <el-radio-button 
          v-for="opt in modeOptions" 
          :key="opt.value" 
          :value="opt.value"
        >
          <div class="mode-option">
            <span class="mode-label">{{ opt.label }}</span>
            <span class="mode-desc">{{ opt.desc }}</span>
          </div>
        </el-radio-button>
      </el-radio-group>
    </div>

    <div class="import-step">
      <h4>2. 选择文件</h4>
      <input 
        ref="fileInputRef" 
        type="file" 
        accept=".xlsx,.xls" 
        style="display: none"
        @change="handleFileChange"
      />
      <el-button @click="handleFileSelect" :loading="loading">
        <i class="fas fa-upload mr-1"></i>
        {{ selectedFile ? selectedFile.name : '选择 Excel 文件' }}
      </el-button>
    </div>

    <!-- 步骤2：预览结果 -->
    <div v-if="preview" class="import-step">
      <h4>3. 预览结果</h4>
      
      <!-- 统计 -->
      <div class="preview-summary">
        <div class="summary-item add">
          <span class="num">{{ summary?.add }}</span>
          <span class="label">新增</span>
        </div>
        <div class="summary-item update">
          <span class="num">{{ summary?.update }}</span>
          <span class="label">更新</span>
        </div>
        <div v-if="importMode === 'replace'" class="summary-item delete">
          <span class="num">{{ summary?.delete }}</span>
          <span class="label">删除</span>
        </div>
        <div class="summary-item unchanged">
          <span class="num">{{ summary?.unchanged }}</span>
          <span class="label">无变化</span>
        </div>
      </div>

      <!-- 错误 -->
      <div v-if="preview.errors.length > 0" class="preview-errors">
        <h5><i class="fas fa-times-circle"></i> 错误 ({{ preview.errors.length }})</h5>
        <ul>
          <li v-for="(err, i) in preview.errors.slice(0, 10)" :key="i">{{ err }}</li>
          <li v-if="preview.errors.length > 10">... 还有 {{ preview.errors.length - 10 }} 条错误</li>
        </ul>
      </div>

      <!-- 警告 -->
      <div v-if="preview.warnings.length > 0" class="preview-warnings">
        <h5><i class="fas fa-exclamation-triangle"></i> 警告 ({{ preview.warnings.length }})</h5>
        <ul>
          <li v-for="(warn, i) in preview.warnings.slice(0, 5)" :key="i">{{ warn }}</li>
          <li v-if="preview.warnings.length > 5">... 还有 {{ preview.warnings.length - 5 }} 条警告</li>
        </ul>
      </div>

      <!-- 自动发布选项 -->
      <div class="auto-publish-option">
        <el-checkbox v-model="autoPublish">导入后自动发布</el-checkbox>
        <span class="tip">（不勾选则仅保存为草稿）</span>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button 
        type="primary" 
        :disabled="!preview || preview.errors.length > 0"
        :loading="loading"
        @click="handleExecute"
      >
        确认导入
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.import-step {
  margin-bottom: 24px;
}
.import-step h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #333;
}
.mode-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mode-option {
  display: flex;
  flex-direction: column;
  text-align: left;
}
.mode-label {
  font-weight: 500;
}
.mode-desc {
  font-size: 12px;
  color: #999;
}
.preview-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}
.summary-item {
  padding: 12px 20px;
  border-radius: 8px;
  text-align: center;
}
.summary-item .num {
  display: block;
  font-size: 24px;
  font-weight: 600;
}
.summary-item .label {
  font-size: 12px;
  color: #666;
}
.summary-item.add { background: #e6f7e6; color: #52c41a; }
.summary-item.update { background: #e6f0ff; color: #1890ff; }
.summary-item.delete { background: #fff2f0; color: #ff4d4f; }
.summary-item.unchanged { background: #f5f5f5; color: #999; }
.preview-errors, .preview-warnings {
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}
.preview-errors { background: #fff2f0; }
.preview-warnings { background: #fffbe6; }
.preview-errors h5 { color: #ff4d4f; }
.preview-warnings h5 { color: #faad14; }
.preview-errors ul, .preview-warnings ul {
  margin: 8px 0 0;
  padding-left: 20px;
  font-size: 13px;
}
.auto-publish-option {
  margin-top: 16px;
}
.auto-publish-option .tip {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}
</style>
```


---

## 🔧 后端实现 (Node.js + Express + SQLite)

### package.json

```json
{
  "name": "biotech-cms-server",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.4.3",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/better-sqlite3": "^7.6.8",
    "@types/cors": "^2.8.17",
    "@types/multer": "^1.4.11",
    "typescript": "^5.4.0",
    "ts-node-dev": "^2.0.0"
  }
}
```

### 数据库服务 (db.ts)

```typescript
// server/src/db.ts
import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(__dirname, '../data/cms.db')
const db = new Database(dbPath)

// 启用 WAL 模式提升并发性能
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// 初始化表结构
db.exec(`
  CREATE TABLE IF NOT EXISTS contents (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    content_type    TEXT NOT NULL,
    content_key     TEXT NOT NULL,
    draft_data      TEXT,
    published_data  TEXT,
    status          TEXT DEFAULT 'draft',
    version         INTEGER DEFAULT 1,
    sort_order      INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at      TEXT DEFAULT (datetime('now', 'localtime')),
    published_at    TEXT,
    UNIQUE(content_type, content_key)
  );

  CREATE TABLE IF NOT EXISTS content_versions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id      INTEGER NOT NULL,
    version         INTEGER NOT NULL,
    data            TEXT NOT NULL,
    change_summary  TEXT,
    created_at      TEXT DEFAULT (datetime('now', 'localtime')),
    UNIQUE(content_id, version),
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS import_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    content_type    TEXT NOT NULL,
    import_mode     TEXT NOT NULL,
    file_name       TEXT,
    total_count     INTEGER,
    added_count     INTEGER,
    updated_count   INTEGER,
    deleted_count   INTEGER,
    error_count     INTEGER,
    created_at      TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_contents_type ON contents(content_type);
  CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
  CREATE INDEX IF NOT EXISTS idx_contents_sort ON contents(content_type, sort_order);
  CREATE INDEX IF NOT EXISTS idx_versions_content ON content_versions(content_id);
`)

export default db
```

### 内容服务 (contentService.ts)

```typescript
// server/src/services/contentService.ts
import db from '../db'

export interface QueryOptions {
  page?: number
  pageSize?: number
  search?: string
  categoryId?: string
  brand?: string
  sortBy?: string
  status?: string
}

export const contentService = {
  // ========================================
  // 查询
  // ========================================
  
  // 获取已发布列表（支持分页和筛选）
  getPublishedList(contentType: string, options: QueryOptions = {}) {
    const { page = 1, pageSize = 20, search, categoryId, brand, sortBy } = options
    
    // 获取所有已发布数据
    let rows = db.prepare(`
      SELECT published_data, sort_order FROM contents 
      WHERE content_type = ? AND status = 'published' AND published_data IS NOT NULL
      ORDER BY sort_order ASC, id ASC
    `).all(contentType) as any[]
    
    // 解析 JSON
    let data = rows.map(row => ({
      ...JSON.parse(row.published_data),
      _sortOrder: row.sort_order
    }))
    
    // 筛选
    if (search) {
      const query = search.toLowerCase()
      data = data.filter(item => 
        Object.values(item).some(val => 
          val && String(val).toLowerCase().includes(query)
        )
      )
    }
    
    if (categoryId) {
      data = data.filter(item => item.categoryId === categoryId)
    }
    
    if (brand) {
      data = data.filter(item => item.brand === brand)
    }
    
    // 排序
    if (sortBy) {
      const [field, order] = sortBy.split('-')
      data.sort((a, b) => {
        const aVal = a[field] || ''
        const bVal = b[field] || ''
        const cmp = String(aVal).localeCompare(String(bVal), 'zh-CN')
        return order === 'desc' ? -cmp : cmp
      })
    }
    
    // 分页
    const total = data.length
    const totalPages = Math.ceil(total / pageSize)
    const start = (page - 1) * pageSize
    const paginatedData = data.slice(start, start + pageSize)
    
    // 移除内部字段
    paginatedData.forEach(item => delete item._sortOrder)
    
    return {
      data: paginatedData,
      pagination: { page, pageSize, total, totalPages }
    }
  },
  
  // 获取后台列表（包含草稿）
  getAdminList(contentType: string, options: QueryOptions = {}) {
    const { page = 1, pageSize = 20 } = options
    
    const rows = db.prepare(`
      SELECT * FROM contents 
      WHERE content_type = ? AND status != 'deleted'
      ORDER BY sort_order ASC, id ASC
    `).all(contentType) as any[]
    
    const data = rows.map(row => ({
      id: row.id,
      contentType: row.content_type,
      contentKey: row.content_key,
      draftData: row.draft_data ? JSON.parse(row.draft_data) : null,
      publishedData: row.published_data ? JSON.parse(row.published_data) : null,
      status: row.status,
      version: row.version,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
      hasUnpublishedChanges: row.draft_data !== row.published_data
    }))
    
    const total = data.length
    const totalPages = Math.ceil(total / pageSize)
    const start = (page - 1) * pageSize
    
    return {
      data: data.slice(start, start + pageSize),
      pagination: { page, pageSize, total, totalPages }
    }
  },
  
  // 获取单条
  getOne(contentType: string, contentKey: string) {
    const row: any = db.prepare(`
      SELECT * FROM contents WHERE content_type = ? AND content_key = ?
    `).get(contentType, contentKey)
    
    if (!row) return null
    
    return {
      id: row.id,
      contentType: row.content_type,
      contentKey: row.content_key,
      draftData: row.draft_data ? JSON.parse(row.draft_data) : null,
      publishedData: row.published_data ? JSON.parse(row.published_data) : null,
      status: row.status,
      version: row.version,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at
    }
  },
  
  // 获取版本历史
  getVersions(contentType: string, contentKey: string) {
    const content: any = db.prepare(`
      SELECT id FROM contents WHERE content_type = ? AND content_key = ?
    `).get(contentType, contentKey)
    
    if (!content) return []
    
    const versions = db.prepare(`
      SELECT version, data, change_summary, created_at 
      FROM content_versions 
      WHERE content_id = ? 
      ORDER BY version DESC
    `).all(content.id) as any[]
    
    return versions.map(v => ({
      version: v.version,
      data: JSON.parse(v.data),
      changeSummary: v.change_summary,
      createdAt: v.created_at
    }))
  },

  // ========================================
  // 写入
  // ========================================
  
  // 保存草稿
  saveDraft(contentType: string, contentKey: string, data: any) {
    const draftData = JSON.stringify(data)
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    
    db.prepare(`
      INSERT INTO contents (content_type, content_key, draft_data, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(content_type, content_key) DO UPDATE SET
        draft_data = excluded.draft_data,
        updated_at = excluded.updated_at
    `).run(contentType, contentKey, draftData, now)
  },
  
  // 批量保存草稿
  batchSaveDraft(contentType: string, items: { key: string; data: any }[]) {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    
    const stmt = db.prepare(`
      INSERT INTO contents (content_type, content_key, draft_data, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(content_type, content_key) DO UPDATE SET
        draft_data = excluded.draft_data,
        updated_at = excluded.updated_at
    `)
    
    const transaction = db.transaction(() => {
      for (const item of items) {
        stmt.run(contentType, item.key, JSON.stringify(item.data), now)
      }
    })
    
    transaction()
  },
  
  // 删除（软删除）
  delete(contentType: string, contentKey: string) {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    
    db.prepare(`
      UPDATE contents SET status = 'deleted', updated_at = ?
      WHERE content_type = ? AND content_key = ?
    `).run(now, contentType, contentKey)
  },

  // ========================================
  // 发布
  // ========================================
  
  // 发布单条
  publish(contentType: string, contentKey: string) {
    const content: any = db.prepare(`
      SELECT * FROM contents WHERE content_type = ? AND content_key = ?
    `).get(contentType, contentKey)
    
    if (!content) throw new Error('Content not found')
    if (!content.draft_data) throw new Error('No draft data to publish')
    
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    
    const transaction = db.transaction(() => {
      // 创建版本快照
      db.prepare(`
        INSERT INTO content_versions (content_id, version, data)
        VALUES (?, ?, ?)
      `).run(content.id, content.version, content.draft_data)
      
      // 发布
      db.prepare(`
        UPDATE contents SET 
          published_data = draft_data,
          status = 'published',
          version = version + 1,
          published_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(now, now, content.id)
    })
    
    transaction()
    return content.version + 1
  },
  
  // 批量发布
  batchPublish(contentType: string, contentKeys: string[]) {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    let publishedCount = 0
    
    const transaction = db.transaction(() => {
      for (const key of contentKeys) {
        const content: any = db.prepare(`
          SELECT * FROM contents WHERE content_type = ? AND content_key = ?
        `).get(contentType, key)
        
        if (content && content.draft_data) {
          // 创建版本快照
          db.prepare(`
            INSERT INTO content_versions (content_id, version, data)
            VALUES (?, ?, ?)
          `).run(content.id, content.version, content.draft_data)
          
          // 发布
          db.prepare(`
            UPDATE contents SET 
              published_data = draft_data,
              status = 'published',
              version = version + 1,
              published_at = ?,
              updated_at = ?
            WHERE id = ?
          `).run(now, now, content.id)
          
          publishedCount++
        }
      }
    })
    
    transaction()
    return publishedCount
  },
  
  // 回滚
  rollback(contentType: string, contentKey: string, version: number) {
    const content: any = db.prepare(`
      SELECT id FROM contents WHERE content_type = ? AND content_key = ?
    `).get(contentType, contentKey)
    
    if (!content) throw new Error('Content not found')
    
    const versionData: any = db.prepare(`
      SELECT data FROM content_versions WHERE content_id = ? AND version = ?
    `).get(content.id, version)
    
    if (!versionData) throw new Error('Version not found')
    
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    
    db.prepare(`
      UPDATE contents SET draft_data = ?, updated_at = ?
      WHERE id = ?
    `).run(versionData.data, now, content.id)
  }
}
```


### 导入服务 (importService.ts)

```typescript
// server/src/services/importService.ts
import db from '../db'
import * as XLSX from 'xlsx'

export type ImportMode = 'replace' | 'merge' | 'append'

export interface ImportPreview {
  toAdd: any[]
  toUpdate: any[]
  toDelete: any[]
  unchanged: any[]
  errors: string[]
  warnings: string[]
}

export const importService = {
  // 解析 Excel 文件
  parseExcel(buffer: Buffer): any[] {
    const workbook = XLSX.read(buffer)
    const sheetName = workbook.SheetNames[0]
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
  },
  
  // 验证产品数据
  validateProducts(data: any[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []
    const requiredFields = ['name', 'categoryId', 'specs', 'desc']
    
    data.forEach((row, index) => {
      const rowNum = index + 2  // Excel 行号（从2开始，1是表头）
      
      // 必填字段检查
      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push(`第${rowNum}行: 缺少必填字段 "${field}"`)
        }
      })
      
      // ID 格式检查
      if (row.id && !/^P\d+$/.test(row.id)) {
        warnings.push(`第${rowNum}行: 产品ID格式建议为 "P" + 数字`)
      }
    })
    
    return { errors, warnings }
  },
  
  // 预览导入
  previewImport(
    contentType: string,
    newData: any[],
    mode: ImportMode,
    idField: string = 'id'
  ): ImportPreview {
    // 获取现有数据
    const existingRows = db.prepare(`
      SELECT content_key, draft_data FROM contents 
      WHERE content_type = ? AND status != 'deleted'
    `).all(contentType) as any[]
    
    const existingMap = new Map(
      existingRows.map(row => [row.content_key, JSON.parse(row.draft_data || '{}')])
    )
    
    const newMap = new Map(newData.map(item => [item[idField], item]))
    
    const preview: ImportPreview = {
      toAdd: [],
      toUpdate: [],
      toDelete: [],
      unchanged: [],
      errors: [],
      warnings: []
    }
    
    // 验证数据
    if (contentType === 'product') {
      const validation = this.validateProducts(newData)
      preview.errors = validation.errors
      preview.warnings = validation.warnings
    }
    
    // 分析新数据
    for (const item of newData) {
      const id = item[idField]
      if (existingMap.has(id)) {
        if (mode === 'append') {
          preview.unchanged.push(item)
          preview.warnings.push(`ID "${id}" 已存在，将跳过`)
        } else {
          const existing = existingMap.get(id)
          if (JSON.stringify(existing) !== JSON.stringify(item)) {
            preview.toUpdate.push(item)
          } else {
            preview.unchanged.push(item)
          }
        }
      } else {
        preview.toAdd.push(item)
      }
    }
    
    // 覆盖模式：标记要删除的
    if (mode === 'replace') {
      for (const [key] of existingMap) {
        if (!newMap.has(key)) {
          preview.toDelete.push({ [idField]: key })
        }
      }
    }
    
    return preview
  },
  
  // 执行导入
  executeImport(
    contentType: string,
    data: any[],
    mode: ImportMode,
    autoPublish: boolean = false,
    idField: string = 'id',
    fileName?: string
  ) {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    let addedCount = 0
    let updatedCount = 0
    let deletedCount = 0
    
    const transaction = db.transaction(() => {
      // 覆盖模式：先删除不在新数据中的
      if (mode === 'replace') {
        const newIds = data.map(item => item[idField])
        const toDelete = db.prepare(`
          SELECT content_key FROM contents 
          WHERE content_type = ? AND status != 'deleted' AND content_key NOT IN (${newIds.map(() => '?').join(',')})
        `).all(contentType, ...newIds) as any[]
        
        for (const row of toDelete) {
          db.prepare(`
            UPDATE contents SET status = 'deleted', updated_at = ?
            WHERE content_type = ? AND content_key = ?
          `).run(now, contentType, row.content_key)
          deletedCount++
        }
      }
      
      // 插入/更新数据
      for (const item of data) {
        const key = item[idField]
        const jsonData = JSON.stringify(item)
        
        const existing: any = db.prepare(`
          SELECT id FROM contents WHERE content_type = ? AND content_key = ?
        `).get(contentType, key)
        
        if (existing) {
          if (mode !== 'append') {
            db.prepare(`
              UPDATE contents SET draft_data = ?, updated_at = ?
              WHERE content_type = ? AND content_key = ?
            `).run(jsonData, now, contentType, key)
            updatedCount++
          }
        } else {
          // 计算排序值
          const maxOrder: any = db.prepare(`
            SELECT MAX(sort_order) as max FROM contents WHERE content_type = ?
          `).get(contentType)
          const sortOrder = (maxOrder?.max || 0) + 1
          
          db.prepare(`
            INSERT INTO contents (content_type, content_key, draft_data, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(contentType, key, jsonData, sortOrder, now, now)
          addedCount++
        }
      }
      
      // 自动发布
      if (autoPublish) {
        const keys = data.map(item => item[idField])
        for (const key of keys) {
          const content: any = db.prepare(`
            SELECT * FROM contents WHERE content_type = ? AND content_key = ?
          `).get(contentType, key)
          
          if (content && content.draft_data) {
            db.prepare(`
              INSERT INTO content_versions (content_id, version, data)
              VALUES (?, ?, ?)
            `).run(content.id, content.version, content.draft_data)
            
            db.prepare(`
              UPDATE contents SET 
                published_data = draft_data,
                status = 'published',
                version = version + 1,
                published_at = ?,
                updated_at = ?
              WHERE id = ?
            `).run(now, now, content.id)
          }
        }
      }
      
      // 记录导入日志
      db.prepare(`
        INSERT INTO import_logs (content_type, import_mode, file_name, total_count, added_count, updated_count, deleted_count, error_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(contentType, mode, fileName || '', data.length, addedCount, updatedCount, deletedCount, 0)
    })
    
    transaction()
    
    // 获取日志ID
    const log: any = db.prepare(`SELECT last_insert_rowid() as id`).get()
    
    return {
      success: true,
      addedCount,
      updatedCount,
      deletedCount,
      importLogId: log.id
    }
  },
  
  // 获取导入历史
  getImportLogs(contentType: string, limit: number = 20) {
    return db.prepare(`
      SELECT * FROM import_logs 
      WHERE content_type = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(contentType, limit)
  }
}
```

### 路由实现 (routes/content.ts)

```typescript
// server/src/routes/content.ts
import { Router } from 'express'
import { contentService } from '../services/contentService'

const router = Router()

// ========================================
// 前台 API
// ========================================

// 获取已发布列表
router.get('/:type/published', (req, res) => {
  try {
    const { type } = req.params
    const result = contentService.getPublishedList(type, {
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20,
      search: req.query.search as string,
      categoryId: req.query.categoryId as string,
      brand: req.query.brand as string,
      sortBy: req.query.sortBy as string
    })
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 获取单条已发布数据
router.get('/:type/:key/published', (req, res) => {
  try {
    const { type, key } = req.params
    const content = contentService.getOne(type, key)
    if (!content || !content.publishedData) {
      return res.status(404).json({ error: 'Not found' })
    }
    res.json(content.publishedData)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
```

### 后台路由 (routes/admin.ts)

```typescript
// server/src/routes/admin.ts
import { Router } from 'express'
import multer from 'multer'
import { contentService } from '../services/contentService'
import { importService } from '../services/importService'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// ========================================
// 内容管理
// ========================================

// 获取后台列表
router.get('/content/:type', (req, res) => {
  try {
    const { type } = req.params
    const result = contentService.getAdminList(type, {
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20
    })
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 获取单条详情
router.get('/content/:type/:key', (req, res) => {
  try {
    const { type, key } = req.params
    const content = contentService.getOne(type, key)
    if (!content) {
      return res.status(404).json({ error: 'Not found' })
    }
    res.json(content)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 获取版本历史
router.get('/content/:type/:key/versions', (req, res) => {
  try {
    const { type, key } = req.params
    const versions = contentService.getVersions(type, key)
    res.json(versions)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 保存草稿
router.put('/content/:type/:key/draft', (req, res) => {
  try {
    const { type, key } = req.params
    contentService.saveDraft(type, key, req.body)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 批量保存草稿
router.put('/content/:type/batch-draft', (req, res) => {
  try {
    const { type } = req.params
    const { items } = req.body
    contentService.batchSaveDraft(type, items)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 发布
router.post('/content/:type/:key/publish', (req, res) => {
  try {
    const { type, key } = req.params
    const version = contentService.publish(type, key)
    res.json({ success: true, version })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 批量发布
router.post('/content/:type/batch-publish', (req, res) => {
  try {
    const { type } = req.params
    const { keys } = req.body
    const count = contentService.batchPublish(type, keys)
    res.json({ success: true, publishedCount: count })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 回滚
router.post('/content/:type/:key/rollback', (req, res) => {
  try {
    const { type, key } = req.params
    const { version } = req.body
    contentService.rollback(type, key, version)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 删除
router.delete('/content/:type/:key', (req, res) => {
  try {
    const { type, key } = req.params
    contentService.delete(type, key)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// ========================================
// 导入管理
// ========================================

// 预览导入
router.post('/import/:type/preview', upload.single('file'), (req, res) => {
  try {
    const { type } = req.params
    const mode = req.body.mode as 'replace' | 'merge' | 'append'
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }
    
    const data = importService.parseExcel(req.file.buffer)
    const preview = importService.previewImport(type, data, mode)
    
    res.json(preview)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 执行导入
router.post('/import/:type/execute', (req, res) => {
  try {
    const { type } = req.params
    const { data, mode, autoPublish } = req.body
    
    const result = importService.executeImport(type, data, mode, autoPublish)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// 获取导入历史
router.get('/import/:type/logs', (req, res) => {
  try {
    const { type } = req.params
    const logs = importService.getImportLogs(type)
    res.json(logs)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
```

### 入口文件 (index.ts)

```typescript
// server/src/index.ts
import express from 'express'
import cors from 'cors'
import contentRouter from './routes/content'
import adminRouter from './routes/admin'

const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// 路由
app.use('/api/content', contentRouter)
app.use('/api/admin', adminRouter)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// 启动
app.listen(PORT, () => {
  console.log(`🚀 CMS API Server running on port ${PORT}`)
})
```


---

## 🌐 Nginx 配置

```nginx
# /etc/nginx/sites-available/biotech
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/biotech/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 前台 API 代理
    location /api/content {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 后台 API 代理（可添加认证）
    location /api/admin {
        # 可以在这里添加 Basic Auth 或其他认证
        # auth_basic "Admin Area";
        # auth_basic_user_file /etc/nginx/.htpasswd;
        
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # 上传文件大小限制
        client_max_body_size 10M;
    }

    # 健康检查
    location /api/health {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

---

## 📁 完整项目结构

```
biotech-official-website/
├── server/                           # 后端 (新增)
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                  # 入口
│   │   ├── db.ts                     # 数据库
│   │   ├── routes/
│   │   │   ├── content.ts            # 前台内容路由
│   │   │   └── admin.ts              # 后台管理路由
│   │   ├── services/
│   │   │   ├── contentService.ts     # 内容服务
│   │   │   └── importService.ts      # 导入服务
│   │   └── types.ts
│   └── data/
│       └── cms.db                    # SQLite 数据库
│
├── public/
│   └── data/                         # 静态 JSON (降级/备份)
│
├── src/
│   ├── api/                          # API 调用层 (新增)
│   │   └── contentApi.ts
│   ├── stores/
│   │   ├── productStore.ts           # 改造：支持后端分页
│   │   ├── brandStore.ts
│   │   ├── promotionStore.ts
│   │   ├── aboutStore.ts
│   │   ├── bannerStore.ts
│   │   ├── siteStore.ts
│   │   ├── adminStore.ts
│   │   └── adminContentStore.ts      # 新增：后台内容管理
│   ├── hooks/
│   │   └── usePagination.ts          # 保留：前端分页（小数据量）
│   ├── utils/
│   │   └── excelProcessor.ts         # 增强：导入预览
│   ├── components/
│   │   └── admin/
│   │       ├── ContentStatusBadge.vue
│   │       ├── ImportDialog.vue
│   │       └── VersionHistoryDialog.vue
│   └── views/
│       ├── admin/                    # 后台管理
│       │   ├── products/
│       │   ├── brands/
│       │   ├── promotions/
│       │   ├── banners/
│       │   ├── about/
│       │   └── site/
│       ├── products/                 # 前台产品
│       ├── brands/                   # 前台品牌
│       ├── promotions/               # 前台活动
│       ├── about/                    # 前台关于
│       └── home/                     # 首页
│
├── package.json
└── ...
```

---

## 📝 数据迁移脚本

```javascript
// server/scripts/migrate.js
const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const db = new Database(path.join(__dirname, '../data/cms.db'))

// 读取 JSON 文件
const readJson = (filename) => {
  const filepath = path.join(__dirname, '../../public/data', filename)
  if (!fs.existsSync(filepath)) {
    console.log(`⚠️ 文件不存在: ${filename}`)
    return []
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'))
}

console.log('开始迁移数据...\n')

// 通用迁移函数
const migrateContent = (contentType, data, idField = 'id') => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO contents (content_type, content_key, draft_data, published_data, status, version, sort_order)
    VALUES (?, ?, ?, ?, 'published', 1, ?)
  `)
  
  let count = 0
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    const key = String(item[idField])
    const json = JSON.stringify(item)
    stmt.run(contentType, key, json, json, i + 1)
    count++
  }
  return count
}

// 迁移产品
const products = readJson('products.json')
if (products.length > 0) {
  const count = migrateContent('product', products)
  console.log(`✅ 迁移了 ${count} 个产品`)
}

// 迁移品牌
const brands = readJson('brands.json')
if (brands.length > 0) {
  const count = migrateContent('brand', brands)
  console.log(`✅ 迁移了 ${count} 个品牌`)
}

// 迁移促销活动
const promotions = readJson('promotions.json')
if (promotions.length > 0) {
  const count = migrateContent('promotion', promotions)
  console.log(`✅ 迁移了 ${count} 个促销活动`)
}

// 迁移 Banner（按页面分组）
const banners = readJson('banners.json')
if (banners && typeof banners === 'object') {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO contents (content_type, content_key, draft_data, published_data, status, version)
    VALUES ('banner', ?, ?, ?, 'published', 1)
  `)
  
  let count = 0
  for (const [key, banner] of Object.entries(banners)) {
    const json = JSON.stringify(banner)
    stmt.run(key, json, json)
    count++
  }
  console.log(`✅ 迁移了 ${count} 个 Banner 配置`)
}

// 迁移关于我们
const about = readJson('about.json')
if (about && Object.keys(about).length > 0) {
  const json = JSON.stringify(about)
  db.prepare(`
    INSERT OR REPLACE INTO contents (content_type, content_key, draft_data, published_data, status, version)
    VALUES ('about', 'main', ?, ?, 'published', 1)
  `).run(json, json)
  console.log(`✅ 迁移了关于我们页面配置`)
}

// 迁移网站配置
const siteConfig = readJson('site-config.json')
if (siteConfig && Object.keys(siteConfig).length > 0) {
  const json = JSON.stringify(siteConfig)
  db.prepare(`
    INSERT OR REPLACE INTO contents (content_type, content_key, draft_data, published_data, status, version)
    VALUES ('site_config', 'main', ?, ?, 'published', 1)
  `).run(json, json)
  console.log(`✅ 迁移了网站配置`)
}

console.log('\n🎉 数据迁移完成！')
db.close()
```

---

## 🚀 部署流程

### 1. 服务器环境准备

```bash
# 安装 Node.js (推荐 v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx (如果没有)
sudo apt-get install -y nginx

# 安装 build-essential (better-sqlite3 需要)
sudo apt-get install -y build-essential python3
```

### 2. 部署后端

```bash
# 创建目录
sudo mkdir -p /var/www/biotech-api
cd /var/www/biotech-api

# 上传 server 目录内容
# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 创建数据目录
mkdir -p data

# 运行迁移脚本
node scripts/migrate.js

# 使用 PM2 启动
pm2 start dist/index.js --name biotech-api

# 设置开机自启
pm2 save
pm2 startup
```

### 3. 部署前端

```bash
# 本地构建
npm run build

# 上传 dist 目录到服务器
scp -r dist/* root@your-server:/var/www/biotech/dist/
```

### 4. 配置 Nginx

```bash
# 创建配置文件
sudo nano /etc/nginx/sites-available/biotech

# 粘贴上面的 Nginx 配置

# 启用站点
sudo ln -s /etc/nginx/sites-available/biotech /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```


---

## 🚀 实施路线图

### 第一阶段：后端开发 (4-5 天)

```
Day 1: 环境搭建
├── 创建 server 目录结构
├── 初始化 package.json
├── 配置 TypeScript
└── 实现 db.ts (数据库连接 + 表结构)

Day 2-3: 核心服务开发
├── contentService.ts
│   ├── 查询：getPublishedList, getAdminList, getOne, getVersions
│   ├── 写入：saveDraft, batchSaveDraft, delete
│   └── 发布：publish, batchPublish, rollback
└── importService.ts
    ├── parseExcel
    ├── validateProducts
    ├── previewImport
    └── executeImport

Day 4: 路由开发
├── routes/content.ts (前台 API)
└── routes/admin.ts (后台 API)

Day 5: 测试 + 部署
├── 本地测试所有 API
├── 上传到服务器
├── PM2 配置
└── Nginx 配置
```

### 第二阶段：前端改造 (5-6 天)

```
Day 6-7: API 层 + Store 改造
├── 创建 src/api/contentApi.ts
├── 改造 productStore.ts (后端分页)
├── 改造其他 Store (保持前端分页)
└── 创建 adminContentStore.ts

Day 8-9: 后台组件改造
├── ContentStatusBadge.vue (状态指示)
├── ImportDialog.vue (导入对话框)
├── VersionHistoryDialog.vue (版本历史)
└── 改造 UnifiedTableEditor.vue
    ├── 添加发布按钮
    ├── 添加状态显示
    └── 集成导入功能

Day 10-11: 页面改造
├── ProductsList.vue (产品管理)
├── BrandsList.vue (品牌管理)
├── PromotionsList.vue (活动管理)
├── BannerManagement.vue (横幅管理)
├── AboutContent.vue (关于我们)
└── SiteInfo/SiteContact.vue (网站配置)
```

### 第三阶段：数据迁移 + 测试 (2 天)

```
Day 12: 数据迁移
├── 运行迁移脚本
├── 验证数据完整性
└── 测试前台展示

Day 13: 全面测试
├── 后台 CRUD 测试
├── Excel 导入测试
├── 发布/回滚测试
└── 性能测试
```

**总计：约 13 天**

---

## 💰 成本

| 项目 | 费用 |
|-----|------|
| 阿里云轻量服务器 | 已有 |
| SQLite | 免费 |
| Node.js / PM2 / Nginx | 免费 |
| **总计** | **$0 额外成本** |

---

## ✅ 方案总结

### 核心设计

| 设计点 | 方案 | 优势 |
|-------|------|------|
| 数据状态 | 三级模型 (Local → Draft → Published) | 编辑灵活，发布可控 |
| 数据结构 | 去关联化 + JSON | 版本独立，Schema 灵活 |
| 数据库 | SQLite | 零配置，省内存，够用 |
| 后端 | Node.js + Express | 轻量，与前端技术栈统一 |
| 分页策略 | 混合分页 (产品后端分页，其他前端分页) | 性能与简洁平衡 |
| Excel导入 | 预览确认 + 三种模式 | 安全可控 |

### 资源占用估算

| 资源 | 预估占用 |
|-----|---------|
| SQLite 数据库 | ~10-50MB |
| Node.js 进程 | ~50-100MB |
| 剩余可用内存 | ~1.8GB |

2C2G 的配置完全够用。

---

## 📋 附录：各模块改造要点

### 产品管理 (ProductsList.vue)

**当前状态：**
- 使用 UnifiedTableEditor 组件
- 支持 Excel 导入
- 前端分页

**改造要点：**
1. 改用后端分页 API
2. 导入流程增加预览确认
3. 添加发布/草稿状态显示
4. 保存时调用 API 而非直接修改 store

### 品牌管理 (BrandsList.vue)

**当前状态：**
- 使用 UnifiedTableEditor 组件
- 支持分类切换（自主/代理）
- 支持排序

**改造要点：**
1. 保持前端分页（数据量小）
2. 添加发布/草稿状态显示
3. 排序变更后需要保存到后端

### 活动管理 (PromotionsList.vue)

**当前状态：**
- 使用 UnifiedTableEditor 组件
- 支持日期排序

**改造要点：**
1. 保持前端分页
2. 添加发布/草稿状态显示

### 横幅管理 (BannerManagement.vue)

**当前状态：**
- 自定义编辑界面
- 按页面分组

**改造要点：**
1. 保存时调用 API
2. 添加发布按钮

### 关于我们 (AboutContent.vue)

**当前状态：**
- 自定义编辑界面
- 单页面数据

**改造要点：**
1. 保存时调用 API
2. 添加发布按钮

### 网站配置 (SiteInfo/SiteContact.vue)

**当前状态：**
- 自定义编辑界面
- 全局配置

**改造要点：**
1. 保存时调用 API
2. 添加发布按钮

---

如有问题随时沟通！


---

## 🔍 深度解析：分页与导入的关键细节

### 分页策略深度分析

#### 为什么产品需要后端分页？

```
场景分析：
┌─────────────────────────────────────────────────────────────────┐
│  假设产品数量：2000 条                                           │
│  每条产品数据大小：约 500 字节                                    │
│  总数据量：2000 × 500 = 1MB                                      │
│                                                                 │
│  前端分页问题：                                                  │
│  1. 首次加载需要下载 1MB 数据 → 慢                               │
│  2. 浏览器需要存储 2000 条数据 → 内存占用                         │
│  3. 每次筛选都要遍历 2000 条 → CPU 占用                          │
│                                                                 │
│  后端分页优势：                                                  │
│  1. 每次只下载 12 条 × 500 字节 = 6KB → 快                       │
│  2. 浏览器只存储当前页数据 → 内存小                              │
│  3. 筛选在数据库完成 → 前端轻松                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 前端分页 vs 后端分页对比

| 特性 | 前端分页 | 后端分页 |
|-----|---------|---------|
| 首次加载 | 慢（全量数据） | 快（单页数据） |
| 翻页速度 | 极快（本地切片） | 稍慢（需请求） |
| 筛选响应 | 即时 | 需请求 |
| 内存占用 | 大 | 小 |
| 适用场景 | <500条 | >500条 |
| 实现复杂度 | 简单 | 中等 |

#### 你的项目推荐策略

| 内容类型 | 预估数量 | 推荐方案 | 理由 |
|---------|---------|---------|------|
| 产品 | 1000-5000 | **后端分页** | 数据量大，首屏性能重要 |
| 品牌 | 50-200 | 前端分页 | 数据量小，翻页体验好 |
| 活动 | 10-50 | 前端分页 | 数据量小 |
| 横幅 | 4 | 不分页 | 数据极少 |
| 配置 | 1 | 不分页 | 单条数据 |

### Excel 导入深度分析

#### 三种导入模式详解

```
┌─────────────────────────────────────────────────────────────────┐
│                     覆盖模式 (Replace)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  现有数据库：[A, B, C, D, E]                                     │
│  Excel 数据：[A', B', F, G]                                      │
│                                                                 │
│  执行结果：                                                      │
│  - A → A' (更新)                                                │
│  - B → B' (更新)                                                │
│  - C → 删除                                                     │
│  - D → 删除                                                     │
│  - E → 删除                                                     │
│  - F → 新增                                                     │
│  - G → 新增                                                     │
│                                                                 │
│  最终结果：[A', B', F, G]                                        │
│                                                                 │
│  ⚠️ 危险：会删除 Excel 中没有的数据！                            │
│  适用场景：数据重建、初始化导入                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     合并模式 (Merge)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  现有数据库：[A, B, C, D, E]                                     │
│  Excel 数据：[A', B', F, G]                                      │
│                                                                 │
│  执行结果：                                                      │
│  - A → A' (更新)                                                │
│  - B → B' (更新)                                                │
│  - C → 保留                                                     │
│  - D → 保留                                                     │
│  - E → 保留                                                     │
│  - F → 新增                                                     │
│  - G → 新增                                                     │
│                                                                 │
│  最终结果：[A', B', C, D, E, F, G]                               │
│                                                                 │
│  ✅ 安全：不会删除任何现有数据                                   │
│  适用场景：日常更新、部分修改                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     增量模式 (Append)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  现有数据库：[A, B, C, D, E]                                     │
│  Excel 数据：[A', B', F, G]                                      │
│                                                                 │
│  执行结果：                                                      │
│  - A' → 跳过 (ID已存在)                                         │
│  - B' → 跳过 (ID已存在)                                         │
│  - C → 保留                                                     │
│  - D → 保留                                                     │
│  - E → 保留                                                     │
│  - F → 新增                                                     │
│  - G → 新增                                                     │
│                                                                 │
│  最终结果：[A, B, C, D, E, F, G]                                 │
│                                                                 │
│  ✅ 最安全：只添加新数据，不修改任何现有数据                      │
│  适用场景：批量新增、追加数据                                    │
└─────────────────────────────────────────────────────────────────┘
```

#### 导入流程用户体验设计

```
用户操作流程：

1. 点击"导入"按钮
   ↓
2. 弹出导入对话框
   ↓
3. 选择导入模式（默认：合并模式）
   - 显示每种模式的说明
   - 覆盖模式显示警告标识
   ↓
4. 选择 Excel 文件
   ↓
5. 系统自动解析并预览
   - 显示：将新增 X 条
   - 显示：将更新 X 条
   - 显示：将删除 X 条（仅覆盖模式）
   - 显示：无变化 X 条
   - 显示：验证错误（红色，阻止导入）
   - 显示：验证警告（黄色，可继续）
   ↓
6. 用户确认
   - 可选：导入后自动发布
   ↓
7. 执行导入
   - 显示进度
   - 完成后显示结果统计
   ↓
8. 导入完成
   - 数据保存为草稿
   - 用户可以预览后再发布
```

#### ID 冲突处理策略

```typescript
// 产品 ID 生成策略
function generateProductId(existingProducts: Product[]): string {
  // 找到最大的数字 ID
  const maxNum = existingProducts.reduce((max, p) => {
    const match = p.id.match(/^P(\d+)$/)
    if (match) {
      return Math.max(max, parseInt(match[1]))
    }
    return max
  }, 0)
  
  // 生成新 ID
  return `P${maxNum + 1}`
}

// Excel 导入时的 ID 处理
function processImportedProducts(
  importedData: any[],
  existingProducts: Product[]
): any[] {
  const existingIds = new Set(existingProducts.map(p => p.id))
  let nextNum = existingProducts.reduce((max, p) => {
    const match = p.id.match(/^P(\d+)$/)
    return match ? Math.max(max, parseInt(match[1])) : max
  }, 0)
  
  return importedData.map(item => {
    // 如果没有 ID 或 ID 格式不对，自动生成
    if (!item.id || !/^P\d+$/.test(item.id)) {
      nextNum++
      return { ...item, id: `P${nextNum}` }
    }
    
    // 如果 ID 已存在且是增量模式，跳过
    // 这个逻辑在 previewImport 中处理
    
    return item
  })
}
```

### 后台管理界面改造建议

#### 统一的操作按钮布局

```
┌─────────────────────────────────────────────────────────────────┐
│  产品列表                                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [新增] [导入] [批量删除(3)]  |  搜索: [________] [🔍]       ││
│  │                              |  [保存草稿] [发布所有更改]   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ☑ │ ID    │ 名称   │ 品牌  │ 状态      │ 操作              ││
│  │───│───────│────────│───────│───────────│───────────────────││
│  │ ☐ │ P1001 │ 试剂A  │ 赛默飞│ ✅已发布   │ [编辑] [删除]     ││
│  │ ☑ │ P1002 │ 试剂B  │ 默克  │ ⚠️有更改   │ [编辑] [删除] [发布]││
│  │ ☐ │ P1003 │ 试剂C  │ 西格玛│ 📝草稿    │ [编辑] [删除] [发布]││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  分页: [<] 1 2 3 ... 10 [>]  每页: [12▼]  共 120 条             │
└─────────────────────────────────────────────────────────────────┘
```

#### 状态标识说明

| 状态 | 图标 | 颜色 | 说明 |
|-----|------|------|------|
| 已发布 | ✅ | 绿色 | 草稿与已发布一致 |
| 有更改 | ⚠️ | 橙色 | 草稿与已发布不一致，需要发布 |
| 草稿 | 📝 | 灰色 | 从未发布过 |
| 已删除 | 🗑️ | 红色 | 软删除状态 |

---

## 🔐 安全考虑

### 后台 API 认证

```typescript
// 简单的 API Key 认证中间件
const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key']
  
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  next()
}

// 应用到后台路由
app.use('/api/admin', adminAuth, adminRouter)
```

### 前端配置

```typescript
// src/api/contentApi.ts
const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY

// 后台请求添加认证头
const adminFetch = (url: string, options: RequestInit = {}) => {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-API-Key': ADMIN_API_KEY
    }
  })
}
```

### 环境变量配置

```bash
# server/.env
PORT=3000
ADMIN_API_KEY=your-secret-key-here

# 前端 .env.local
VITE_API_BASE=/api
VITE_ADMIN_API_KEY=your-secret-key-here
```

---

## 🧪 测试清单

### 后端 API 测试

```bash
# 健康检查
curl http://localhost:3000/api/health

# 获取已发布产品列表
curl "http://localhost:3000/api/content/product/published?page=1&pageSize=12"

# 获取后台产品列表（需要认证）
curl -H "X-API-Key: your-key" http://localhost:3000/api/admin/content/product

# 保存草稿
curl -X PUT -H "Content-Type: application/json" -H "X-API-Key: your-key" \
  -d '{"id":"P1001","name":"测试产品"}' \
  http://localhost:3000/api/admin/content/product/P1001/draft

# 发布
curl -X POST -H "X-API-Key: your-key" \
  http://localhost:3000/api/admin/content/product/P1001/publish
```

### 前端功能测试

- [ ] 产品列表分页正常
- [ ] 产品筛选正常
- [ ] 产品搜索正常
- [ ] 后台新增产品
- [ ] 后台编辑产品
- [ ] 后台删除产品
- [ ] Excel 导入预览
- [ ] Excel 导入执行
- [ ] 发布功能
- [ ] 回滚功能
- [ ] 版本历史查看

---

如有问题随时沟通！


---

## 🔧 架构修复记录 (2025-12-09)

### 发现的核心问题

在实施过程中发现了一个**架构设计缺陷**：后台管理页面错误地复用了前台 Store 来加载数据。

```
错误的数据流：
后台页面 → 前台 Store → 前台 API → 只返回 publishedData
                                    ↓
                              草稿数据丢失！
```

### 问题影响

| 场景 | 预期行为 | 实际行为（修复前） |
|-----|---------|------------------|
| 保存草稿后刷新页面 | 显示草稿数据 | ❌ 显示已发布数据 |
| 编辑-保存-稍后继续 | 能继续编辑草稿 | ❌ 草稿丢失 |

### 修复方案

**后台管理页面直接调用 Admin API，不经过前台 Store**

```typescript
// 修复后的数据加载模式
const loadAdminData = async () => {
  try {
    const result = await adminApi.getList('product', { pageSize: 9999 })
    localProducts.value = result.data.map(item => 
      item.draftData || item.publishedData  // 优先使用草稿数据
    )
  } catch (e) {
    // 降级到前台 Store
    await productStore.loadProducts()
    localProducts.value = [...productStore.products]
  }
}
```

### 修改的文件

1. `src/views/admin/products/ProductsList.vue`
2. `src/views/admin/brands/BrandsList.vue`
3. `src/views/admin/promotions/PromotionsList.vue`
4. `src/views/admin/banners/BannerManagement.vue`
5. `src/views/admin/site/SiteInfo.vue`
6. `src/views/admin/site/SiteContact.vue`

### 测试验证结果

| 模块 | 保存草稿 | 刷新保留草稿 | 发布 | 前台更新 |
|------|---------|-------------|------|---------|
| 产品列表 | ✅ | ✅ | ✅ | ✅ |
| 品牌列表 | ✅ | ✅ | ✅ | ✅ |
| 活动列表 | ✅ | ✅ | ✅ | ✅ |
| 横幅设置 | ✅ | ✅ | ✅ | ✅ |
| 网站配置 | ✅ | ✅ | ✅ | ✅ |
| 关于我们 | ✅ | ✅ | ✅ | ✅ |

### 最终架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     正确的数据流架构                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  前台展示页面                                                    │
│       │                                                         │
│       ▼                                                         │
│  前台 Store → 前台 API → publishedData                          │
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  后台管理页面                                                    │
│       │                                                         │
│       ▼                                                         │
│  Admin API → draftData || publishedData                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 系统状态

✅ **CMS 系统已完全修复，可正常使用**

详细测试记录见：`CMS发布功能测试记录.md`
架构修复总结见：`CMS架构修复总结.md`

