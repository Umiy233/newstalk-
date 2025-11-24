# 私信功能实现说明

## 功能概述

实现了完整的私信功能，包括：
- 实时消息发送和接收（使用 WebSocket）
- 互相关注检查：如果没有互相关注，只能发送一条消息
- 消息历史记录
- 消息已读状态

## 技术实现

### 后端

1. **数据模型** (`backend/src/models/Message.ts`)
   - Message 模型，包含发送者、接收者、内容、已读状态等字段

2. **服务层** (`backend/src/services/MessageService.ts`)
   - `sendMessage`: 发送消息，检查互相关注状态
   - `getConversation`: 获取对话历史
   - `markAsRead`: 标记消息为已读
   - `getConversations`: 获取对话列表

3. **API 路由** (`backend/src/routes/messages.ts`)
   - `POST /api/messages`: 发送消息
   - `GET /api/messages/conversation/:userId`: 获取对话历史
   - `GET /api/messages/conversations`: 获取对话列表
   - `PUT /api/messages/:id/read`: 标记消息为已读

4. **WebSocket 服务器** (`backend/src/config/websocket.ts`)
   - 实时消息推送
   - 消息发送确认
   - 认证中间件

### 前端

1. **私信对话框组件** (`frontend/src/components/MessageDialog.vue`)
   - 消息列表展示
   - 实时消息接收
   - 消息发送
   - 互相关注限制提示
   - 样式与主页面一致

2. **Profile 页面集成** (`frontend/src/pages/Profile.vue`)
   - 添加私信按钮
   - 打开私信对话框
   - 传递互相关注状态

## 使用说明

### 安装依赖

```bash
# 后端
cd backend
npm install socket.io

# 前端
cd frontend
npm install socket.io-client
```

### 启动服务

1. 启动后端服务器（会自动初始化 WebSocket）
2. 启动前端开发服务器
3. 在用户资料页面点击"私信"按钮即可打开私信对话框

### 功能限制

- **未互相关注**：只能发送一条消息，发送后会显示限制提示
- **互相关注**：可以正常发送多条消息

## API 端点

### 发送消息
```
POST /api/messages
Body: {
  receiverId: string,
  content: string
}
```

### 获取对话历史
```
GET /api/messages/conversation/:userId?limit=50
```

### 获取对话列表
```
GET /api/messages/conversations?limit=20
```

### 标记消息为已读
```
PUT /api/messages/:id/read
```

## WebSocket 事件

### 客户端发送
- `send_message`: 发送消息
- `mark_read`: 标记消息为已读
- `mark_conversation_read`: 标记对话为已读

### 服务器推送
- `new_message`: 收到新消息
- `message_sent`: 消息发送成功
- `message_error`: 消息发送失败
- `read_confirmed`: 已读确认

## 注意事项

1. WebSocket 连接需要认证，使用 JWT token
2. 前端 WebSocket URL 默认使用 `http://localhost:3000`，可通过环境变量 `VITE_WS_URL` 配置
3. 消息内容最大长度为 1000 字符
4. 未互相关注的用户只能发送一条消息，这是为了防止骚扰

