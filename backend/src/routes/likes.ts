import { Router } from 'express'
import { likeService } from '@/services/LikeService'
import { verifyAuth, AuthRequest } from '@/middleware/auth'

const router = Router()

// All like routes require authentication
router.use(verifyAuth)

// Like an article
router.post('/:articleId', async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const articleId = req.params.articleId
  
  try {
    const result = await likeService.like(userId, articleId)
    res.json({
      code: 0,
      message: 'Liked successfully',
      data: result,
    })
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({
        code: error.code || 4000,
        message: error.message,
      })
    } else {
      res.status(500).json({
        code: 5000,
        message: 'Internal server error',
      })
    }
  }
})

// Unlike an article
router.delete('/:articleId', async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const articleId = req.params.articleId
  
  try {
    const result = await likeService.unlike(userId, articleId)
    res.json({
      code: 0,
      message: 'Unliked successfully',
      data: result,
    })
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({
        code: error.code || 4000,
        message: error.message,
      })
    } else {
      res.status(500).json({
        code: 5000,
        message: 'Internal server error',
      })
    }
  }
})

// Check if article is liked
router.get('/:articleId/status', async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const articleId = req.params.articleId
  
  try {
    const isLiked = await likeService.isLiked(userId, articleId)
    res.json({
      code: 0,
      message: 'Success',
      data: { isLiked },
    })
  } catch (error: any) {
    res.status(500).json({
      code: 5000,
      message: 'Internal server error',
    })
  }
})

export default router

