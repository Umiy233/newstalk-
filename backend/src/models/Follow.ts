/**
 * 关注模型
 * SPEC: SPEC-SOCIAL-001 - Follow System
 */

import mongoose, { Schema, Document } from 'mongoose'

export interface IFollow extends Document {
  followerId: mongoose.Types.ObjectId
  followingId: mongoose.Types.ObjectId
  createdAt: Date
}

const followSchema = new Schema<IFollow>(
  {
    followerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    followingId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

// Ensure unique follow relationship
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true })

export const Follow = mongoose.model<IFollow>('Follow', followSchema)

