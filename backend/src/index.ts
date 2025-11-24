/**
 * 应用入口文件
 * SPEC: 规范驱动编程 - 项目初始化
 */

import 'express-async-errors'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import http from 'http'
import { connectDatabase } from '@/config/database'
import { connectRedis } from '@/config/redis'
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler'
import { initWebSocket } from '@/config/websocket'
import authRoutes from '@/routes/auth'
import articleRoutes from '@/routes/articles'
import draftRoutes from '@/routes/drafts'
import feedRoutes from '@/routes/feed'
import uploadRoutes from '@/routes/upload'
import socialRoutes from '@/routes/social'
import likeRoutes from '@/routes/likes'
import commentRoutes from '@/routes/comments'
import messageRoutes from '@/routes/messages'
import path from 'path'

// 加载环境变量
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// ============ 中间件 ============
// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

// 安全中间件
app.use(helmet())

// CORS 配置
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
)

// 解析 JSON
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

// ============ 健康检查 ============
app.get('/health', (req, res) => {
  res.json({
    code: 0,
    message: 'OK',
    timestamp: new Date().toISOString(),
  })
})

// ============ API 路由 ============
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
app.use('/api/auth', authRoutes)
app.use('/api/articles', articleRoutes)
app.use('/api/drafts', draftRoutes)
app.use('/api/feed', feedRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/social', socialRoutes)
app.use('/api/likes', likeRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/messages', messageRoutes)

// TODO: 添加其他路由
app.get('/api', (req, res) => {
  res.json({
    code: 0,
    message: 'News App API v1.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        refresh: 'POST /api/auth/refresh',
      },
      articles: {
        create: 'POST /api/articles',
        update: 'PUT /api/articles/:id',
        delete: 'DELETE /api/articles/:id',
        getDetail: 'GET /api/articles/:id',
      },
      drafts: {
        save: 'POST /api/drafts',
        getCurrent: 'GET /api/drafts/current',
        delete: 'DELETE /api/drafts/:id',
        publish: 'POST /api/drafts/:id/publish',
      },
      feed: {
        list: 'GET /api/feed',
      },
      upload: {
        image: 'POST /api/upload/image',
      },
    },
  })
})

// ============ 错误处理 ============
app.use(notFoundHandler)
app.use(errorHandler)

// ============ 启动服务器 ============
async function startServer() {
  try {
    // 连接数据库
    await connectDatabase()

    // 连接 Redis
    await connectRedis()

    // 创建 HTTP 服务器
    const server = http.createServer(app)

    // 初始化 WebSocket
    initWebSocket(server)

    // 启动服务器
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`)
      console.log(`📚 API docs available at http://localhost:${PORT}/api`)
      console.log(`🔌 WebSocket server initialized`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server')
  process.exit(0)
})

startServer()

