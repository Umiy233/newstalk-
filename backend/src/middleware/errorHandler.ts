/**
 * 错误处理中间件
 * SPEC: 错误处理规范
 */

import { Request, Response, NextFunction } from 'express'
import type { ApiResponse } from '@/types/models'

export class ApiError extends Error {
  constructor(
    public code: number,
    public message: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * 全局错误处理中间件
 */
export function errorHandler(
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[Error]', error)

  const isApiError = error instanceof ApiError

  const response: ApiResponse = {
    code: isApiError ? error.code : 5001,
    message: isApiError ? error.message : 'Internal server error',
    timestamp: new Date().toISOString(),
  }

  const statusCode = isApiError ? error.statusCode : 500

  res.status(statusCode).json(response)
}

/**
 * 404 处理
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    code: 4005,
    message: 'Not Found',
    timestamp: new Date().toISOString(),
  })
}

/**
 * 异步错误包装器
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch(next)
  }
}

