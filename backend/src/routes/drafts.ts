import { Router } from 'express'
import { draftService } from '@/services/DraftService'
import { verifyAuth, AuthRequest } from '@/middleware/auth'

const router = Router()

// All draft routes require authentication
router.use(verifyAuth)

router.post('/', async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const result = await draftService.save(userId, req.body)
  res.json({
    code: 0,
    message: 'Draft saved',
    data: result,
  })
})

router.get('/current', async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const result = await draftService.getCurrent(userId)
  res.json({
    code: 0,
    message: 'Success',
    data: result,
  })
})

router.delete('/:id', async (req, res) => {
  const userId = (req as AuthRequest).userId!
  await draftService.delete(req.params.id, userId)
  res.json({
    code: 0,
    message: 'Draft deleted',
  })
})

router.post('/:id/publish', async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const result = await draftService.publish(req.params.id, userId)
  res.json({
    code: 0,
    message: 'Article published',
    data: result,
  })
})

export default router

