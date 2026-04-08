import { request } from './client'
import type { Major, MajorDetailResponse } from '@/types'

export const majorApi = {
  list: (params: {
    keyword?: string;
    category?: string;
    subCategory?: string;
  }) => request<Major[]>('get', '/majors', undefined, params),

  detail: (majorId: number) =>
    request<MajorDetailResponse>('get', `/majors/${majorId}`),
}
