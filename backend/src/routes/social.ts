import { Router } from 'express'
import { socialService } from '@/services/SocialService'
import { verifyAuth, AuthRequest } from '@/middleware/auth'

const router = Router()

router.use(verifyAuth)

router.post('/:id/follow', async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const result = await socialService.follow(userId, req.params.id)
  res.json({
    code: 0,
    message: 'Followed successfully',
    data: result,
  })
})

router.post('/:id/unfollow', async (req, res) => {
  const userId = (req as AuthRequest).userId!
  await socialService.unfollow(userId, req.params.id)
  res.json({
    code: 0,
    message: 'Unfollowed successfully',
  })
})

router.get('/:id/status', async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const targetUserId = req.params.id
  const status = await socialService.getFollowStatus(userId, targetUserId)
  res.json({
    code: 0,
    message: 'Success',
    data: { status },
  })
})

router.get('/following', async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const targetUserId = req.query.userId as string | undefined
  const result = await socialService.getFollowing(targetUserId || userId)
  res.json({
    code: 0,
    message: 'Success',
    data: result,
  })
})

router.get('/followers', async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const targetUserId = req.query.userId as string | undefined
  const result = await socialService.getFollowers(targetUserId || userId)
  res.json({
    code: 0,
    message: 'Success',
    data: result,
  })
})

export default router
