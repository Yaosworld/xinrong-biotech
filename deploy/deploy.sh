#!/bin/bash

# ============================================
# 生物科技网站部署脚本
# ============================================

set -e

# 配置（请修改为你的服务器信息）
SERVER_USER="root"
SERVER_HOST="your-server-ip"
SERVER_PATH="/var/www"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  生物科技网站部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查参数
if [ "$1" == "" ]; then
    echo -e "${YELLOW}用法: ./deploy.sh [选项]${NC}"
    echo ""
    echo "选项:"
    echo "  all       - 完整部署（前端+后端+图片+数据库）"
    echo "  frontend  - 只部署前端（JS/CSS/HTML）"
    echo "  backend   - 只部署后端"
    echo "  images    - 只更新图片"
    echo "  db        - 只更新数据库"
    echo ""
    exit 1
fi

# 构建前端
build_frontend() {
    echo -e "${YELLOW}>>> 构建前端...${NC}"
    npm run build
    echo -e "${GREEN}前端构建完成${NC}"
}

# 构建后端
build_backend() {
    echo -e "${YELLOW}>>> 构建后端...${NC}"
    cd server
    npm run build
    cd ..
    echo -e "${GREEN}后端构建完成${NC}"
}

# 部署前端
deploy_frontend() {
    echo -e "${YELLOW}>>> 部署前端...${NC}"
    ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${SERVER_PATH}/biotech/dist"
    scp -r dist/index.html dist/assets ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/biotech/dist/
    echo -e "${GREEN}前端部署完成${NC}"
}

# 部署后端
deploy_backend() {
    echo -e "${YELLOW}>>> 部署后端...${NC}"
    ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${SERVER_PATH}/biotech-api/data"
    scp -r server/dist server/package.json ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/biotech-api/
    ssh ${SERVER_USER}@${SERVER_HOST} "cd ${SERVER_PATH}/biotech-api && npm install --production && pm2 restart biotech-api || pm2 start dist/index.js --name biotech-api"
    echo -e "${GREEN}后端部署完成${NC}"
}

# 部署图片
deploy_images() {
    echo -e "${YELLOW}>>> 部署图片...${NC}"
    ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${SERVER_PATH}/biotech/uploads"
    scp -r public/images ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/biotech/uploads/
    echo -e "${GREEN}图片部署完成${NC}"
}

# 部署数据库
deploy_db() {
    echo -e "${YELLOW}>>> 部署数据库...${NC}"
    ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${SERVER_PATH}/biotech-api/data"
    # 备份旧数据库
    ssh ${SERVER_USER}@${SERVER_HOST} "[ -f ${SERVER_PATH}/biotech-api/data/cms.db ] && cp ${SERVER_PATH}/biotech-api/data/cms.db ${SERVER_PATH}/biotech-api/data/cms.db.bak.\$(date +%Y%m%d%H%M%S) || true"
    scp server/data/cms.db ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/biotech-api/data/
    ssh ${SERVER_USER}@${SERVER_HOST} "pm2 restart biotech-api"
    echo -e "${GREEN}数据库部署完成${NC}"
}

# 执行部署
case "$1" in
    all)
        build_frontend
        build_backend
        deploy_frontend
        deploy_backend
        deploy_images
        deploy_db
        ;;
    frontend)
        build_frontend
        deploy_frontend
        ;;
    backend)
        build_backend
        deploy_backend
        ;;
    images)
        deploy_images
        ;;
    db)
        deploy_db
        ;;
    *)
        echo -e "${RED}未知选项: $1${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
