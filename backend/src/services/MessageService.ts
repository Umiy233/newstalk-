import mongoose from 'mongoose'
import { Message } from '@/models/Message'
import { Follow } from '@/models/Follow'
import { ApiError } from '@/middleware/errorHandler'
import { ErrorCodes } from '@/types/models'

export class MessageService {
  /**
   * 发送私信
   * 如果没有互相关注，只能发送一条消息
   */
  async sendMessage(senderId: string, receiverId: string, content: string) {
    if (senderId === receiverId) {
      throw new ApiError(ErrorCodes.INVALID_PARAMS, 'Cannot send message to yourself', 400)
    }

    // 检查是否是互相关注（朋友）
    const isFriend = await this.checkIsFriend(senderId, receiverId)

    if (!isFriend) {
      // 如果没有互相关注，检查是否已经发送过消息
      const existingMessage = await Message.findOne({
        senderId: new mongoose.Types.ObjectId(senderId),
        receiverId: new mongoose.Types.ObjectId(receiverId),
      })

      if (existingMessage) {
        throw new ApiError(
          ErrorCodes.UNAUTHORIZED,
          'You can only send one message to users you are not mutual friends with',
          403
        )
      }
    }

    const message = await Message.create({
      senderId,
      receiverId,
      content: content.trim(),
      isRead: false,
    })

    return await Message.findById(message._id)
      .populate('senderId', 'username avatar')
      .populate('receiverId', 'username avatar')
  }

  /**
   * 检查是否是朋友（互相关注）
   */
  private async checkIsFriend(userId1: string, userId2: string): Promise<boolean> {
    const follow1 = await Follow.exists({
      followerId: new mongoose.Types.ObjectId(userId1),
      followingId: new mongoose.Types.ObjectId(userId2)
    })
    const follow2 = await Follow.exists({
      followerId: new mongoose.Types.ObjectId(userId2),
      followingId: new mongoose.Types.ObjectId(userId1)
    })
    return !!(follow1 && follow2)
  }

  /**
   * 获取两个用户之间的对话历史
   */
  async getConversation(userId1: string, userId2: string, limit: number = 50) {
    const messages = await Message.find({
      $or: [
        { senderId: new mongoose.Types.ObjectId(userId1), receiverId: new mongoose.Types.ObjectId(userId2) },
        { senderId: new mongoose.Types.ObjectId(userId2), receiverId: new mongoose.Types.ObjectId(userId1) },
      ],
    })
      .populate('senderId', 'username avatar')
      .populate('receiverId', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(limit)

    return messages.reverse() // 按时间正序返回
  }

  /**
   * 标记消息为已读
   */
  async markAsRead(messageId: string, userId: string) {
    const message = await Message.findById(messageId)
    if (!message) {
      throw new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, 'Message not found', 404)
    }

    // 只有接收者可以标记为已读
    if (message.receiverId.toString() !== userId) {
      throw new ApiError(ErrorCodes.UNAUTHORIZED, 'Only receiver can mark message as read', 403)
    }

    message.isRead = true
    await message.save()
    return message
  }

  /**
   * 标记与某个用户的所有未读消息为已读
   */
  async markConversationAsRead(userId: string, otherUserId: string) {
    await Message.updateMany(
      {
        senderId: new mongoose.Types.ObjectId(otherUserId),
        receiverId: new mongoose.Types.ObjectId(userId),
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    )
  }

  /**
   * 获取用户的未读消息数
   */
  async getUnreadCount(userId: string) {
    return Message.countDocuments({
      receiverId: new mongoose.Types.ObjectId(userId),
      isRead: false,
    })
  }

  /**
   * 获取用户的对话列表（最近联系的人）
   */
  async getConversations(userId: string, limit: number = 20) {
    console.log('Getting conversations for userId:', userId)

    // 先检查是否有消息
    const messageCount = await Message.countDocuments({
      $or: [
        { senderId: new mongoose.Types.ObjectId(userId) },
        { receiverId: new mongoose.Types.ObjectId(userId) }
      ],
    })
    console.log('Total messages for user:', messageCount)

    // 如果没有消息，直接返回空数组
    if (messageCount === 0) {
      console.log('No messages found, returning empty array')
      return []
    }

    // 获取所有与用户相关的消息，按最新消息时间排序
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: new mongoose.Types.ObjectId(userId) },
            { receiverId: new mongoose.Types.ObjectId(userId) }
          ],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', new mongoose.Types.ObjectId(userId)] },
              '$receiverId',
              '$senderId',
            ],
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', new mongoose.Types.ObjectId(userId)] },
                    { $eq: ['$isRead', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          _id: 0,
          userId: '$user._id',
          username: '$user.username',
          avatar: '$user.avatar',
          lastMessage: {
            _id: '$lastMessage._id',
            content: '$lastMessage.content',
            senderId: '$lastMessage.senderId',
            receiverId: '$lastMessage.receiverId',
            createdAt: '$lastMessage.createdAt',
            isRead: '$lastMessage.isRead',
          },
          unreadCount: 1,
        },
      },
      {
        $sort: { 'lastMessage.createdAt': -1 },
      },
      {
        $limit: limit,
      },
    ])

    console.log('Aggregated conversations result:', conversations)

    // 如果聚合查询返回空结果，尝试简单查询
    if (conversations.length === 0) {
      console.log('Aggregation returned empty, trying simple query')
      const simpleResult = await Message.find({
        $or: [
          { senderId: new mongoose.Types.ObjectId(userId) },
          { receiverId: new mongoose.Types.ObjectId(userId) }
        ],
      }).sort({ createdAt: -1 }).limit(5)
      console.log('Simple query result:', simpleResult)
    }

    return conversations
  }
}

export const messageService = new MessageService()

