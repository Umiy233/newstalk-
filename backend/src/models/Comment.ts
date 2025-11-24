/**
 * 评论模型
 */

import mongoose, { Schema, Document } from 'mongoose'

export interface IComment extends Document {
  articleId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  content: string
  parentId?: mongoose.Types.ObjectId // 用于回复评论
  createdAt: Date
  updatedAt: Date
}

const commentSchema = new Schema<IComment>(
  {
    articleId: {
      type: Schema.Types.ObjectId,
      ref: 'Article',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      maxlength: [1000, 'Comment must be at most 1000 characters'],
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// 索引优化
commentSchema.index({ articleId: 1, createdAt: -1 })
commentSchema.index({ parentId: 1 })

export const Comment = mongoose.model<IComment>('Comment', commentSchema)

