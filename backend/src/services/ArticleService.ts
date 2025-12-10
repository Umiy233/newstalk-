import { Article, IArticle } from '@/models/Article'
import { Follow } from '@/models/Follow'
import { Like } from '@/models/Like'
import { ApiError } from '@/middleware/errorHandler'
import { ErrorCodes } from '@/types/models'
import { socialService } from '@/services/SocialService'
import { likeService } from '@/services/LikeService'

export class ArticleService {
  async create(userId: string, data: Partial<IArticle>) {
    const article = new Article({
      ...data,
      authorId: userId,
    })
    await article.save()
    return article
  }

  async update(id: string, userId: string, data: Partial<IArticle>) {
    const article = await Article.findOne({ _id: id, authorId: userId })
    if (!article) {
      throw new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, 'Article not found or permission denied', 404)
    }
    
    Object.assign(article, data)
    await article.save()
    return article
  }

  async delete(id: string, userId: string) {
    const article = await Article.findOne({ _id: id, authorId: userId })
    if (!article) {
      throw new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, 'Article not found or permission denied', 404)
    }
    
    article.isDeleted = true
    await article.save()
  }

  async getDetail(id: string, currentUserId?: string) {
    const article = await Article.findById(id).populate('authorId', 'username avatar bio').lean()
    if (!article || article.isDeleted) {
      throw new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, 'Article not found', 404)
    }
    
    // Increment view count
    await Article.findByIdAndUpdate(id, { $inc: { viewCount: 1 } })
    
    // Update the viewCount in the returned object to reflect the increment
    ;(article as any).viewCount = ((article as any).viewCount || 0) + 1
    
    // Populate follow status and like status if user is logged in
    if (currentUserId) {
      // Set like status
      const isLiked = await likeService.isLiked(currentUserId, id)
      ;(article as any).isLiked = isLiked
      
      // Set follow status
      if ((article as any).authorId._id.toString() === currentUserId) {
        ;(article as any).authorId.followStatus = 'self'
      } else {
        ;(article as any).authorId.followStatus = await socialService.getFollowStatus(
          currentUserId,
          (article as any).authorId._id.toString()
        )
      }
    } else {
      ;(article as any).authorId.followStatus = 'none'
      ;(article as any).isLiked = false
    }
    
    return article
  }

  async getFeed(page: number = 1, limit: number = 10, currentUserId?: string, type: 'recommended' | 'following' | 'friends' | 'liked' = 'recommended', authorId?: string, likedUserId?: string) {
    const skip = (page - 1) * limit
    
    let query: any = { isDeleted: false }
    
    // If authorId is provided, filter by author
    if (authorId) {
      query.authorId = authorId
    }
    
    // If type is 'following', filter by followed users
    if (type === 'following' && currentUserId) {
      // Get list of followed user IDs
      const follows = await Follow.find({ followerId: currentUserId })
      const followedUserIds = follows.map(f => f.followingId)
      
      if (followedUserIds.length === 0) {
        // No following users, return empty result
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      }
      
      query.authorId = { $in: followedUserIds }
    }
    
    // If type is 'friends', filter by mutual follows (friends)
    if (type === 'friends' && currentUserId) {
      // Get list of users that current user follows
      const following = await Follow.find({ followerId: currentUserId })
      const followingIds = following.map(f => f.followingId)
      
      if (followingIds.length === 0) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      }
      
      // Get list of users that follow current user back (mutual follows)
      const mutualFollows = await Follow.find({
        followerId: { $in: followingIds },
        followingId: currentUserId
      })
      const friendIds = mutualFollows.map(f => f.followerId)
      
      if (friendIds.length === 0) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      }
      
      query.authorId = { $in: friendIds }
    }
    
    // If type is 'liked', filter by liked articles
    // Use likedUserId if provided, otherwise use currentUserId
    const targetUserId = likedUserId || currentUserId
    if (type === 'liked' && targetUserId) {
      // Get total count of likes first
      const totalLikes = await Like.countDocuments({ userId: targetUserId })
      
      if (totalLikes === 0) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      }
      
      // Get list of article IDs that user has liked (with pagination)
      const likes = await Like.find({ userId: targetUserId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('articleId')
        .lean()
      
      const likedArticleIds = likes.map(like => like.articleId.toString())
      
      if (likedArticleIds.length === 0) {
        return {
          items: [],
          total: totalLikes,
          page,
          limit,
          totalPages: Math.ceil(totalLikes / limit)
        }
      }
      
      query._id = { $in: likedArticleIds }
      
      // Get articles and maintain order
      const articlesResult = await Article.find(query)
        .populate('authorId', 'username avatar bio')
        .lean()
      
      // Sort articles to match the order of likedArticleIds
      const articlesMap = new Map(articlesResult.map((article: any) => [article._id.toString(), article]))
      const articles = likedArticleIds
        .map(id => articlesMap.get(id))
        .filter(Boolean) as any[]
      
      // Populate follow status and like status if user is logged in
      if (currentUserId) {
        await Promise.all(articles.map(async (article: any) => {
          // All articles in liked feed are liked by definition
          article.isLiked = true
          
          // Set follow status
          if (article.authorId._id.toString() === currentUserId) {
            article.authorId.followStatus = 'self'
          } else {
            article.authorId.followStatus = await socialService.getFollowStatus(
              currentUserId, 
              article.authorId._id.toString()
            )
          }
        }))
      } else {
        articles.forEach((article: any) => {
          article.authorId.followStatus = 'none'
          article.isLiked = false
        })
      }
      
      return {
        items: articles,
        total: totalLikes,
        page,
        limit,
        totalPages: Math.ceil(totalLikes / limit)
      }
    }
    
    const articles = await Article.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'username avatar bio')
      .lean() // Use lean() to return plain JS objects so we can add properties
    
    const total = await Article.countDocuments(query)
    
    // Populate follow status and like status if user is logged in
    if (currentUserId) {
      const articleIds = articles.map((article: any) => article._id.toString())
      const likedMap = await likeService.checkLikedStatus(currentUserId, articleIds)
      
      await Promise.all(articles.map(async (article: any) => {
        // Set like status
        article.isLiked = likedMap[article._id.toString()] || false
        
        // Set follow status
        if (article.authorId._id.toString() === currentUserId) {
          article.authorId.followStatus = 'self'
        } else {
          article.authorId.followStatus = await socialService.getFollowStatus(
            currentUserId, 
            article.authorId._id.toString()
          )
        }
      }))
    } else {
      articles.forEach((article: any) => {
        article.authorId.followStatus = 'none'
        article.isLiked = false
      })
    }
    
    return {
      items: articles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }
}

export const articleService = new ArticleService()
