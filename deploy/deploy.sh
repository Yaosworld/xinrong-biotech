#!/bin/bash
# 部署脚本 - 在服务器上执行
# 使用方法: bash deploy.sh

set -e

echo "🚀 开始部署..."

# 配置
APP_DIR="/var/www/biotech"
API_DIR="/var/www/biotech-api"

# 1. 部署前端
echo "📦 部署前端..."
mkdir -p $APP_DIR/dist
# 前端文件需要先上传到服务器，或者在服务器上构建

# 2. 部署后端
echo "📦 部署后端..."
mkdir -p $API_DIR
cd $API_DIR

# 安装依赖
npm install --production

# 编译 TypeScript
npm run build

# 创建数据目录
mkdir -p data

# 3. 运行数据迁移（如果是首次部署）
if [ ! -f "data/cms.db" ]; then
    echo "📊 运行数据迁移..."
    node scripts/migrate.js
fi

# 4. 使用 PM2 管理进程
echo "🔄 重启服务..."
pm2 delete biotech-api 2>/dev/null || true
pm2 start dist/index.js --name biotech-api
pm2 save

# 5. 重载 Nginx
echo "🔄 重载 Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ 部署完成!"
echo "📍 前端: http://your-domain.com"
echo "📍 API: http://your-domain.com/api/health"
