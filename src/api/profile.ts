import { request } from './client'
import type { UserProfile } from '@/types'

export const profileApi = {
  get: () => request<UserProfile>('get', '/profile'),

  update: (data: Partial<UserProfile>) =>
    request<UserProfile>('put', '/profile', data),
}
