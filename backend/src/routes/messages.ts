import { Router } from 'express'
import { messageService } from '@/services/MessageService'
import { verifyAuth, AuthRequest } from '@/middleware/auth'

const router = Router()

router.use(verifyAuth)

/**
 * 发送私信
 * POST /api/messages
 */
router.post('/', async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const { receiverId, content } = req.body

  if (!receiverId || !content) {
    return res.status(400).json({
      code: 400,
      message: 'receiverId and content are required',
    })
  }

  try {
    const message = await messageService.sendMessage(userId, receiverId, content)
    res.json({
      code: 0,
      message: 'Message sent successfully',
      data: message,
    })
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      code: error.code || 500,
      message: error.message || 'Failed to send message',
    })
  }
})

/**
 * 获取对话历史
 * GET /api/messages/conversation/:userId
 */
router.get('/conversation/:userId', async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const otherUserId = req.params.userId
  const limit = parseInt(req.query.limit as string) || 50

  try {
    const messages = await messageService.getConversation(userId, otherUserId, limit)
    res.json({
      code: 0,
      message: 'Success',
      data: messages,
    })
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      code: error.code || 500,
      message: error.message || 'Failed to get conversation',
    })
  }
})

/**
 * 获取对话列表
 * GET /api/messages/conversations
 */
router.get('/conversations', async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const limit = parseInt(req.query.limit as string) || 20

  console.log('Getting conversations for user:', userId, typeof userId)

  try {
    const conversations = await messageService.getConversations(userId, limit)
    console.log('Conversations result:', conversations)

    res.json({
      code: 0,
      message: 'Success',
      data: conversations,
    })
  } catch (error: any) {
    console.error('Error getting conversations:', error)
    res.status(error.statusCode || 500).json({
      code: error.code || 500,
      message: error.message || 'Failed to get conversations',
    })
  }
})

/**
 * 标记消息为已读
 * PUT /api/messages/:id/read
 */
router.put('/:id/read', async (req, res) => {
  const userId = (req as AuthRequest).userId!

  try {
    const message = await messageService.markAsRead(req.params.id, userId)
    res.json({
      code: 0,
      message: 'Message marked as read',
      data: message,
    })
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      code: error.code || 500,
      message: error.message || 'Failed to mark message as read',
    })
  }
})

/**
 * 标记对话为已读
 * PUT /api/messages/conversation/:userId/read
 */
router.put('/conversation/:userId/read', async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const otherUserId = req.params.userId

  try {
    await messageService.markConversationAsRead(userId, otherUserId)
    res.json({
      code: 0,
      message: 'Conversation marked as read',
    })
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      code: error.code || 500,
      message: error.message || 'Failed to mark conversation as read',
    })
  }
})

/**
 * 获取未读消息数
 * GET /api/messages/unread-count
 */
router.get('/unread-count', async (req, res) => {
  const userId = (req as AuthRequest).userId!

  try {
    const count = await messageService.getUnreadCount(userId)
    res.json({
      code: 0,
      message: 'Success',
      data: { count },
    })
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      code: error.code || 500,
      message: error.message || 'Failed to get unread count',
    })
  }
})

// 临时测试路由 - 创建测试消息
router.post('/test-messages', async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId!

    // 创建一些测试消息 - 使用真实的ObjectId格式
    const testUserId = '507f1f77bcf86cd799439011' // MongoDB默认ObjectId格式

    await Message.create({
      senderId: userId,
      receiverId: testUserId,
      content: '这是一条测试消息',
      isRead: false,
    })

    await Message.create({
      senderId: testUserId,
      receiverId: userId,
      content: '这是对方回复的消息',
      isRead: false,
    })

    res.json({
      code: 0,
      message: 'Test messages created',
      data: { userId, testUserId }
    })
  } catch (error: any) {
    console.error('Error creating test messages:', error)
    res.status(500).json({
      code: 500,
      message: error.message,
    })
  }
})

export default router

