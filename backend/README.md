# 后端项目 - Node.js 资讯 API

基于 Express + TypeScript + MongoDB 开发的资讯平台 API 服务。

## 项目结构

```
src/
├── index.ts                     # 应用入口
├── config/                      # 配置文件
│   ├── database.ts             # MongoDB 配置
│   └── redis.ts                # Redis 配置
├── models/                      # 数据模型
│   ├── User.ts                 # 用户模型
│   ├── Article.ts              # 文章模型
│   └── Draft.ts                # 草稿模型
├── routes/                      # 路由（待实现）
│   ├── auth.ts
│   ├── articles.ts
│   ├── drafts.ts
│   ├── feed.ts
│   └── upload.ts
├── controllers/                 # 控制器（待实现）
│   ├── AuthController.ts
│   ├── ArticleController.ts
│   ├── DraftController.ts
│   └── UploadController.ts
├── services/                    # 业务服务层
│   ├── AuthService.ts          # 认证服务
│   ├── ArticleService.ts       # 文章服务（待实现）
│   ├── DraftService.ts         # 草稿服务（待实现）
│   └── FeedService.ts          # Feed 服务（待实现）
├── middleware/                  # 中间件
│   ├── auth.ts                 # 认证中间件
│   ├── errorHandler.ts         # 错误处理
│   ├── validation.ts           # 请求验证（待实现）
│   └── rateLimit.ts            # 速率限制（待实现）
├── utils/                       # 工具函数
│   ├── jwt.ts                  # JWT 工具
│   └── logger.ts               # 日志工具（待实现）
└── types/                       # TypeScript 类型
    └── models.ts
```

## 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 并创建 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接等信息。

### 3. 启动数据库

确保 MongoDB 和 Redis 正在运行：

```bash
# MongoDB
mongod

# Redis
redis-server
```

### 4. 开发模式

```bash
npm run dev
```

服务器运行在 `http://localhost:3000`

### 5. 构建生产版本

```bash
npm run build
npm start
```

## API 端点

### 认证相关

#### 用户注册
- **规范**: SPEC-AUTH-001
- **请求**: `POST /api/auth/register`
- **Body**:
```json
{
  "username": "string (3-20字符)",
  "email": "string",
  "password": "string (8-64字符)"
}
```
- **响应**: 
```json
{
  "code": 0,
  "data": {
    "token": "string",
    "refreshToken": "string",
    "user": { ... }
  }
}
```

#### 用户登录
- **规范**: SPEC-AUTH-002
- **请求**: `POST /api/auth/login`
- **Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

#### 用户登出
- **规范**: SPEC-AUTH-003
- **请求**: `POST /api/auth/logout`
- **Header**: `Authorization: Bearer <token>`

#### 刷新 Token
- **规范**: SPEC-AUTH-004
- **请求**: `POST /api/auth/refresh`
- **Body**:
```json
{
  "refreshToken": "string"
}
```

### 文章相关

#### 发布文章
- **规范**: SPEC-ARTICLE-001
- **请求**: `POST /api/articles`
- **Header**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "title": "string (1-100字符)",
  "content": "string (1-10000字符)",
  "images": [{ "url": "string", "uploadedAt": "ISO8601" }],
  "tags": ["string"]
}
```

#### 编辑文章
- **规范**: SPEC-ARTICLE-002
- **请求**: `PUT /api/articles/{id}`
- **Header**: `Authorization: Bearer <token>`

#### 删除文章
- **规范**: SPEC-ARTICLE-003
- **请求**: `DELETE /api/articles/{id}`
- **Header**: `Authorization: Bearer <token>`

#### 获取文章详情
- **规范**: SPEC-ARTICLE-004
- **请求**: `GET /api/articles/{id}`

### 草稿相关

#### 保存草稿
- **规范**: SPEC-DRAFT-001
- **请求**: `POST /api/drafts`
- **Header**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "title": "string",
  "content": "string",
  "images": [...],
  "articleId": "string (可选)"
}
```

#### 获取当前草稿
- **规范**: SPEC-DRAFT-002
- **请求**: `GET /api/drafts/current`
- **Header**: `Authorization: Bearer <token>`

#### 删除草稿
- **规范**: SPEC-DRAFT-003
- **请求**: `DELETE /api/drafts/{id}`
- **Header**: `Authorization: Bearer <token>`

#### 发布草稿
- **规范**: SPEC-DRAFT-004
- **请求**: `POST /api/drafts/{id}/publish`
- **Header**: `Authorization: Bearer <token>`

### Feed 相关

#### 获取 Feed 列表
- **规范**: SPEC-FEED-001
- **请求**: `GET /api/feed`
- **Query**:
  - `page`: number (默认 1)
  - `pageSize`: number (默认 20，最大 50)
  - `sortBy`: 'time' | 'popularity' (默认 'time')
  - `cursor`: string (用于游标分页)
- **响应**:
```json
{
  "code": 0,
  "data": {
    "articles": [...],
    "hasMore": boolean,
    "nextCursor": "string"
  }
}
```

### 上传相关

#### 上传图片
- **规范**: SPEC-EDITOR-IMAGE-001
- **请求**: `POST /api/upload/image`
- **Header**: `Authorization: Bearer <token>`
- **Body**: FormData
  - `file`: File (JPG/PNG/WebP, 100KB-5MB)
- **响应**:
```json
{
  "code": 0,
  "data": {
    "imageUrl": "string",
    "thumbnailUrl": "string"
  }
}
```

## 错误码

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

## 数据模型

### User Schema
```typescript
{
  _id: ObjectId
  username: String (unique, index)
  email: String (unique, index)
  passwordHash: String (bcrypt)
  avatar: String (nullable)
  bio: String
  createdAt: Date (index)
  updatedAt: Date
  lastLoginAt: Date
  isActive: Boolean
}
```

### Article Schema
```typescript
{
  _id: ObjectId
  authorId: ObjectId (ref: User)
  title: String
  content: String (HTML)
  images: Array<{ url, uploadedAt, thumbnailUrl }>
  tags: String[]
  summary: String (自动生成)
  viewCount: Number
  createdAt: Date (index)
  updatedAt: Date (index)
  isDeleted: Boolean
  source: 'web' | 'mobile'
}
```

### Draft Schema
```typescript
{
  _id: ObjectId
  userId: ObjectId (ref: User)
  articleId: ObjectId (ref: Article, nullable)
  title: String
  content: String
  images: Array<{ url, uploadedAt, thumbnailUrl }>
  lastSavedAt: Date
  lastEditedAt: Date
  status: 'editing' | 'saving' | 'synced'
  localChecksum: String
}
```

## Redis 键设计

```
# 认证相关
session:{sessionId}              # 用户会话
token:blacklist:{token}          # 登出黑名单
refresh_token:{userId}           # 刷新 Token

# 缓存相关
cache:article:{articleId}        # 文章缓存
cache:feed:list:{sort}:{page}   # Feed 列表缓存

# 计数相关
counter:article:{articleId}:views # 浏览计数
```

## 中间件

### 认证中间件 (verifyAuth)
验证 Authorization header 中的 Bearer token，并将用户信息附加到 request 对象。

```typescript
GET /api/protected
Authorization: Bearer <token>
```

### 错误处理中间件
全局错误处理，统一返回错误响应格式。

## 待实现功能

- [ ] 文章服务 (ArticleService)
- [ ] 草稿服务 (DraftService)
- [ ] Feed 服务 (FeedService)
- [ ] 上传服务 (UploadService)
- [ ] 速率限制中间件
- [ ] 请求验证中间件
- [ ] 日志系统
- [ ] WebSocket 支持
- [ ] 性能监测
- [ ] 搜索功能
- [ ] 评论系统
- [ ] 点赞系统

## 开发规范

- 所有 API 功能按照 `IMPLEMENTATION_PLAN.md` 中的规范实现
- 使用 TypeScript 确保类型安全
- 遵循分层架构（路由层 → 控制层 → 服务层 → 数据层）
- 所有异步操作使用 try-catch 和统一的错误处理
- 数据库操作使用 Mongoose ORM
- 缓存操作使用 Redis

## 性能优化

### 数据库
- 使用合适的索引优化查询
- 使用 MongoDB 聚合管道进行复杂查询
- 实现分页避免一次性加载大量数据

### 缓存
- Redis 缓存热数据（文章、Feed）
- 缓存过期时间设置 5 分钟
- 新文章发布时主动更新缓存

### API
- 实现速率限制防止滥用
- 压缩响应数据
- 使用 CDN 分发静态资源

## 监控和日志

- 请求日志: method, path, statusCode, duration
- 错误日志: error message, stack trace, context
- 业务日志: 重要操作（登录、发布）

## 生产部署

### 环境变量
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=<production_mongodb_url>
REDIS_URL=<production_redis_url>
JWT_SECRET=<strong_secret_key>
CORS_ORIGIN=<production_domain>
```

### 性能建议
- 启用 HTTPS
- 配置 HSTS
- 启用 GZIP 压缩
- 设置 CDN 用于图片
- 数据库和 Redis 使用集群

## 许可证

MIT

