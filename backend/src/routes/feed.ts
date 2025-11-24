import { Router } from 'express'
import { articleService } from '@/services/ArticleService'
import { optionalAuth, AuthRequest } from '@/middleware/auth'

const router = Router()

router.get('/', optionalAuth, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 10
  const type = (req.query.type as 'recommended' | 'following' | 'friends' | 'liked') || 'recommended'
  const authorId = req.query.authorId as string | undefined
  const likedUserId = req.query.likedUserId as string | undefined
  const userId = (req as AuthRequest).userId
  
  // For 'following', 'friends', or 'liked' type, require authentication (unless likedUserId is provided)
  if ((type === 'following' || type === 'friends' || (type === 'liked' && !likedUserId)) && !userId) {
    return res.status(401).json({
      code: 4003,
      message: 'Authentication required for following/friends feed',
    })
  }
  
  const result = await articleService.getFeed(page, limit, userId, type, authorId, likedUserId)
  res.json({
    code: 0,
    message: 'Success',
    data: result,
  })
})

export default router

