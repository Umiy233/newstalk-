/**
 * 认证中间件
 * SPEC: SPEC-SEC-001, SPEC-SEC-002 - Authentication
 */

import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '@/utils/jwt'
import { redisClient } from '@/config/redis'
import type { JWTPayload } from '@/types/models'

export interface AuthRequest extends Request {
  userId?: string
  email?: string
  token?: string
}

/**
 * 验证 Token 中间件
 */
export async function verifyAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        code: 4004,
        message: 'Missing or invalid authorization header',
      })
      return
    }

    const token = authHeader.substring(7)

    // 检查 token 是否在黑名单中（已登出）
    const isBlacklisted = await redisClient.get(`token:blacklist:${token}`)
    if (isBlacklisted) {
      res.status(401).json({
        code: 4003,
        message: 'Token has been revoked',
      })
      return
    }

    // 验证 token
    const payload = verifyToken(token)
    if (!payload) {
      res.status(401).json({
        code: 4003,
        message: 'Invalid or expired token',
      })
      return
    }

    // 将用户信息附加到 request
    req.userId = payload.userId
    req.email = payload.email
    req.token = token

    next()
  } catch (error) {
    res.status(401).json({
      code: 4004,
      message: 'Authentication failed',
    })
  }
}

/**
 * 可选的认证中间件（如果有 token 则验证，否则继续）
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next()
    }

    const token = authHeader.substring(7)

    // 检查黑名单
    const isBlacklisted = await redisClient.get(`token:blacklist:${token}`)
    if (isBlacklisted) {
      return next()
    }

    // 验证 token
    const payload = verifyToken(token)
    if (payload) {
      req.userId = payload.userId
      req.email = payload.email
      req.token = token
    }

    next()
  } catch (error) {
    next()
  }
}

