/**
 * 用户模型
 * SPEC: SPEC-AUTH-001 - User Schema
 */

import mongoose, { Schema, Document } from 'mongoose'
import bcryptjs from 'bcryptjs'

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  username: string
  email: string
  passwordHash: string
  avatar?: string
  bio?: string
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
  isActive: boolean
  comparePassword(password: string): Promise<boolean>
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username must be at most 20 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // 默认不返回密码
    },
    avatar: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      default: '',
      maxlength: [500, 'Bio must be at most 500 characters'],
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

/**
 * 密码加密 hook
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next()
  }

  try {
    const salt = await bcryptjs.genSalt(10)
    this.passwordHash = await bcryptjs.hash(this.passwordHash, salt)
    next()
  } catch (error) {
    next(error as Error)
  }
})

/**
 * 密码对比方法
 */
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcryptjs.compare(password, this.passwordHash)
}

export const User = mongoose.model<IUser>('User', userSchema)

