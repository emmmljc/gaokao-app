import { request } from './client'
import type {
  SchoolScore,
  MajorScore,
  ScoreRanking,
  ScoreToRankResponse,
} from '@/types'

export const scoreApi = {
  schoolTrend: (params: { schoolId: string; subjectType?: string }) =>
    request<SchoolScore[]>('get', '/scores/school-trend', undefined, params),

  majorTrend: (params: { majorId: number; subjectType?: string }) =>
    request<MajorScore[]>('get', '/scores/major-trend', undefined, params),

  rankDistribution: (params: { year: number; subjectType?: string }) =>
    request<ScoreRanking[]>('get', '/scores/rank-distribution', undefined, params),

  scoreToRank: (params: {
    year: number;
    subjectType?: string;
    score: number;
  }) =>
    request<ScoreToRankResponse>('get', '/scores/score-to-rank', undefined, params),
}
