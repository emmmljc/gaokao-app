import { request } from './client'
import type { MajorComparisonResponse, MajorCompareParams } from '@/types'

export const majorCompareApi = {
  compare: (params: MajorCompareParams) =>
    request<MajorComparisonResponse>('get', '/major-compare', undefined, params as unknown as Record<string, unknown>),
}
