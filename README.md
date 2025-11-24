# 移动端资讯平台项目

基于规范驱动编程方法构建的简易移动端资讯平台。

## 项目结构

```
survey-corps/
├── frontend/                 # Vue 3 前端项目
├── backend/                  # Node.js 后端项目
├── IMPLEMENTATION_PLAN.md    # 详细实现方案文档
└── README.md                 # 项目说明
```

## 快速启动

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

访问 `http://localhost:5173`

### 后端启动

```bash
cd backend
npm install
npm run dev
```

API 服务运行在 `http://localhost:3000`

## 技术栈

- **前端**: Vue 3 + TypeScript + Vite + Pinia
- **后端**: Node.js + Express + TypeScript + MongoDB
- **缓存**: Redis
- **编辑器**: TipTap
- **虚拟滚动**: Virtual Scroller

## 核心功能

1. ✅ 用户认证（注册/登录/登出）
2. ✅ 富文本编辑与发布
3. ✅ 自动保存与离线支持
4. ✅ Feed 信息流
5. ✅ 性能优化（LCP < 2.5s, FPS > 55）

## 实现规范

所有功能均按照规范编号实现（如 SPEC-AUTH-001），详见 `IMPLEMENTATION_PLAN.md`

## 开发环境要求

- Node.js 18+
- npm 8+ 或 yarn
- MongoDB 5+
- Redis 6+

## 文档

- [实现方案文档](./IMPLEMENTATION_PLAN.md) - 详细的架构设计和规范定义
- 前端文档 (在 frontend 目录中)
- 后端文档 (在 backend 目录中)

