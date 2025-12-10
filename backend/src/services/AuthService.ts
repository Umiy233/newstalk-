/**
 * 认证服务
 * SPEC: SPEC-AUTH-001, SPEC-AUTH-002, SPEC-AUTH-003, SPEC-AUTH-004
 */

import { User, type IUser } from '@/models/User'
import { generateAccessToken, generateRefreshToken } from '@/utils/jwt'
import { redisClient } from '@/config/redis'
import { ApiError } from '@/middleware/errorHandler'
import { ErrorCodes } from '@/types/models'
import type { RegisterRequest, LoginRequest, AuthResponse, UserDTO } from '@/types/models'
import { socialService } from '@/services/SocialService'

export class AuthService {
  /**
   * 用户注册
   * SPEC-AUTH-001
   */
  async register(req: RegisterRequest): Promise<AuthResponse> {
    // 检查用户名和邮箱是否已存在
    const existingUser = await User.findOne({
      $or: [{ username: req.username }, { email: req.email }],
    })

    if (existingUser) {
      throw new ApiError(
        ErrorCodes.CONFLICT,
        'Username or email already exists',
        409
      )
    }

    // 创建新用户
    const user = new User({
      username: req.username,
      email: req.email,
      passwordHash: req.password, // 会在 pre-save hook 中加密
      isActive: true,
    })

    await user.save()

    // 生成 token
    const token = generateAccessToken(user.id, user.email)
    const refreshToken = generateRefreshToken(user.id, user.email)

    try {
      if (redisClient.isOpen) {
        await redisClient.setEx(
          `refresh_token:${user.id}`,
          30 * 24 * 60 * 60, // 30 天
          refreshToken
        )
      }
    } catch (error) {
      console.error('Redis error during registration:', error)
    }

    return {
      token,
      refreshToken,
      user: this.toUserDTO(user),
    }
  }

  /**
   * 用户登录
   * SPEC-AUTH-002
   */
  async login(req: LoginRequest): Promise<AuthResponse> {
    // 查询用户（需要返回 passwordHash）
    const user = await User.findOne({
      $or: [{ username: req.username }, { email: req.username }],
    }).select('+passwordHash')

    if (!user) {
      throw new ApiError(ErrorCodes.USER_NOT_FOUND, '账号或密码错误', 401)
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(req.password)
    if (!isPasswordValid) {
      throw new ApiError(ErrorCodes.INVALID_PASSWORD, '账号或密码错误', 401)
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date()
    await user.save()

    // 生成 token
    const token = generateAccessToken(user.id, user.email)
    const refreshToken = generateRefreshToken(user.id, user.email)

    // 将 refresh token 保存到 Redis
    try {
      if (redisClient.isOpen) {
        await redisClient.setEx(
          `refresh_token:${user.id}`,
          30 * 24 * 60 * 60,
          refreshToken
        )
      }
    } catch (error) {
      console.error('Redis error during login:', error)
    }

    return {
      token,
      refreshToken,
      user: this.toUserDTO(user),
    }
  }

  /**
   * 用户登出
   * SPEC-AUTH-003
   */
  async logout(token: string, userId: string): Promise<void> {
    try {
      if (redisClient.isOpen) {
        // 将 token 加入黑名单（7 天有效期）
        await redisClient.setEx(`token:blacklist:${token}`, 7 * 24 * 60 * 60, '1')

        // 删除 refresh token
        await redisClient.del(`refresh_token:${userId}`)
      }
    } catch (error) {
       console.error('Redis error during logout:', error)
    }
  }

  /**
   * 刷新 Token
   * SPEC-AUTH-004
   */
  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    // TODO: 在 verifyToken 中验证 refresh token
    const token = generateAccessToken('userId', 'email')
    return { token }
  }

  /**
   * 获取用户信息
   */
  async getUserById(userId: string, currentUserId?: string): Promise<UserDTO & { followStatus?: 'none' | 'following' | 'friend' | 'self', isFollowedBy?: boolean }> {
    const user = await User.findById(userId)
    if (!user) {
      throw new ApiError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404)
    }
    
    const userDTO = this.toUserDTO(user)
    
    // If currentUserId is provided and different from target user, get follow status
    if (currentUserId && currentUserId !== userId) {
      const followStatus = await socialService.getFollowStatus(currentUserId, userId)
      // Check if target user follows current user (reverse direction)
      const isFollowedBy = await socialService.isFollowedBy(userId, currentUserId)
      return { ...userDTO, followStatus, isFollowedBy }
    } else if (currentUserId && currentUserId === userId) {
      return { ...userDTO, followStatus: 'self' }
    }
    
    return userDTO
  }

  /**
   * 更新用户资料
   */
  async updateProfile(userId: string, data: { username?: string; bio?: string; avatar?: string }): Promise<UserDTO> {
    const user = await User.findById(userId)
    if (!user) {
      throw new ApiError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404)
    }

    // Check username uniqueness if changing
    if (data.username && data.username !== user.username) {
       const existing = await User.findOne({ username: data.username })
       if (existing) {
         throw new ApiError(ErrorCodes.CONFLICT, 'Username already taken', 409)
       }
       user.username = data.username
    }

    if (data.bio !== undefined) user.bio = data.bio
    if (data.avatar !== undefined) user.avatar = data.avatar

    await user.save()
    return this.toUserDTO(user)
  }

  /**
   * 将 User 模型转换为 DTO
   */
  private toUserDTO(user: IUser): UserDTO {
    return {
      _id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }
  }
}

export const authService = new AuthService()
