# 前端项目 - Vue 3 资讯平台

基于 Vue 3 + TypeScript + Vite 开发的移动端资讯应用。

## 项目结构

```
src/
├── main.ts                      # 应用入口
├── App.vue                      # 根组件
├── router/                      # 路由配置
│   └── index.ts
├── pages/                       # 页面组件
│   ├── Login.vue               # 登录页
│   ├── Register.vue            # 注册页
│   ├── Feed.vue                # 信息流
│   ├── Editor.vue              # 编辑器
│   ├── ArticleDetail.vue       # 文章详情
│   └── NotFound.vue            # 404 页
├── components/                 # 可复用组件（待实现）
│   ├── Editor.vue              # 编辑器组件
│   ├── ImageUpload.vue         # 图片上传
│   └── VirtualList.vue         # 虚拟滚动列表
├── stores/                     # Pinia 状态管理
│   ├── auth.ts                # 认证状态
│   ├── draft.ts               # 草稿状态
│   └── feed.ts                # Feed 状态（待实现）
├── services/                   # API 服务（待实现）
│   ├── auth.ts
│   ├── article.ts
│   ├── draft.ts
│   └── upload.ts
├── utils/                      # 工具函数
│   ├── api.ts                 # HTTP 客户端
│   ├── db.ts                  # IndexedDB 操作
│   ├── offline.ts             # 离线管理
│   ├── common.ts              # 通用工具
│   └── performance.ts         # 性能监测（待实现）
├── types/                      # TypeScript 类型
│   └── models.ts
└── style.css                   # 全局样式
```

## 快速启动

### 1. 安装依赖

```bash
npm install
# 或使用 yarn
yarn install
```

### 2. 开发模式

```bash
npm run dev
```

访问 `http://localhost:5173`

### 3. 构建生产版本

```bash
npm run build
npm run preview
```

## 环境变量

在项目根目录创建 `.env.local` 文件：

```env
VITE_API_URL=http://localhost:3000/api
```

## 主要功能

### 1. 用户认证
- ✅ 注册功能（用户名、邮箱、密码）
- ✅ 登录功能（记住用户信息）
- ✅ Token 管理（自动刷新）
- ✅ 登出功能

### 2. 文章发布编辑
- ✅ 基础编辑器（文字 + 图片）
- ✅ 图片上传预览
- ✅ 草稿自动保存（30s）
- ⏳ 富文本编辑器集成（TipTap）
- ⏳ 编辑历史功能

### 3. Feed 流展示
- ✅ 文章列表展示
- ✅ 分页加载
- ⏳ 虚拟滚动优化
- ⏳ 无限滚动加载

### 4. 离线支持
- ✅ IndexedDB 本地存储
- ✅ 离线编辑支持
- ✅ 网络恢复自动同步
- ⏳ 冲突解决机制

### 5. 性能优化
- ⏳ LCP 优化（目标 < 2.5s）
- ⏳ 虚拟滚动实现（55fps）
- ⏳ 图片懒加载
- ⏳ 代码分割

## 关键 API 集成

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `POST /api/auth/refresh` - 刷新 Token

### 文章相关
- `GET /api/articles/:id` - 获取文章详情
- `POST /api/articles` - 发布文章
- `PUT /api/articles/:id` - 编辑文章
- `DELETE /api/articles/:id` - 删除文章

### 草稿相关
- `GET /api/drafts/current` - 获取当前草稿
- `POST /api/drafts` - 保存草稿
- `DELETE /api/drafts/:id` - 删除草稿
- `POST /api/drafts/:id/publish` - 发布草稿

### Feed 相关
- `GET /api/feed` - 获取 Feed 列表

### 上传相关
- `POST /api/upload/image` - 上传图片

## 状态管理 (Pinia)

### Auth Store
```typescript
useAuthStore()
  - user: User | null
  - token: string | null
  - isAuthenticated: boolean
  - login(username, password)
  - register(username, email, password)
  - logout()
  - refreshToken()
```

### Draft Store
```typescript
useDraftStore()
  - currentDraft: Draft | null
  - isSaving: boolean
  - syncStatus: 'idle' | 'saving' | 'synced' | 'error'
  - saveDraft(content)
  - loadDraft(draftId?)
  - publishDraft(draftId?)
  - deleteDraft(draftId)
  - startAutoSave(interval)
```

## 离线支持

使用 IndexedDB 存储本地数据，支持：

1. **离线编辑**: 编辑的内容保存到 IndexedDB
2. **自动同步**: 网络恢复时自动上传修改
3. **冲突处理**: 自动比较时间戳解决冲突

## 性能目标

根据 IMPLEMENTATION_PLAN.md 的性能规范：

- **LCP (Largest Contentful Paint)**: < 2.5s
- **滚动帧率**: > 55fps
- **首屏加载**: 20 条文章
- **缓存策略**: 5 分钟过期

## 待实现功能

- [ ] 富文本编辑器（TipTap 集成）
- [ ] 虚拟滚动列表
- [ ] 性能监测（Web Vitals）
- [ ] 图片优化和懒加载
- [ ] Service Worker 支持
- [ ] 评论功能
- [ ] 点赞功能
- [ ] 用户关注
- [ ] 搜索功能

## 开发规范

- 所有功能按照 `IMPLEMENTATION_PLAN.md` 中的规范实现
- 使用 TypeScript 确保类型安全
- 遵循 Pinia 状态管理最佳实践
- 组件使用 Composition API
- 样式使用 CSS 变量和 scoped styles

## 调试

### 浏览器工具

- Vue DevTools: 调试状态管理和组件
- Redux DevTools: 用于 Pinia 的高级调试

### 本地存储查看

- IndexedDB: 打开浏览器开发者工具 → Application → IndexedDB

## 构建和部署

### 开发构建

```bash
npm run build
```

### 类型检查

```bash
npm run type-check
```

### 代码规范检查

```bash
npm run lint
```

## 依赖说明

- **Vue 3**: 现代前端框架
- **Vue Router**: 路由管理
- **Pinia**: 状态管理
- **Axios**: HTTP 客户端
- **TypeScript**: 类型安全
- **Vite**: 构建工具
- **TipTap**: 富文本编辑器
- **Dexie**: IndexedDB 包装
- **dayjs**: 日期处理

## 许可证

MIT

