import { Router } from 'express'
import { authService } from '@/services/AuthService'
import { verifyAuth, optionalAuth, AuthRequest } from '@/middleware/auth'

const router = Router()

router.post('/register', async (req, res) => {
  const result = await authService.register(req.body)
  res.status(201).json({
    code: 0,
    message: 'Registration successful',
    data: result,
  })
})

router.post('/login', async (req, res) => {
  const result = await authService.login(req.body)
  res.json({
    code: 0,
    message: 'Login successful',
    data: result,
  })
})

router.post('/logout', verifyAuth, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  const userId = (req as AuthRequest).userId

  if (token && userId) {
    await authService.logout(token, userId)
  }
  res.json({
    code: 0,
    message: 'Logout successful',
  })
})

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  const result = await authService.refreshToken(refreshToken)
  res.json({
    code: 0,
    message: 'Token refreshed',
    data: result,
  })
})

router.get('/users/:id', optionalAuth, async (req, res) => {
  try {
    const currentUserId = (req as AuthRequest).userId
    const result = await authService.getUserById(req.params.id, currentUserId)
    res.json({
      code: 0,
      message: 'User retrieved successfully',
      data: result,
    })
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      code: error.code || 5000,
      message: error.message || 'Failed to retrieve user',
    })
  }
})

router.put('/profile', verifyAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId!
  const result = await authService.updateProfile(userId, req.body)
  res.json({
    code: 0,
    message: 'Profile updated successfully',
    data: result,
  })
})

export default router

