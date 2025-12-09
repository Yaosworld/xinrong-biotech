# 部署指南

## 服务器要求

- 阿里云轻量应用服务器 (2C2G)
- Ubuntu 20.04+ 或 CentOS 7+
- Node.js 18+
- Nginx
- PM2

## 一、服务器环境准备

```bash
# 1. 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 安装 PM2
sudo npm install -g pm2

# 3. 安装 Nginx
sudo apt-get install -y nginx

# 4. 创建目录
sudo mkdir -p /var/www/biotech
sudo mkdir -p /var/www/biotech-api
sudo chown -R $USER:$USER /var/www/biotech
sudo chown -R $USER:$USER /var/www/biotech-api
```

## 二、本地构建

```bash
# 1. 构建前端
npm run build

# 2. 编译后端
cd server
npm run build
```

## 三、上传文件到服务器

```bash
# 上传前端构建产物
scp -r dist/* user@your-server:/var/www/biotech/dist/

# 上传后端代码
scp -r server/dist server/package.json server/scripts user@your-server:/var/www/biotech-api/

# 上传静态数据（用于迁移）
scp -r public/data user@your-server:/var/www/biotech-api/
```

## 四、服务器部署

```bash
# SSH 登录服务器
ssh user@your-server

# 1. 部署后端
cd /var/www/biotech-api
npm install --production
mkdir -p data

# 2. 运行数据迁移
node scripts/migrate.js

# 3. 启动后端服务
pm2 start dist/index.js --name biotech-api
pm2 save
pm2 startup  # 设置开机自启

# 4. 配置 Nginx
sudo cp /path/to/nginx.conf /etc/nginx/sites-available/biotech
sudo ln -s /etc/nginx/sites-available/biotech /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 五、验证部署

```bash
# 检查后端服务
curl http://localhost:3000/api/health

# 检查 Nginx 代理
curl http://your-domain.com/api/health

# 查看 PM2 状态
pm2 status
pm2 logs biotech-api
```

## 六、常用命令

```bash
# 查看日志
pm2 logs biotech-api

# 重启服务
pm2 restart biotech-api

# 停止服务
pm2 stop biotech-api

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 七、数据备份

```bash
# 备份数据库
cp /var/www/biotech-api/data/cms.db /backup/cms-$(date +%Y%m%d).db

# 定时备份（添加到 crontab）
0 2 * * * cp /var/www/biotech-api/data/cms.db /backup/cms-$(date +\%Y\%m\%d).db
```

## 目录结构

```
/var/www/
├── biotech/              # 前端
│   └── dist/             # Vue 构建产物
└── biotech-api/          # 后端
    ├── dist/             # TypeScript 编译产物
    ├── data/
    │   └── cms.db        # SQLite 数据库
    ├── scripts/
    │   └── migrate.js    # 迁移脚本
    └── package.json
```
