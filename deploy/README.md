# XRsimple 部署资料索引

这套部署资料已经按当前项目的真实运行方式整理过，核心前提是：

- 前端生产环境通过 `/api` 访问后端
- 上传图片生产环境通过 `/uploads` 访问
- 数据库主文件是 `server/data/cms.db`
- 运行期上传图片主目录是 `server/uploads`
- 后端启动时仍会读取 `public/data` 做内容引导，所以部署时不要删掉 `public/data`

## 推荐阅读顺序

1. [go-live-checklist.md](./go-live-checklist.md)
   上线前检查单，先确认本地闭环和服务器准备都到位。

2. [single-server-deploy.md](./single-server-deploy.md)
   单台阿里云轻量服务器的推荐部署步骤，适合你现在这套体量。

3. [storage-plan.md](./storage-plan.md)
   数据库位置、图片目录规则、发布流程、备份思路的背景方案。

## 配置样板

- [nginx.conf](./nginx.conf)
  当前项目可用的 Nginx 站点配置样板，已对齐 `/api` 和 `/uploads`。

- [ecosystem.config.cjs](./ecosystem.config.cjs)
  PM2 启动配置样板，已包含 `CMS_DB_PATH`、`UPLOAD_PATH`、`JWT_SECRET` 等环境变量位置。

## 备份与恢复

- [backup-cms.sh](./backup-cms.sh)
  备份数据库和上传目录。

- [restore-cms.sh](./restore-cms.sh)
  从备份恢复数据库和上传目录。

## 说明

- 当前阶段最推荐的生产结构是：整仓库部署到 `/srv/xrsimple`，数据库和上传目录继续落在 `/srv/xrsimple/server/...`。
- 这样做和你本地目录最一致，最适合当前小团队、单服务器、先求稳上线的场景。
- `deploy.sh` 仍可作为后续自动化参考，但本轮上线请优先按文档步骤执行。当前最重要的是把首发流程做稳定，而不是一开始就追求一键化。
