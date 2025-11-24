/**
 * 数据库配置
 * SPEC: SPEC-DB-001
 */

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/news-app'

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    console.log('✓ MongoDB connected')
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error)
    process.exit(1)
  }
}

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect()
    console.log('✓ MongoDB disconnected')
  } catch (error) {
    console.error('✗ MongoDB disconnection failed:', error)
  }
}

// 连接事件监听
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB')
})

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err)
})

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB')
})

