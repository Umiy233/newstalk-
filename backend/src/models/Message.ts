/**
 * 私信模型
 * SPEC: SPEC-MESSAGE-001 - Message Schema
 */

import mongoose, { Schema, Document } from 'mongoose'

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId
  senderId: mongoose.Types.ObjectId
  receiverId: mongoose.Types.ObjectId
  content: string
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

const messageSchema = new Schema<IMessage>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Message content must be at most 1000 characters'],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// 复合索引：用于查询两个用户之间的对话
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 })
messageSchema.index({ receiverId: 1, isRead: 1 })

export const Message = mongoose.model<IMessage>('Message', messageSchema)

