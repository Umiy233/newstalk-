/**
 * Redis 配置
 * SPEC: SPEC-REDIS-001
 */

import { createClient } from 'redis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

export const redisClient = createClient({
  url: REDIS_URL,
})

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect()
    console.log('✓ Redis connected')
  } catch (error) {
    console.error('✗ Redis connection failed:', error)
    process.exit(1)
  }
}

export const disconnectRedis = async (): Promise<void> => {
  try {
    await redisClient.disconnect()
    console.log('✓ Redis disconnected')
  } catch (error) {
    console.error('✗ Redis disconnection failed:', error)
  }
}

// Redis 事件监听
redisClient.on('connect', () => {
  console.log('Redis client connected')
})

redisClient.on('error', (err) => {
  console.error('Redis client error:', err)
})

redisClient.on('ready', () => {
  console.log('Redis client ready')
})

