/**
 * 点赞模型
 */

import mongoose, { Schema, Document } from 'mongoose'

export interface ILike extends Document {
  userId: mongoose.Types.ObjectId
  articleId: mongoose.Types.ObjectId
  createdAt: Date
}

const likeSchema = new Schema<ILike>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    articleId: {
      type: Schema.Types.ObjectId,
      ref: 'Article',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

// Ensure unique like relationship (user can only like an article once)
likeSchema.index({ userId: 1, articleId: 1 }, { unique: true })
// Index for querying likes by article
likeSchema.index({ articleId: 1 })
// Index for querying likes by user
likeSchema.index({ userId: 1, createdAt: -1 })

export const Like = mongoose.model<ILike>('Like', likeSchema)

