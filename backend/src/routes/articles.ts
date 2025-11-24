import { Router } from 'express'
import { articleService } from '@/services/ArticleService'
import { verifyAuth, optionalAuth, AuthRequest } from '@/middleware/auth'

const router = Router()

router.post('/', verifyAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const result = await articleService.create(userId, req.body)
  res.status(201).json({
    code: 0,
    message: 'Article created',
    data: result,
  })
})

router.put('/:id', verifyAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const result = await articleService.update(req.params.id, userId, req.body)
  res.json({
    code: 0,
    message: 'Article updated',
    data: result,
  })
})

router.delete('/:id', verifyAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId!
  await articleService.delete(req.params.id, userId)
  res.json({
    code: 0,
    message: 'Article deleted',
  })
})

router.get('/:id', optionalAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId
  const result = await articleService.getDetail(req.params.id, userId)
  res.json({
    code: 0,
    message: 'Success',
    data: result,
  })
})

export default router

