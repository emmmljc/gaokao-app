import { request } from './client'
import type { School, SchoolDetailResponse } from '@/types'

export const schoolApi = {
  list: (params: {
    keyword?: string;
    province?: string;
    city?: string;
    schoolType?: string;
    tags?: string;
  }) => request<School[]>('get', '/schools', undefined, params),

  detail: (schoolId: string) =>
    request<SchoolDetailResponse>('get', `/schools/${schoolId}`),
}
