import { Router } from 'express'
import { commentService } from '@/services/CommentService'
import { verifyAuth, optionalAuth, AuthRequest } from '@/middleware/auth'

const router = Router()

// Create comment (requires auth)
router.post('/', verifyAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const { articleId, content, parentId } = req.body

  if (!articleId || !content) {
    return res.status(400).json({
      code: 4006,
      message: 'Article ID and content are required',
    })
  }

  try {
    const result = await commentService.create(articleId, userId, content, parentId)
    res.json({
      code: 0,
      message: 'Comment created',
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

// Get comments by article (optional auth)
router.get('/article/:articleId', optionalAuth, async (req, res) => {
  try {
    const result = await commentService.getByArticle(req.params.articleId)
    res.json({
      code: 0,
      message: 'Success',
      data: result,
    })
  } catch (error: any) {
    res.status(500).json({
      code: 5000,
      message: 'Internal server error',
    })
  }
})

// Delete comment (requires auth)
router.delete('/:id', verifyAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId!
  
  try {
    await commentService.delete(req.params.id, userId)
    res.json({
      code: 0,
      message: 'Comment deleted',
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

export default router

