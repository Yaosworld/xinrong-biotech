# XRsimple 上线前检查单

这份清单只做一件事：确保你把已经在本地跑通的东西，稳稳地搬到服务器上。

## 1. 本地基线确认

- 代码已经提交到明确的 commit。
- 本地当前要上线的分支已经确定。
- `npm run build` 能通过。
- 后台可以正常登录。
- 后台可以修改文字内容并发布。
- 后台可以上传图片。
- 新上传图片会落到 `server/uploads/images/...`。
- 前台能正确读取发布后的文字和图片。
- 首页 Banner、产品分类图、活动图都已肉眼检查正常。

## 2. 数据与图片确认

- 生产主库以 `server/data/cms.db` 为准。
- 生产主图片目录以 `server/uploads` 为准。
- `public/images` 只当作静态默认素材，不再作为业务图片主存储。
- 已完成本地基线备份。
- 已完成大图优化，不再有明显的 3 MB 到 5 MB 级业务图准备直接上线。

## 3. 服务器准备

- 已有一台 Linux 云服务器，建议 Ubuntu 22.04 或更高版本。
- 已安装 Node.js 20 LTS。
- 已安装 Nginx。
- 已安装 PM2。
- 已安装 Git。
- 服务器安全组已放行 `22`、`80`，后续要上 HTTPS 时再放行 `443`。
- 域名已经解析到服务器公网 IP。

## 4. 生产目录规则确认

- 项目代码根目录：`/srv/xrsimple`
- 前端构建产物目录：`/srv/xrsimple/dist`
- 后端构建产物目录：`/srv/xrsimple/server/dist`
- 数据库文件：`/srv/xrsimple/server/data/cms.db`
- 上传目录：`/srv/xrsimple/server/uploads`
- 备份目录：`/srv/xrsimple/backups/daily`

## 5. 生产配置确认

- PM2 配置中的 `CMS_DB_PATH` 指向 `/srv/xrsimple/server/data/cms.db`
- PM2 配置中的 `UPLOAD_PATH` 指向 `/srv/xrsimple/server/uploads`
- PM2 配置中的 `PORT` 使用 `3000`
- PM2 配置中的 `JWT_SECRET` 已改成你自己的强随机字符串
- Nginx 已代理 `/api`
- Nginx 已映射 `/uploads`
- Nginx 前端根目录已指向 `/srv/xrsimple/dist`

## 6. 首次上线后验证

- `curl http://127.0.0.1:3000/api/health` 返回 `status: ok`
- 打开首页，Banner 正常显示
- 打开产品分类页，分类图正常显示
- 打开品牌或活动页，图片正常显示
- 打开后台，能登录
- 后台修改一条文字内容并发布，前台能看到更新
- 后台上传一张新图，文件实际落到 `/srv/xrsimple/server/uploads/...`
- 前台拿到的新图 URL 是 `/uploads/...`

## 7. 上线当天不要做的事

- 不要在服务器上临时改数据结构。
- 不要临时把图片主目录改回 `public/images`。
- 不要一边上线一边再做样式大改。
- 不要跳过数据库和上传目录备份。

## 8. 达标结论

如果上面都满足，就说明你现在已经具备上线条件了。  
这时候上线重点不再是“继续设计架构”，而是“按固定步骤部署、验证、备份”。
