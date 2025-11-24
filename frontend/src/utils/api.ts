/**
 * HTTP 客户端 - Axios 封装
 * SPEC: SPEC-FRONTEND-HTTP-CLIENT-001
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth'
import type { ApiResponse } from '@/types/models'

const API_BASE_URL = '/api'
const REQUEST_TIMEOUT = 10000 // 10 秒
const MAX_RETRIES = 3

class ApiClient {
  private instance: AxiosInstance
  private retryCount: Map<string, number> = new Map()

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  /**
   * 设置拦截器
   */
  private setupInterceptors() {
    // 请求拦截器 - 附加认证 token
    this.instance.interceptors.request.use(
      (config) => {
        const authStore = useAuthStore()
        if (authStore.token) {
          config.headers.Authorization = `Bearer ${authStore.token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // 响应拦截器 - 处理错误和 token 刷新
    this.instance.interceptors.response.use(
      (response) => {
        return response.data
      },
      async (error: AxiosError<ApiResponse>) => {
        const authStore = useAuthStore()
        const config = error.config as AxiosRequestConfig & { _retry?: number }

        // Token 过期处理
        if (error.response?.status === 401 && error.response?.data?.code === 4003) {
          if (!config._retry) {
            config._retry = 0
          }

          if (config._retry < 1) {
            config._retry++
            try {
              await authStore.refreshToken()
              // 使用新 token 重试请求
              if (authStore.token) {
                config.headers!.Authorization = `Bearer ${authStore.token}`
              }
              return this.instance(config)
            } catch (refreshError) {
              authStore.logout()
              window.location.href = '/login'
              return Promise.reject(refreshError)
            }
          }
        }

        // 网络错误重试机制
        if (!error.response && config.url) {
          const retryKey = config.url
          const currentRetry = this.retryCount.get(retryKey) || 0

          if (currentRetry < MAX_RETRIES) {
            this.retryCount.set(retryKey, currentRetry + 1)
            // 指数退避：第 1 次等 1s, 第 2 次等 2s, 第 3 次等 4s
            await this.delay(Math.pow(2, currentRetry) * 1000)
            return this.instance(config)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * 延迟函数（用于重试延迟）
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * GET 请求
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.instance.get(url, config)
  }

  /**
   * POST 请求
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.instance.post(url, data, config)
  }

  /**
   * PUT 请求
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.instance.put(url, data, config)
  }

  /**
   * DELETE 请求
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.instance.delete(url, config)
  }

  /**
   * 文件上传
   */
  async upload<T>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    return this.instance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100)
          onProgress(progress)
        }
      },
    })
  }
}

export const apiClient = new ApiClient()

