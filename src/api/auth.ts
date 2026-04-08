import { request } from './client'
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
} from '@/types'

export const authApi = {
  login: (data: LoginRequest) =>
    request<AuthResponse>('post', '/auth/login', data),

  register: (data: RegisterRequest) =>
    request<AuthResponse>('post', '/auth/register', data),

  me: () => request<AuthResponse>('get', '/auth/me'),
}
