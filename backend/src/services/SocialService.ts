import { Follow } from '@/models/Follow'
import { User } from '@/models/User'
import { ApiError } from '@/middleware/errorHandler'
import { ErrorCodes } from '@/types/models'

export class SocialService {
  /**
   * 关注用户
   */
  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new ApiError(ErrorCodes.INVALID_PARAMS, 'Cannot follow yourself', 400)
    }

    const targetUser = await User.findById(followingId)
    if (!targetUser) {
      throw new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, 'User not found', 404)
    }

    const existingFollow = await Follow.findOne({ followerId, followingId })
    if (existingFollow) {
      return { status: 'following' }
    }

    await Follow.create({ followerId, followingId })

    // Check if mutual follow (friend)
    const isFriend = await this.checkIsFriend(followerId, followingId)
    
    return { status: 'following', isFriend }
  }

  /**
   * 取消关注
   */
  async unfollow(followerId: string, followingId: string) {
    const result = await Follow.deleteOne({ followerId, followingId })
    if (result.deletedCount === 0) {
      throw new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, 'Not following this user', 404)
    }
  }

  /**
   * 检查是否是朋友（互相关注）
   */
  async checkIsFriend(userId1: string, userId2: string): Promise<boolean> {
    const follow1 = await Follow.exists({ followerId: userId1, followingId: userId2 })
    const follow2 = await Follow.exists({ followerId: userId2, followingId: userId1 })
    return !!(follow1 && follow2)
  }

  /**
   * 获取两个用户之间的关注状态
   */
  async getFollowStatus(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) return 'none' // Or 'self'

    const isFollowing = await Follow.exists({ followerId: currentUserId, followingId: targetUserId })
    if (!isFollowing) return 'none'

    const isFollower = await Follow.exists({ followerId: targetUserId, followingId: currentUserId })
    return isFollower ? 'friend' : 'following'
  }

  /**
   * 检查targetUserId是否关注了currentUserId
   */
  async isFollowedBy(targetUserId: string, currentUserId: string): Promise<boolean> {
    if (targetUserId === currentUserId) return false
    const exists = await Follow.exists({ followerId: targetUserId, followingId: currentUserId })
    return !!exists
  }

  /**
   * 获取关注列表
   */
  async getFollowing(userId: string) {
    return Follow.find({ followerId: userId }).populate('followingId', 'username avatar bio')
  }

  /**
   * 获取粉丝列表
   */
  async getFollowers(userId: string) {
    return Follow.find({ followingId: userId }).populate('followerId', 'username avatar bio')
  }
}

export const socialService = new SocialService()
