import Taro from '@tarojs/taro'
import axios from 'axios'
import type { Result } from '@/types'

const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || '/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = Taro.getStorageSync('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Taro.removeStorageSync('token')
      Taro.removeStorageSync('user')
      Taro.redirectTo({ url: '/pages/login/index' })
    }
    return Promise.reject(error)
  },
)

export async function request<T>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  data?: unknown,
  params?: Record<string, unknown>,
): Promise<T> {
  const res = await apiClient.request<Result<T>>({
    method,
    url,
    data,
    params,
  })
  const body = res.data
  if (body.code !== 200) {
    throw new Error(body.message || '请求失败')
  }
  return body.data
}

export default apiClient
