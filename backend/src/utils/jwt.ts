/**
 * JWT 工具
 * SPEC: SPEC-SEC-002 - Token Management
 */

import jwt from 'jsonwebtoken'
import type { JWTPayload } from '@/types/models'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRE_IN = process.env.JWT_EXPIRE_IN || '7d'
const JWT_REFRESH_EXPIRE_IN = process.env.JWT_REFRESH_EXPIRE_IN || '30d'

/**
 * 生成 Access Token
 */
export function generateAccessToken(userId: string, email: string): string {
  return jwt.sign(
    {
      userId,
      email,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRE_IN,
    }
  )
}

/**
 * 生成 Refresh Token
 */
export function generateRefreshToken(userId: string, email: string): string {
  return jwt.sign(
    {
      userId,
      email,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRE_IN,
    }
  )
}

/**
 * 验证 Token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * 解码 Token（不验证签名）
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * 从 token 中提取 payload（不验证）
 */
export function getTokenPayload(token: string): JWTPayload | null {
  const decoded = decodeToken(token)
  if (!decoded) return null

  // 检查是否过期
  if (decoded.exp && decoded.exp < Date.now() / 1000) {
    return null
  }

  return decoded
}

