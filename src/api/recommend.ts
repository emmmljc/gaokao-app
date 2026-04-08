import { request } from './client'
import type { RecommendResponse, PortfolioRecommendResponse } from '@/types'

export const recommendApi = {
  getVolunteers: () =>
    request<RecommendResponse>('get', '/recommend/volunteers'),

  getPortfolios: () =>
    request<PortfolioRecommendResponse>('get', '/recommend/portfolios'),
}
