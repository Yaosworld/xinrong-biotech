# XRsimple 单机服务器部署步骤

这份步骤按你当前项目的真实情况来写，适合：

- 单台阿里云轻量服务器
- 一个前端 Vue 站点
- 一个 Node/Express 后端
- 一个 `sql.js` 文件数据库
- 一个本地上传目录

目标是把你本地已经验证好的版本，完整搬到服务器。

## 0. 总体原则

本次部署建议采用下面这套最稳的结构：

```text
/srv/xrsimple/
├── dist/                     # 前端构建产物
├── public/
│   └── data/                 # 后端启动引导仍会读取这里
├── deploy/
├── server/
│   ├── dist/
│   ├── data/
│   │   └── cms.db
│   └── uploads/
└── backups/
    └── daily/
```

这里最关键的两点：

1. 数据库和图片继续按当前项目目录落地，不另起新架构。
2. `public/data` 不能删，因为后端启动时会读取它做内容引导。

## 1. 本地准备

在你本地项目根目录执行：

```bash
git status
npm run build
```

确认没有问题后，把当前分支推到 GitHub：

```bash
git push origin fix-from-docs
```

如果你上线时使用的是别的分支，把命令里的分支名换掉。

## 2. 服务器环境准备

以 Ubuntu 为例：

```bash
sudo apt-get update
sudo apt-get install -y git nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

检查版本：

```bash
node -v
npm -v
pm2 -v
nginx -v
git --version
```

## 3. 拉代码到服务器

```bash
cd /srv
sudo mkdir -p /srv/xrsimple
sudo chown -R "$USER":"$USER" /srv/xrsimple
git clone <你的仓库地址> /srv/xrsimple
cd /srv/xrsimple
git checkout fix-from-docs
```

如果服务器上已经有仓库，更新时用：

```bash
cd /srv/xrsimple
git fetch --all
git checkout fix-from-docs
git pull origin fix-from-docs
```

## 4. 安装依赖并构建

在服务器执行：

```bash
cd /srv/xrsimple
npm ci
npm --prefix server ci
npm run build
```

## 5. 创建运行目录

```bash
mkdir -p /srv/xrsimple/server/data
mkdir -p /srv/xrsimple/server/uploads
mkdir -p /srv/xrsimple/backups/daily
```

## 6. 把本地验证好的数据库和上传目录搬到服务器

这是最关键的一步。  
代码可以从 GitHub 来，但数据和图片要以你本地已经验证好的版本为准。

在你本地电脑执行：

```bash
scp server/data/cms.db root@<你的服务器IP>:/srv/xrsimple/server/data/cms.db
scp -r server/uploads/* root@<你的服务器IP>:/srv/xrsimple/server/uploads/
```

如果你不是用 `root`，把用户名换成自己的服务器登录用户。

如果你担心覆盖，可以先在服务器上备份旧数据：

```bash
cp /srv/xrsimple/server/data/cms.db /srv/xrsimple/server/data/cms.db.bak.$(date +%Y%m%d-%H%M%S)
tar -czf /srv/xrsimple/backups/daily/uploads-predeploy-$(date +%Y%m%d-%H%M%S).tar.gz -C /srv/xrsimple/server/uploads .
```

## 7. 配置 PM2

项目里已经准备了样板文件：[ecosystem.config.cjs](./ecosystem.config.cjs)

先打开这个文件，把里面的 `JWT_SECRET` 改成你自己的强随机字符串。

然后在服务器执行：

```bash
cd /srv/xrsimple
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

常用命令：

```bash
pm2 status
pm2 logs xrsimple-server
pm2 restart xrsimple-server
```

先确认接口健康检查正常：

```bash
curl http://127.0.0.1:3000/api/health
```

## 8. 配置 Nginx

项目里已经准备了样板文件：[nginx.conf](./nginx.conf)

先把其中的 `server_name` 改成你的域名，然后在服务器执行：

```bash
sudo cp /srv/xrsimple/deploy/nginx.conf /etc/nginx/sites-available/xrsimple
sudo ln -sf /etc/nginx/sites-available/xrsimple /etc/nginx/sites-enabled/xrsimple
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 9. 首次上线验证

按这个顺序检查：

```bash
curl http://127.0.0.1:3000/api/health
curl http://<你的域名>/api/health
```

然后浏览器人工验证：

- 首页 Banner 是否正常
- 产品分类图是否正常
- 品牌图、活动图是否正常
- 后台是否能登录
- 后台发布一条文字后，前台是否更新
- 后台上传一张图后，前台是否能显示

最后到服务器上确认上传落点：

```bash
find /srv/xrsimple/server/uploads -type f | tail
```

## 10. 打开自动备份

项目里已经有：

- [backup-cms.sh](./backup-cms.sh)
- [restore-cms.sh](./restore-cms.sh)

建议给备份脚本执行权限：

```bash
chmod +x /srv/xrsimple/deploy/backup-cms.sh
chmod +x /srv/xrsimple/deploy/restore-cms.sh
```

然后加一个凌晨 3 点的定时任务：

```bash
crontab -e
```

加入这一行：

```cron
0 3 * * * APP_ROOT=/srv/xrsimple/server BACKUP_ROOT=/srv/xrsimple/backups/daily /srv/xrsimple/deploy/backup-cms.sh >> /var/log/xrsimple-backup.log 2>&1
```

## 11. 后续更新流程

后面每次发版，建议按这个顺序：

1. 本地改好并测试
2. 本地提交代码
3. 本地执行 `npm run build`
4. 推送到 GitHub
5. 服务器 `git pull`
6. 服务器执行 `npm ci`
7. 服务器执行 `npm --prefix server ci`
8. 服务器执行 `npm run build`
9. 如果这次改了本地数据库或上传内容，再单独同步 `server/data/cms.db` 和 `server/uploads`
10. 执行 `pm2 restart xrsimple-server`

## 12. HTTPS 可选补充

等 HTTP 验证没问题后，再做 HTTPS：

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <你的域名>
```

## 13. 最后提醒

当前阶段最稳的策略不是“把部署复杂化”，而是：

- 路径固定
- 备份固定
- 发布步骤固定
- 每次上线都先做一次小验证

你现在这套项目，完全可以先用这套单机方案稳定上线，后面如果访问量和图片量上来，再考虑把图片迁移到对象存储。
