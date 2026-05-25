# XRsimple 单机版数据与图片落地方案

这份方案基于当前项目的真实实现整理，目标是先满足你现在的体量和团队条件：

- 单台阿里云轻量服务器
- 后台可上传图片、修改文字内容
- 数据落本机数据库
- 前台读取数据库内容并实时响应发布结果
- 不强制引入 OSS、CDN、RDS

## 1. 当前项目现状

项目现在已经是“本地文件 + 文件数据库”的架构：

- 数据库：`server/data/cms.db`
- 数据库引擎：`sql.js`
- 上传目录：后端通过 `UPLOAD_PATH` 或默认 `server/uploads` 对外提供 `/uploads`
- 要特别区分：
  - 仓库里的实际文件目录：`server/uploads/images/...`
  - 浏览器访问 URL：`/uploads/images/...`
- 内容主表：`contents`
- 历史版本表：`content_versions`
- 后台图片元数据表：
  - `brand_images`
  - `promotion_images`
  - `avatar_images`
  - `site_images`
  - 以及其他图片表

也就是说，你现在想走的方向，本项目已经有基础，不需要推倒重来。

## 2. 推荐的生产落地原则

推荐采用下面这套原则：

1. 文字内容、发布数据、版本历史，全部进数据库。
2. 图片文件本体，全部存服务器目录，不进数据库二进制字段。
3. 数据库里保存图片的“引用信息”，例如图片 ID、相对路径、访问 URL。
4. 运行期上传图片统一走 `server/uploads`，不要继续依赖 `public/images` 作为生产主存储。
5. 备份时把“数据库文件 + uploads 目录”一起备份，二者缺一不可。

## 3. 推荐目录结构

服务器上建议统一成下面的结构：

```text
/srv/xrsimple/
├── client/
│   └── dist/                        # 前端构建产物
├── server/
│   ├── dist/                        # 后端编译产物
│   ├── data/
│   │   └── cms.db                   # 数据库文件
│   ├── uploads/                     # 运行期上传文件根目录
│   │   └── images/
│   │       ├── avatars/
│   │       ├── brands/
│   │       │   ├── logos/
│   │       │   └── certs/
│   │       ├── common/
│   │       ├── home/
│   │       ├── products/
│   │       ├── promotions/
│   │       │   ├── covers/
│   │       │   └── posters/
│   │       └── site/
│   └── logs/
└── backups/
    ├── daily/
    └── manual/
```

对应环境变量建议：

```bash
CMS_DB_PATH=/srv/xrsimple/server/data/cms.db
UPLOAD_PATH=/srv/xrsimple/server/uploads
PORT=3000
```

## 4. `public/images` 和 `uploads` 怎么分工

这是这类项目最容易混乱的地方，建议从现在开始明确：

- `public/images`
  - 只放“随代码发布的初始素材”
  - 例如占位图、默认 Logo、开发期演示图
- `server/uploads/images`
  - 放“后台运营实际会修改、替换、上传”的图片
  - 这是生产主目录

推荐你后续按这个目标收敛：

1. 首次部署时，把现在 `public/images` 中那些业务图片同步到服务器 `server/uploads/images`
2. 生产环境前台尽量都走 `/uploads/...`
3. `public/images` 以后只留少量静态保底资源

这样做的好处是：

- 图片更新不需要重新打前端包
- 数据和图片都在服务端，备份逻辑简单
- 后台运营换图后立即生效

## 5. 图片目录命名规则

建议目录只按“业务类别”分，不按日期分，不按用户分。你这个项目体量不大，简单最重要。

建议保持下面这套：

```text
server/uploads/images/avatars/
server/uploads/images/brands/logos/
server/uploads/images/brands/certs/
server/uploads/images/home/
server/uploads/images/products/
server/uploads/images/promotions/covers/
server/uploads/images/promotions/posters/
server/uploads/images/site/
server/uploads/images/common/
```

文件命名规则建议：

- 保留当前“原始中文名或英文名 + 自动去重后缀”的策略
- 不要让用户自己手输路径
- 文件名允许中文，但建议后台上传后统一清洗
- 同一目录内重名时自动追加 `-1`、`-2`

这和你当前上传服务的行为是一致的，改动成本最低。

## 6. 数据库字段怎么落

### 6.1 内容主表继续保留

`contents` 和 `content_versions` 这套不要动，继续作为内容中心：

- `draft_data`: 后台草稿
- `published_data`: 前台发布态
- `content_versions`: 每次发布或保存的重要历史

这套非常适合你这种“后台改内容，前台读发布态”的 CMS 模式。

### 6.2 图片元数据表继续保留

当前项目已经把图片按业务拆成多张表，这个方向可以继续用，不必急着合并成一张总表。

每张图片表建议至少保留这些字段：

```text
id
filename
original_name
path
is_uploaded
created_at
```

有图片类型的表，再加：

```text
image_type
```

如果你后面要增强运维能力，建议再补 3 个字段：

```text
file_size      INTEGER
mime_type      TEXT
checksum       TEXT
```

这 3 个字段不是必须，但很有价值：

- `file_size`：方便筛大图
- `mime_type`：方便校验
- `checksum`：方便去重、校验备份完整性

### 6.3 业务内容里如何引用图片

建议保持“图片 ID + URL”双存策略。

例如：

- 品牌内容：`logoId`、`certificateId`、`logo_url`、`certificate_url`
- 促销内容：`coverId`、`posterId`、`cover_url`、`poster_url`
- 管理员头像：`admins.avatar_id`
- 站点配置：Logo、二维码等继续保存图片路径字符串

推荐原则：

1. 内部关联优先用 `id`
2. 前端展示直接用 `url`
3. 发布时补齐 URL，避免前端自己拼路径

这样做的实际好处：

- 删除图片时可以反查引用
- 以后如果路径变了，可以批量修复 URL
- 前端拿到数据就能直接渲染

## 7. 我对你这个项目的具体建议

### 方案 A：现在就可用，最适合你当前阶段

这是我最推荐的方案：

1. 数据库继续用当前 `cms.db`
2. 图片继续存在服务器本地目录
3. 数据库存图片路径和图片 ID
4. 每天自动备份数据库和上传目录
5. 先把大图压缩掉，再考虑 CDN

适用场景：

- 内容量不大
- 图片量不大
- 团队只有一台轻量服务器
- 希望部署简单、成本可控

### 方案 B：中期升级

等你项目稳定后，再考虑：

1. 数据库从 `sql.js` 升级到 SQLite 原生驱动或 MySQL/PostgreSQL
2. 图片仍然先保留本地目录
3. 如果后期全国访问慢，再迁 OSS/CDN

这一步不是现在必须做，但数据库升级的优先级高于图片迁 OSS。

## 8. 备份策略

对你这个项目，最关键的备份对象只有两类：

1. 数据库文件：`cms.db`
2. 上传图片目录：`uploads/`

只备份其中一个都不够：

- 只有数据库，没有图片，页面会出现丢图
- 只有图片，没有数据库，后台内容和引用关系会丢

### 8.1 建议的备份频率

- 每天凌晨做 1 次自动备份
- 每次人工大改版、批量导入前做 1 次手动备份
- 至少保留最近 7 天日备份
- 至少保留最近 4 周周备份

### 8.2 建议的备份产物

每次备份生成两个文件：

```text
xrsimple-db-YYYYMMDD-HHMMSS.db
xrsimple-uploads-YYYYMMDD-HHMMSS.tar.gz
```

### 8.3 恢复策略

恢复时按顺序：

1. 停后端服务
2. 恢复 `cms.db`
3. 恢复 `uploads/`
4. 启动后端
5. 抽查后台和前台页面

## 9. 图片体积控制策略

你当前项目里已经有几张明显偏大的图，实际加载慢更像是“源图过大”，不是“必须上对象存储”。

建议立刻执行：

1. 首页 Banner 图控制在 300KB 到 800KB
2. 分类图尽量控制在 150KB 到 500KB
3. Logo / 证书类图通常控制在 50KB 到 300KB
4. 优先输出 WebP；实在不方便再保留 JPG/PNG
5. 后台上传限制继续保留 5MB，上线后最好降到 2MB 到 3MB

如果图片不多，这一步对体验的改善通常比“直接上 CDN”还明显。

## 10. 实施顺序

建议按下面顺序落地，不要一次改太多：

1. 先统一生产目录，明确 `cms.db` 和 `uploads/` 的位置
2. 把业务图片的主存储目标统一为 `uploads/images`
3. 配置自动备份
4. 压缩现有超大图片
5. 上线后观察 1 到 2 周
6. 如果数据库或访问量再上来，再讨论数据库升级或 CDN

## 11. 不建议你现在做的事

现阶段我不建议你优先投入下面这些：

1. 为了“小体量项目”先上对象存储
2. 为了“可能增长”先拆多服务
3. 为了“理论最佳实践”先改成云数据库
4. 大动干戈重写图片系统

你现在最需要的是：

- 目录规范
- 引用规范
- 备份规范
- 图片压缩规范

## 12. 一句话结论

对你当前这个项目，最稳妥、性价比最高的落地方案就是：

数据库继续先放单机服务器里的 `cms.db`，图片继续放单机服务器里的 `server/uploads/images`，数据库保存图片 ID 和路径，配套每日自动备份数据库与图片目录。

这套方案完全够你当前阶段使用，而且后续也方便平滑升级。
