import { Like } from '@/models/Like'
import { Article } from '@/models/Article'
import { ApiError } from '@/middleware/errorHandler'
import { ErrorCodes } from '@/types/models'

export class LikeService {
  /**
   * 点赞文章
   */
  async like(userId: string, articleId: string) {
    // Check if article exists
    const article = await Article.findById(articleId)
    if (!article || article.isDeleted) {
      throw new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, 'Article not found', 404)
    }

    // Check if already liked
    const existingLike = await Like.findOne({ userId, articleId })
    if (existingLike) {
      return { isLiked: true }
    }

    // Create like
    await Like.create({ userId, articleId })

    // Get like count
    const likeCount = await Like.countDocuments({ articleId })

    return { isLiked: true, likeCount }
  }

  /**
   * 取消点赞
   */
  async unlike(userId: string, articleId: string) {
    const result = await Like.deleteOne({ userId, articleId })
    
    if (result.deletedCount === 0) {
      throw new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, 'Like not found', 404)
    }

    // Get like count
    const likeCount = await Like.countDocuments({ articleId })

    return { isLiked: false, likeCount }
  }

  /**
   * 检查是否已点赞
   */
  async isLiked(userId: string, articleId: string): Promise<boolean> {
    const like = await Like.findOne({ userId, articleId })
    return !!like
  }

  /**
   * 获取文章的点赞数
   */
  async getLikeCount(articleId: string): Promise<number> {
    return await Like.countDocuments({ articleId })
  }

  /**
   * 批量检查文章是否被点赞
   */
  async checkLikedStatus(userId: string, articleIds: string[]): Promise<Record<string, boolean>> {
    const likes = await Like.find({
      userId,
      articleId: { $in: articleIds }
    })

    const likedMap: Record<string, boolean> = {}
    articleIds.forEach(id => {
      likedMap[id] = false
    })

    likes.forEach(like => {
      likedMap[like.articleId.toString()] = true
    })

    return likedMap
  }

  /**
   * 获取用户点赞的文章ID列表
   */
  async getUserLikedArticleIds(userId: string): Promise<string[]> {
    const likes = await Like.find({ userId })
      .sort({ createdAt: -1 })
      .select('articleId')
      .lean()
    
    return likes.map(like => like.articleId.toString())
  }
}

export const likeService = new LikeService()

