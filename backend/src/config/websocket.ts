/**
 * WebSocket 服务器配置
 * SPEC: SPEC-MESSAGE-002 - WebSocket for Real-time Messaging
 */

import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { verifyToken } from '@/utils/jwt'
import { messageService } from '@/services/MessageService'
import type { JWTPayload } from '@/types/models'

interface AuthenticatedSocket extends Socket {
  userId?: string
}

let io: SocketIOServer | null = null

/**
 * 初始化 WebSocket 服务器
 */
export function initWebSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // 认证中间件
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'))
      }

      const payload = verifyToken(token)
      if (!payload) {
        return next(new Error('Authentication error: Invalid token'))
      }

      socket.userId = payload.userId
      next()
    } catch (error) {
      next(new Error('Authentication error'))
    }
  })

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!
    console.log(`User ${userId} connected to WebSocket`)

    // 加入用户专属房间
    socket.join(`user:${userId}`)

    // 发送消息
    socket.on('send_message', async (data: { receiverId: string; content: string }) => {
      try {
        const message = await messageService.sendMessage(userId, data.receiverId, data.content)
        
        // 发送给接收者
        io!.to(`user:${data.receiverId}`).emit('new_message', message)
        
        // 确认发送成功
        socket.emit('message_sent', message)
      } catch (error: any) {
        socket.emit('message_error', {
          message: error.message || 'Failed to send message',
        })
      }
    })

    // 标记消息为已读
    socket.on('mark_read', async (data: { messageId: string }) => {
      try {
        await messageService.markAsRead(data.messageId, userId)
        socket.emit('read_confirmed', { messageId: data.messageId })
      } catch (error: any) {
        socket.emit('read_error', {
          message: error.message || 'Failed to mark as read',
        })
      }
    })

    // 标记对话为已读
    socket.on('mark_conversation_read', async (data: { otherUserId: string }) => {
      try {
        await messageService.markConversationAsRead(userId, data.otherUserId)
        socket.emit('conversation_read_confirmed', { otherUserId: data.otherUserId })
      } catch (error: any) {
        socket.emit('read_error', {
          message: error.message || 'Failed to mark conversation as read',
        })
      }
    })

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected from WebSocket`)
    })
  })

  return io
}

/**
 * 获取 WebSocket 服务器实例
 */
export function getIO(): SocketIOServer | null {
  return io
}

