# 移动端资讯产品实现方案文档

## 一、项目概述

### 1.1 项目名称
简易移动端资讯平台

### 1.2 技术栈
- **前端**: Vue 3 + TypeScript + Vite
- **后端**: Node.js + Express + TypeScript
- **数据库**: MongoDB + Redis
- **存储**: 对象存储服务（如 AWS S3 或本地）
- **实时同步**: WebSocket

### 1.3 核心特性
- 用户身份认证与授权
- 富文本编辑与发布
- 草稿自动保存与断网恢复
- Feed 流展示
- 性能优化（LCP < 2.5s，滚动帧率 > 55fps）

---

## 二、系统架构设计

### 2.1 整体架构

```
┌─────────────────┐
│   前端应用      │ (Vue 3 SPA)
│  ┌────────────┐ │
│  │ 页面层     │ │
│  ├────────────┤ │
│  │ 组件层     │ │
│  ├────────────┤ │
│  │ 业务逻辑层 │ │
│  ├────────────┤ │
│  │ 状态管理   │ │ (Pinia)
│  ├────────────┤ │
│  │ HTTP/WS    │ │
│  └────────────┘ │
└────────┬────────┘
         │
    ┌────▼─────┐
    │  API网关  │
    │+ 鉴权     │
    │+ 限流     │
    │+ 日志     │
    └────┬─────┘
         │
┌────────▼──────────────────────┐
│      后端服务层               │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │  认证服务 (Auth)         │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │  文章服务 (Article)      │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │  草稿服务 (Draft)        │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │  Feed 服务 (Feed)        │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │  文件上传服务 (Upload)   │ │
│ └──────────────────────────┘ │
└────────┬──────────────────────┘
         │
    ┌────┴────────────────────────┐
    │                             │
┌───▼───────┐   ┌────────────────▼────┐   ┌──────────┐
│ MongoDB   │   │ Redis 缓存           │   │ 文件存储 │
│ - 用户    │   │ - 会话               │   │          │
│ - 文章    │   │ - 草稿缓存           │   │          │
│ - 评论    │   │ - Feed 流缓存        │   │          │
└───────────┘   └──────────────────────┘   └──────────┘
```

### 2.2 分层设计

#### 前端分层
- **页面层**: 各个完整功能页面（登录、编辑、Feed 等）
- **组件层**: 可复用的 UI 组件
- **业务逻辑层**: 各模块的业务逻辑实现
- **状态管理层**: Pinia 管理全局状态
- **HTTP 层**: API 请求处理，拦截器配置

#### 后端分层
- **路由层**: Express 路由定义
- **控制层**: 请求处理、参数验证、异常捕获
- **服务层**: 核心业务逻辑
- **数据访问层**: 数据库操作、缓存管理
- **工具层**: 公共工具函数

---

## 三、功能模块规范

### 3.1 认证模块 (Auth Module)

#### 3.1.1 功能规范

**注册流程**
- 规范: SPEC-AUTH-001
- 接受: 用户名、邮箱、密码
- 验证: 
  - 用户名长度 3-20 字符，仅支持字母、数字、下划线
  - 邮箱格式校验
  - 密码长度 8-64 字符，需包含字母和数字
- 业务逻辑:
  - 检查用户名和邮箱唯一性
  - 密码使用 bcrypt 加盐加密
  - 创建用户记录
  - 返回 JWT token 和用户信息
- 返回: `{ token, refreshToken, user: { id, username, email } }`

**登录流程**
- 规范: SPEC-AUTH-002
- 接受: 用户名/邮箱 + 密码
- 验证:
  - 用户存在性检查
  - 密码正确性校验
- 业务逻辑:
  - 生成 JWT token（有效期 7 天）
  - 生成 refresh token（有效期 30 天）
  - 存储 token 到 Redis（用于黑名单控制）
  - 记录登录日志
- 返回: `{ token, refreshToken, user }`

**登出流程**
- 规范: SPEC-AUTH-003
- 业务逻辑:
  - 将 token 加入黑名单（Redis）
  - 清理 session
- 返回: `{ success: true }`

**Token 刷新**
- 规范: SPEC-AUTH-004
- 接受: 过期的 access token + refresh token
- 验证: refresh token 有效性
- 返回: 新的 access token

#### 3.1.2 数据模型

**User Schema**
```
{
  _id: ObjectId
  username: String (unique, index)
  email: String (unique, index)
  passwordHash: String
  avatar: String (default: null)
  bio: String (default: "")
  createdAt: Date (index)
  updatedAt: Date
  lastLoginAt: Date
  isActive: Boolean (default: true)
}
```

---

### 3.2 文章发布模块 (Article Module)

#### 3.2.1 功能规范

**文章发布**
- 规范: SPEC-ARTICLE-001
- 接受: 标题、内容（富文本）、图片列表、标签
- 验证:
  - 标题长度 1-100 字符
  - 内容长度 1-10000 字符
  - 内容不为空
  - 图片数量 ≤ 9 张
  - 图片大小 ≤ 5MB / 张
- 业务逻辑:
  - 创建文章记录
  - 处理图片上传（存储、生成 CDN 链接）
  - 提取文章摘要（前 100 字符）
  - 创建文章索引（用于搜索）
  - 缓存文章到 Redis
  - 发送创建成功事件（WebSocket）
- 返回: `{ articleId, title, content, images, createdAt }`

**文章编辑**
- 规范: SPEC-ARTICLE-002
- 接受: 文章 ID + 更新字段（标题、内容、图片）
- 验证:
  - 文章存在性检查
  - 用户权限检查（仅作者可编辑）
  - 同上发布验证规则
- 业务逻辑:
  - 更新文章记录
  - 处理新增/删除的图片
  - 更新缓存
  - 记录编辑历史（可选）
- 返回: `{ articleId, updatedFields, updatedAt }`

**文章删除**
- 规范: SPEC-ARTICLE-003
- 业务逻辑:
  - 权限验证
  - 软删除（标记 isDeleted = true）
  - 清除缓存
  - 删除关联图片

**文章详情查询**
- 规范: SPEC-ARTICLE-004
- 业务逻辑:
  - 先查 Redis 缓存
  - 若无则查数据库
  - 增加浏览计数
  - 缓存 10 分钟
- 返回: 完整文章内容 + 作者信息 + 统计数据

#### 3.2.2 数据模型

**Article Schema**
```
{
  _id: ObjectId
  authorId: ObjectId (ref: User, index)
  title: String (required, index)
  content: String (required) // HTML格式
  images: [{
    url: String
    uploadedAt: Date
  }]
  tags: [String]
  summary: String // 摘要
  viewCount: Number (default: 0)
  createdAt: Date (index)
  updatedAt: Date (index)
  isDeleted: Boolean (default: false, index)
  source: String (enum: ['web', 'mobile']) // 发布来源
}
```

**Edit History (可选)**
```
{
  _id: ObjectId
  articleId: ObjectId (ref: Article)
  previousContent: String
  currentContent: String
  editedAt: Date
  editedBy: ObjectId
}
```

---

### 3.3 草稿管理模块 (Draft Module)

#### 3.3.1 功能规范

**保存草稿**
- 规范: SPEC-DRAFT-001
- 触发机制: 自动（每 30s）或手动保存
- 接受: 用户 ID、标题、内容、图片列表、关联文章 ID（若有）
- 验证: 基础内容验证
- 业务逻辑:
  - 查询是否存在未发布的草稿
  - 若存在则更新，否则创建新草稿
  - 存储到 MongoDB（持久化）
  - 同时存储到 Redis（快速读取，过期时间 7 天）
  - 记录保存时间戳
- 返回: `{ draftId, savedAt, syncStatus: 'success' }`

**获取草稿**
- 规范: SPEC-DRAFT-002
- 业务逻辑:
  - 先查 Redis（快速路径）
  - 若无则查数据库
  - 返回最新的一份草稿
- 返回: `{ draftId, title, content, images, lastSavedAt }`

**删除草稿**
- 规范: SPEC-DRAFT-003
- 业务逻辑:
  - 删除 MongoDB 记录
  - 清除 Redis 缓存

**草稿发布**
- 规范: SPEC-DRAFT-004
- 业务逻辑:
  - 将草稿内容转换为文章
  - 创建新的 Article 记录
  - 删除草稿
- 返回: `{ articleId, ...articleData }`

#### 3.3.2 离线支持规范

**离线写入**
- 规范: SPEC-DRAFT-OFFLINE-001
- 机制:
  - 使用 IndexedDB 存储本地编辑内容
  - 编辑内容自动保存到 IndexedDB（实时）
  - 显示离线编辑指示符

**离线恢复**
- 规范: SPEC-DRAFT-OFFLINE-002
- 触发: 网络恢复时
- 机制:
  - 检测网络恢复事件
  - 比较 IndexedDB 和服务器数据的时间戳
  - 若本地更新，自动同步（POST /api/drafts/sync）
  - 若冲突，提示用户选择版本

#### 3.3.3 数据模型

**Draft Schema**
```
{
  _id: ObjectId
  userId: ObjectId (ref: User, index)
  articleId: ObjectId (ref: Article, nullable) // 若编辑的是已发布文章
  title: String
  content: String
  images: [{
    url: String,
    isLocalPreview: Boolean // true 表示本地预览图
  }]
  lastSavedAt: Date (index)
  lastEditedAt: Date // 客户端最后编辑时间
  status: String (enum: ['editing', 'saving', 'synced'], default: 'editing')
  localChecksum: String // 用于检测冲突
}
```

**IndexedDB Schema (客户端)**
```
{
  draftId: string
  userId: string
  title: string
  content: string
  images: [{
    url: string,
    isLocalPreview: boolean,
    blob?: Blob // 本地图片 blob
  }]
  lastEditedAt: timestamp
  offlineOnly: boolean
}
```

---

### 3.4 内容编辑器模块 (Editor Module)

#### 3.4.1 功能规范

**编辑器需求**
- 规范: SPEC-EDITOR-001
- 功能:
  - 富文本编辑（支持加粗、斜体、下划线、颜色、对齐等）
  - 图片插入（本地上传、网络图片 URL）
  - 链接插入
  - 列表（有序/无序）
  - 标题级别（H1-H6）
  - 代码块
  - 撤销/重做
  - 自动保存提示

**图片上传流程**
- 规范: SPEC-EDITOR-IMAGE-001
- 验证:
  - 文件类型: jpg, jpeg, png, webp
  - 文件大小: 100KB - 5MB
- 处理流程:
  1. 本地压缩（质量 80%）
  2. 生成预览 URL（blob）
  3. 异步上传到服务器
  4. 上传成功后替换预览 URL 为 CDN 链接
  5. 上传进度显示
- 返回: `{ imageUrl, thumbnailUrl }`

**自动保存机制**
- 规范: SPEC-EDITOR-AUTOSAVE-001
- 流程:
  1. 用户输入触发 debounce（500ms）
  2. 防止重复保存（checksum 比较）
  3. 后台发送保存请求（不阻塞 UI）
  4. 保存成功显示"已保存"提示
  5. 保存失败显示"保存失败，将稍后重试"
  6. 断网时使用 IndexedDB 缓存

#### 3.4.2 性能优化

**编辑器性能**
- 规范: SPEC-EDITOR-PERF-001
- 优化策略:
  - 内容操作使用虚拟滚动（若内容极长）
  - 编辑器使用 contentEditable 或成熟库（如 TipTap）
  - 图片加载使用懒加载
  - 撤销/重做栈限制 50 步

---

### 3.5 Feed 流模块 (Feed Module)

#### 3.5.1 功能规范

**Feed 列表获取**
- 规范: SPEC-FEED-001
- 接受参数:
  - `page`: 页码（从 1 开始）
  - `pageSize`: 每页数量（默认 20，最大 50）
  - `sortBy`: 排序方式（'time' 或 'popularity'）
  - `lastId`: 用于游标分页（推荐）
  - `cursor`: 最后一个文章的时间戳
- 验证:
  - pageSize 不超过 50
  - cursor 有效性检查
- 业务逻辑:
  - 分页查询（数据库 + 缓存策略）
  - 按发布时间倒序
  - 只返回非删除的文章
  - 补充作者信息
  - 应用缓存优化
- 返回:
```json
{
  "articles": [
    {
      "id": "...",
      "title": "...",
      "summary": "...",
      "images": [...],
      "author": {
        "id": "...",
        "username": "...",
        "avatar": "..."
      },
      "viewCount": 123,
      "createdAt": "...",
      "lastImageUrl": "..." // 用于列表缩略图
    }
  ],
  "hasMore": true,
  "nextCursor": "..."
}
```

**Feed 缓存策略**
- 规范: SPEC-FEED-CACHE-001
- 策略:
  - 一级缓存: Redis（热数据，保留最近 1000 条）
  - 二级缓存: CDN（分钟级别）
  - 缓存更新: 新文章发布时主动更新
  - 缓存失效: 基于 LRU 或 TTL（5 分钟）

**性能指标**
- 规范: SPEC-FEED-PERF-001
- LCP (Largest Contentful Paint):
  - 目标: < 2.5s
  - 优化:
    - 首屏加载 20 条文章（服务端分页）
    - 预加载关键 CSS
    - 图片懒加载
    - 服务端预留字段（summary, lastImageUrl）
- 滚动帧率:
  - 目标: > 55fps
  - 优化:
    - 虚拟滚动列表（只渲染可见项）
    - 图片渐进式加载
    - 防抖/节流加载
    - 避免重排（使用 contain: layout）

#### 3.5.2 数据模型

**Feed Item** (从 Article 组装)
```
ArticleId, Title, Summary, LastImageUrl, 
Author(Id, Username, Avatar), 
ViewCount, CreatedAt
```

**缓存 Key 设计**
```
feed:list:{sortBy}:{pageNumber} - 列表缓存
feed:article:{articleId} - 文章缓存
feed:user:{userId}:articles - 用户文章列表
```

---

### 3.6 内容详情页模块 (Article Detail Module)

#### 3.6.1 功能规范

**详情页获取**
- 规范: SPEC-DETAIL-001
- 接受: 文章 ID
- 业务逻辑:
  - 查询文章完整信息
  - 获取作者信息
  - 增加浏览计数（使用 Redis 缓存计数，定期写入数据库）
  - 应用缓存
- 返回:
```json
{
  "id": "...",
  "title": "...",
  "content": "...",
  "images": [...],
  "author": {
    "id": "...",
    "username": "...",
    "avatar": "...",
    "bio": "..."
  },
  "createdAt": "...",
  "updatedAt": "...",
  "viewCount": 123,
  "tags": [...]
}
```

**性能优化**
- 规范: SPEC-DETAIL-PERF-001
- 优化:
  - 缓存 10 分钟
  - 图片使用 CDN
  - 内容分块加载（若内容很长）
  - 预加载下一篇文章（异步）

---

## 四、数据库设计

### 4.1 MongoDB 集合设计

**Collections:**
1. `users` - 用户信息
2. `articles` - 文章内容
3. `drafts` - 草稿
4. `editHistories` - 编辑历史（可选）

### 4.2 索引策略

```
users:
  - { username: 1 }
  - { email: 1 }
  - { createdAt: -1 }

articles:
  - { authorId: 1, createdAt: -1 }
  - { createdAt: -1 } (用于 Feed)
  - { isDeleted: 1, createdAt: -1 }
  - { title: 'text', content: 'text' } (全文搜索)

drafts:
  - { userId: 1, lastSavedAt: -1 }
```

### 4.3 Redis 键设计

```
# 会话相关
session:{sessionId} - 用户会话
token:blacklist:{token} - 退登黑名单

# 缓存相关
cache:article:{articleId} - 文章缓存
cache:feed:list:{sortBy}:{page} - Feed 列表缓存
cache:user:{userId}:articles - 用户文章列表

# 草稿相关
draft:{userId}:current - 当前编辑草稿
draft:{draftId} - 草稿详情

# 计数相关
counter:article:{articleId}:views - 浏览计数
counter:user:{userId}:followers - 粉丝数 (扩展功能)

# 排队相关
queue:image:upload - 图片上传队列
```

---

## 五、API 设计规范

### 5.1 请求/响应格式

**统一响应格式**
```json
{
  "code": 0,
  "message": "success",
  "data": {...}
}
```

错误响应:
```json
{
  "code": 4001,
  "message": "User not found",
  "timestamp": "2025-11-15T10:00:00Z"
}
```

### 5.2 API 端点列表

#### 认证相关
| 方法 | 端点 | 规范 | 描述 |
|------|------|------|------|
| POST | `/api/auth/register` | SPEC-AUTH-001 | 用户注册 |
| POST | `/api/auth/login` | SPEC-AUTH-002 | 用户登录 |
| POST | `/api/auth/logout` | SPEC-AUTH-003 | 用户登出 |
| POST | `/api/auth/refresh` | SPEC-AUTH-004 | 刷新 token |

#### 文章相关
| 方法 | 端点 | 规范 | 描述 |
|------|------|------|------|
| POST | `/api/articles` | SPEC-ARTICLE-001 | 发布文章 |
| PUT | `/api/articles/{id}` | SPEC-ARTICLE-002 | 编辑文章 |
| DELETE | `/api/articles/{id}` | SPEC-ARTICLE-003 | 删除文章 |
| GET | `/api/articles/{id}` | SPEC-ARTICLE-004 | 获取文章详情 |

#### 草稿相关
| 方法 | 端点 | 规范 | 描述 |
|------|------|------|------|
| POST | `/api/drafts` | SPEC-DRAFT-001 | 保存草稿 |
| GET | `/api/drafts/current` | SPEC-DRAFT-002 | 获取当前草稿 |
| DELETE | `/api/drafts/{id}` | SPEC-DRAFT-003 | 删除草稿 |
| POST | `/api/drafts/{id}/publish` | SPEC-DRAFT-004 | 发布草稿 |
| POST | `/api/drafts/sync` | SPEC-DRAFT-OFFLINE-002 | 离线同步 |

#### Feed 相关
| 方法 | 端点 | 规范 | 描述 |
|------|------|------|------|
| GET | `/api/feed` | SPEC-FEED-001 | 获取 Feed 列表 |

#### 上传相关
| 方法 | 端点 | 规范 | 描述 |
|------|------|------|------|
| POST | `/api/upload/image` | SPEC-EDITOR-IMAGE-001 | 上传图片 |

---

## 六、前端架构设计

### 6.1 项目结构

```
src/
├── pages/                    # 页面组件
│   ├── Login.vue
│   ├── Register.vue
│   ├── Editor.vue           # 编辑/发布页
│   ├── Feed.vue             # 信息流
│   └── ArticleDetail.vue    # 文章详情
├── components/              # 可复用组件
│   ├── Editor.vue           # 编辑器组件
│   ├── ImageUpload.vue      # 图片上传
│   ├── FeedItem.vue         # Feed 项
│   ├── VirtualList.vue      # 虚拟列表
│   └── ...
├── stores/                  # Pinia 状态管理
│   ├── auth.ts
│   ├── article.ts
│   ├── draft.ts
│   └── feed.ts
├── services/                # API 服务层
│   ├── auth.ts
│   ├── article.ts
│   ├── draft.ts
│   ├── upload.ts
│   └── feed.ts
├── utils/                   # 工具函数
│   ├── api.ts               # HTTP 客户端
│   ├── db.ts                # IndexedDB 操作
│   ├── image.ts             # 图片处理
│   ├── offline.ts           # 离线管理
│   └── performance.ts       # 性能监测
├── types/                   # TypeScript 类型
│   ├── api.ts
│   ├── models.ts
│   └── ...
├── App.vue
└── main.ts
```

### 6.2 状态管理规范

**Auth Store (Pinia)**
```typescript
State:
  - user: User | null
  - token: string | null
  - refreshToken: string | null
  - isAuthenticated: boolean
  - isLoading: boolean

Getters:
  - currentUser
  - isLoggedIn

Actions:
  - register(username, email, password)
  - login(username, password)
  - logout()
  - refreshToken()
```

**Draft Store**
```typescript
State:
  - currentDraft: Draft | null
  - drafts: Draft[]
  - isSaving: boolean
  - syncStatus: 'idle' | 'saving' | 'syncing' | 'error'

Actions:
  - loadDraft(draftId?)
  - saveDraft(content)
  - publishDraft(draftId)
  - syncLocalDrafts()
```

**Feed Store**
```typescript
State:
  - articles: Article[]
  - isLoading: boolean
  - hasMore: boolean
  - nextCursor: string | null
  - sortBy: 'time' | 'popularity'

Actions:
  - fetchFeed(cursor?)
  - loadMore()
  - setSortBy(sortBy)
```

### 6.3 HTTP 客户端规范

**特性:**
- 请求拦截器：自动附加 token
- 响应拦截器：统一错误处理、token 刷新
- 请求超时：10s
- 重试机制：503/网络错误自动重试 3 次

### 6.4 离线支持规范

**IndexedDB 数据库**
```typescript
Database: 'news-app-db'
Version: 1

Stores:
  - drafts
  - syncQueue
  - cache
```

**同步策略**
```typescript
// 监听网络状态
window.addEventListener('online', syncOfflineData)
window.addEventListener('offline', switchToOfflineMode)

// 同步流程
if (navigator.onLine) {
  - 读取 IndexedDB 中的待同步数据
  - 比较时间戳判断冲突
  - 上传修改
  - 清除 IndexedDB 队列
}
```

---

## 七、性能优化方案

### 7.1 LCP 优化 (目标 < 2.5s)

#### 后端优化
- **SPEC-PERF-BACKEND-001**: 数据库查询优化
  - 使用合适的索引
  - N+1 查询优化（populate 聚合）
  - 缓存预热（最近 100 条文章）
  
- **SPEC-PERF-BACKEND-002**: 响应体优化
  - 分页首屏返回 20 条
  - 返回必要字段（summary, lastImageUrl）
  - 图片返回 CDN 链接（已压缩）

- **SPEC-PERF-BACKEND-003**: CDN 部署
  - 静态资源 CDN 分发
  - 图片开启 WebP 支持
  - 设置合适的缓存头

#### 前端优化
- **SPEC-PERF-FRONTEND-001**: 关键路径优化
  - 预加载关键 CSS
  - 异步加载非关键 JS
  - 内联关键样式
  
- **SPEC-PERF-FRONTEND-002**: 图片优化
  - 使用 WebP 格式（支持 JPEG 回退）
  - 设置图片尺寸（避免 CLS）
  - 懒加载非首屏图片
  - 缩略图使用低质量占位图 (LQIP)
  
- **SPEC-PERF-FRONTEND-003**: 代码分割
  - 页面级别代码分割
  - 按需加载编辑器库
  - 动态导入重型依赖

- **SPEC-PERF-FRONTEND-004**: 缓存策略
  - Service Worker 缓存静态资源
  - 浏览器缓存 Feed 数据
  - IndexedDB 缓存草稿

### 7.2 滚动帧率优化 (目标 > 55fps)

#### 前端优化
- **SPEC-PERF-SCROLL-001**: 虚拟滚动
  - 使用虚拟滚动列表组件
  - 只渲染可见的 20-30 项
  - 缓冲区大小 5-10 项
  
- **SPEC-PERF-SCROLL-002**: 渲染优化
  - 使用 `contain: layout` CSS 属性
  - 避免同步重排（改造 DOM）
  - 使用 `translate3d` 替代 `top`
  
- **SPEC-PERF-SCROLL-003**: 图片加载
  - 渐进式加载（先加载缩略图）
  - 图片加载完成前显示占位符
  - 限制同时加载的图片数（最多 3 张）
  
- **SPEC-PERF-SCROLL-004**: 事件优化
  - 节流滚动事件（50ms）
  - 使用 Intersection Observer 检测可见元素
  - 异步加载数据

#### 监测指标
- **SPEC-PERF-MONITOR-001**: 性能监测
  - 使用 Performance API 统计 LCP、FCP
  - 使用 PerformanceObserver 监测 CLS
  - Web Vitals 集成
  - 上报关键指标到分析服务

---

## 八、安全规范

### 8.1 认证与授权

- **SPEC-SEC-001**: 密码存储
  - 使用 bcrypt 加盐加密（至少 10 轮）
  - 从不以明文存储密码
  
- **SPEC-SEC-002**: Token 管理
  - JWT 中包含 user id, email（不包含密码）
  - Access Token 有效期 7 天
  - Refresh Token 有效期 30 天
  - Token 黑名单（Redis）保留 7 天

- **SPEC-SEC-003**: 权限控制
  - 编辑/删除文章只能本人操作
  - 编辑/删除草稿只能本人操作
  - 使用 middleware 验证权限

### 8.2 数据安全

- **SPEC-SEC-004**: HTTPS
  - 所有请求使用 HTTPS
  - HSTS 头配置

- **SPEC-SEC-005**: 输入验证
  - 服务端验证所有输入
  - 防止 SQL 注入（使用 ORM）
  - 防止 XSS（HTML 转义）

- **SPEC-SEC-006**: CORS
  - 配置允许的源
  - 限制 HTTP 方法
  - 禁用不必要的预检请求

### 8.3 速率限制

- **SPEC-SEC-007**: API 限流
  - 注册/登录：10 请求/分钟/IP
  - 上传：20 请求/小时/用户
  - Feed：100 请求/分钟/用户
  - 发布文章：10 请求/小时/用户

---

## 九、错误处理规范

### 9.1 错误码定义

| 代码 | 含义 | HTTP | 说明 |
|------|------|------|------|
| 0 | 成功 | 200 | - |
| 4001 | 用户不存在 | 404 | 登录时用户不存在 |
| 4002 | 密码错误 | 401 | 登录密码不正确 |
| 4003 | Token 过期 | 401 | Token 已过期 |
| 4004 | 无权限 | 403 | 用户无权限操作 |
| 4005 | 资源不存在 | 404 | 文章/草稿不存在 |
| 4006 | 参数错误 | 400 | 请求参数不合法 |
| 5001 | 服务器错误 | 500 | 内部服务器错误 |
| 5002 | 数据库错误 | 500 | 数据库操作失败 |
| 5003 | 上传失败 | 500 | 图片上传失败 |

### 9.2 前端处理

**错误处理流程**
```typescript
try {
  // API 调用
} catch (error) {
  if (error.code === 4003) {
    // Token 过期，刷新并重试
  } else if (error.code === 4004) {
    // 无权限，显示提示
  } else if (error.code >= 5000) {
    // 服务器错误，显示重试
  }
}
```

---

## 十、项目计划

### 10.1 开发阶段

**Phase 1: 基础设施 (1 周)**
- 项目初始化（前后端）
- 数据库设计与迁移
- 认证模块开发
- 基础 API 框架

**Phase 2: 核心功能 (2 周)**
- 文章发布/编辑模块
- 编辑器集成
- Feed 流实现
- 基础缓存

**Phase 3: 草稿与离线支持 (1.5 周)**
- 草稿保存与发布
- 离线支持 (IndexedDB)
- 自动同步机制

**Phase 4: 性能优化与测试 (1 周)**
- 性能监测集成
- LCP/FCP 优化
- 虚拟滚动实现
- 集成测试

**Phase 5: 上线前准备 (3 天)**
- 安全审计
- 部署配置
- 监控告警

### 10.2 测试策略

- **单元测试**: 各模块业务逻辑（> 70% 覆盖）
- **集成测试**: API 端点、数据库操作
- **端到端测试**: 主要用户流程（注册-发布-浏览）
- **性能测试**: LCP、滚动帧率、内存占用

---

## 十一、运维与监控

### 11.1 日志规范

- 请求日志：method, path, statusCode, duration
- 错误日志：error message, stack trace, context
- 业务日志：重要操作（登录、发布）

### 11.2 监控指标

**后端**
- 请求 QPS, 平均响应时间, 错误率
- 数据库连接数, 查询时间
- Redis 命中率, 内存占用
- 系统 CPU, 内存, 磁盘

**前端**
- LCP, FCP, CLS (Web Vitals)
- 页面加载时间
- 错误监控（JS 异常）
- 用户行为分析

### 11.3 告警规则

- 错误率 > 1%
- 平均响应时间 > 500ms
- LCP > 3s
- 内存占用 > 80%

---

## 十二、扩展功能（未来）

- 用户评论/点赞
- 用户关注/粉丝
- 搜索功能
- 分类标签
- 推荐算法
- 社交分享
- 消息通知

---

## 附录：技术栈详细选型

### 前端技术栈

| 工具 | 版本 | 用途 | 理由 |
|------|------|------|------|
| Vue | 3.x | 框架 | 官方推荐，composition API |
| TypeScript | 5.x | 类型系统 | 类型安全，开发体验 |
| Vite | 5.x | 构建工具 | 快速开发，生产优化 |
| Pinia | 2.x | 状态管理 | Vue 3 官方推荐 |
| Axios | 1.x | HTTP 客户端 | 拦截器支持，广泛使用 |
| TipTap | 2.x | 编辑器 | 功能完整，易于定制 |
| Virtual Scroller | - | 虚拟滚动 | 性能优化 |
| IndexedDB | - | 本地存储 | 大容量，离线支持 |

### 后端技术栈

| 工具 | 版本 | 用途 | 理由 |
|------|------|------|------|
| Node.js | 18 LTS | 运行环境 | 稳定，事件驱动 |
| Express | 4.x | Web 框架 | 轻量，中间件丰富 |
| TypeScript | 5.x | 类型系统 | 类型安全 |
| MongoDB | 5.x | 数据库 | 文档模型，灵活架构 |
| Mongoose | 7.x | ORM | 数据验证，易用 |
| Redis | 6.x | 缓存 | 高性能，支持多种数据结构 |
| JWT | - | 认证 | 无状态，分布式友好 |
| Multer | - | 文件上传 | 中间件集成 |


