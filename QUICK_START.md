# 项目快速启动指南

## 项目概述

这是一个基于规范驱动编程方法构建的移动端资讯平台。

**技术栈**:
- 前端: Vue 3 + TypeScript + Vite
- 后端: Node.js + Express + TypeScript
- 数据库: MongoDB + Redis

## 系统要求

- Node.js 18+
- npm 8+ 或 yarn
- MongoDB 5.0+
- Redis 6.0+
- 64-bit 操作系统

## 文件夹结构

```
Survey Corps/
├── frontend/                     # Vue 3 前端项目
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── README.md
├── backend/                      # Express 后端项目
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── IMPLEMENTATION_PLAN.md        # 详细实现方案（规范文档）
├── README.md                     # 项目说明
└── QUICK_START.md               # 本文件
```

## 初始化步骤

### 第 1 步: 安装数据库

#### MongoDB 安装

**Windows:**
```powershell
# 使用 Chocolatey
choco install mongodb-community

# 或者手动下载安装
# https://www.mongodb.com/try/download/community
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
```

**Linux:**
```bash
# Ubuntu
sudo apt-get install mongodb

# 或使用 Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

启动 MongoDB:
```bash
# Windows
mongod

# macOS/Linux
brew services start mongodb-community
# 或
mongod --dbpath /usr/local/var/mongodb
```

#### Redis 安装

**Windows:**
```powershell
# 使用 Chocolatey
choco install redis

# 或者使用 WSL2
wsl ubuntu
```

**macOS:**
```bash
brew install redis
```

**Linux:**
```bash
sudo apt-get install redis-server

# 或使用 Docker
docker run -d -p 6379:6379 --name redis redis:latest
```

启动 Redis:
```bash
# macOS
brew services start redis

# Linux
redis-server

# Windows (如果用 WSL)
wsl redis-server
```

### 第 2 步: 克隆或下载项目

项目已在 `D:\Survey Corps` 下

### 第 3 步: 配置后端环境

```bash
cd backend

# 复制环境变量文件
copy .env.example .env
# 或 macOS/Linux:
# cp .env.example .env

# 安装依赖
npm install

# 检查 .env 配置
# MONGODB_URI=mongodb://localhost:27017/news-app
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=your-secret-key-here
```

### 第 4 步: 配置前端环境

```bash
cd ../frontend

# 安装依赖
npm install

# 创建环境配置（可选）
# echo VITE_API_URL=http://localhost:3000/api > .env.local
# 或 macOS/Linux:
# echo "VITE_API_URL=http://localhost:3000/api" > .env.local
```

## 启动服务

### 方式一: 分别启动（推荐用于开发）

**终端 1 - 启动后端:**
```bash
cd backend
npm run dev
# 服务器运行在 http://localhost:3000
```

**终端 2 - 启动前端:**
```bash
cd frontend
npm run dev
# 应用运行在 http://localhost:5173
```

**访问应用:** http://localhost:5173

### 方式二: 生产构建

```bash
# 构建前端
cd frontend
npm run build

# 构建后端
cd ../backend
npm run build
npm start
```

## 首次使用

### 1. 注册账户

访问 http://localhost:5173/register
- 用户名: testuser
- 邮箱: test@example.com
- 密码: password123

### 2. 登录

使用刚才注册的账户登录

### 3. 发布内容

点击"发布"按钮，撰写并发布你的第一篇文章

### 4. 浏览 Feed

返回首页查看所有已发布的文章

## 数据库初始化

系统会在首次启动时自动创建数据库和集合。

**检查数据:**

```bash
# 连接 MongoDB
mongosh

# 选择数据库
use news-app

# 查看集合
show collections

# 查看用户
db.users.find()

# 查看文章
db.articles.find()
```

## 测试 API

### 使用 Postman 或 cURL

**1. 注册用户**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**2. 登录**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

**3. 获取 Feed**
```bash
curl -X GET "http://localhost:3000/api/feed?pageSize=20"
```

## 开发工具

### 推荐的编辑器扩展

**VS Code:**
- Volar (Vue 3 支持)
- TypeScript Vue Plugin
- Prettier - Code formatter
- ESLint

**浏览器:**
- Vue DevTools
- Redux DevTools

### 调试

**前端调试:**
1. 打开浏览器开发者工具 (F12)
2. 使用 Vue DevTools 查看组件和状态
3. 使用 Storage 查看 localStorage 和 IndexedDB

**后端调试:**
1. 查看控制台日志
2. 使用 MongoDB Compass 查看数据库
3. 使用 Redis Commander 查看缓存

## 常见问题

### Q: 连接数据库失败

**A:** 检查以下几点:
1. MongoDB 是否正在运行: `mongosh` 测试连接
2. Redis 是否正在运行: `redis-cli ping` 应该返回 PONG
3. `.env` 文件中的连接字符串是否正确

### Q: 前端无法连接到后端 API

**A:** 
1. 确保后端运行在 http://localhost:3000
2. 检查 CORS 配置是否允许 http://localhost:5173
3. 检查浏览器控制台是否有错误信息

### Q: 忘记密码

**A:** 当前版本没有密码重置功能。可以:
1. 注册新账户
2. 或直接删除数据库中的用户记录重新注册

### Q: 图片上传失败

**A:**
1. 确保上传文件大小 < 5MB
2. 确保文件格式是 JPG/PNG/WebP
3. 检查 `uploads/` 文件夹权限

### Q: 离线编辑不工作

**A:**
1. 检查浏览器是否支持 IndexedDB (所有现代浏览器都支持)
2. 打开开发者工具 → Application → IndexedDB 查看
3. 确保浏览器没有禁用本地存储

## 项目结构详解

### 后端文件结构

```
backend/src/
├── config/          # 数据库和 Redis 配置
├── models/          # MongoDB 数据模型
├── services/        # 业务逻辑服务
├── controllers/     # 请求处理（待实现）
├── routes/          # API 路由（待实现）
├── middleware/      # 中间件
├── utils/           # 工具函数
└── types/           # TypeScript 类型
```

### 前端文件结构

```
frontend/src/
├── pages/           # 页面组件
├── components/      # 可复用组件
├── stores/          # Pinia 状态管理
├── services/        # API 服务（待实现）
├── utils/           # 工具函数
├── router/          # 路由配置
├── types/           # TypeScript 类型
└── style.css        # 全局样式
```

## 性能目标

根据 IMPLEMENTATION_PLAN.md 定义的规范:

| 指标 | 目标 | 优化方案 |
|------|------|---------|
| LCP | < 2.5s | 首屏 20 条文章，CDN 图片，代码分割 |
| FCP | < 1.5s | 预加载关键 CSS，内联样式 |
| FPS | > 55fps | 虚拟滚动，避免重排，使用 contain |

## 下一步

1. 📖 阅读 [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) 了解详细的实现规范
2. 📚 查看 [backend/README.md](./backend/README.md) 了解后端 API 详情
3. 🎨 查看 [frontend/README.md](./frontend/README.md) 了解前端开发
4. 💻 开始开发新功能或完善现有功能

## 联系与支持

如有任何问题，请检查:
1. 项目文档
2. 代码注释
3. 规范文档 (IMPLEMENTATION_PLAN.md)

## 许可证

MIT

---

**祝开发愉快! 🚀**

