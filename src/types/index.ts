// ==================== API 通用响应 ====================
export interface Result<T> {
  code: number;
  message: string;
  data: T;
}

// ==================== Auth ====================
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  phone?: string;
  email?: string;
}

export interface WechatLoginRequest {
  code: string;
  nickName: string;
  avatarUrl: string;
}

export interface AuthResponse {
  userId: number;
  username: string;
  role: string;
  token: string;
}

// ==================== School ====================
export interface School {
  id: number;
  schoolId: string;
  name: string;
  province: string;
  city: string;
  schoolType: string;
  tags: string;
  is985: number;
  is211: number;
  isDoubleFirst: number;
  logoUrl: string;
}

export interface SchoolScore {
  id: number;
  schoolId: string;
  schoolName: string;
  province: string;
  year: number;
  batch: string;
  subjectType: string;
  specialGroup: string;
  groupName: string;
  groupInfo: string;
  minScore: number;
  minRank: number;
  avgScore: number;
  provinceLine: number;
}

export interface MajorGroup {
  id: number;
  schoolDbId: number;
  province: string;
  year: number;
  subjectType: string;
  specialGroup: string;
  groupName: string;
  subjectRequirementsRaw: string;
  firstSubject: string;
  reselectSubjects: string;
  reselectRequiredCount: number;
  reselectAllowedMasks: string;
  requiredSubjects: string;
}

export interface SchoolDetailResponse {
  school: School;
  scoreTrends: SchoolScore[];
  majorGroups: { group: MajorGroup; majors: string[] }[];
}

// ==================== Major ====================
export interface Major {
  id: number;
  majorName: string;
  category: string;
  subcategory: string;
  degree: string;
  duration: string;
}

export interface MajorScore {
  id: number;
  schoolId: string;
  schoolName: string;
  majorName: string;
  province: string;
  year: number;
  batch: string;
  subjectType: string;
  specialGroup: string;
  groupName: string;
  groupInfo: string;
  minScore: number;
  minRank: number;
  avgScore: number;
  tuition: number;
  duration: string;
}

export interface GroupMajor {
  id: number;
  majorGroupId: number;
  majorId: number;
}

export interface MajorDetailResponse {
  major: Major;
  scoreTrends: MajorScore[];
  offeredBySchools: School[];
  groupRecords: GroupMajor[];
}

// ==================== Score ====================
export interface ScoreRanking {
  id: number;
  year: number;
  province: string;
  subjectType: string;
  score: number;
  count: number;
  cumulativeCount: number;
}

export interface ScoreToRankResponse {
  year: number;
  subjectType: string;
  score: number;
  matchedScore: number;
  rank: number;
  sameCount: number;
}

// ==================== Recommend ====================
export interface RecommendItem {
  schoolId: string;
  schoolName: string;
  schoolLevel: string;
  city: string;
  groupId: number;
  groupCode: string;
  subjectType: string;
  requiredSubjects: string;
  minRank: number;
  minScore: number;
  planCount: number;
  totalScore: number;
  matchScore: number;
  stabilityScore: number;
  preferenceScore: number;
  admissionProbability: number;
  majorNames: string[];
}

export interface RecommendResponse {
  reach: RecommendItem[];
  steady: RecommendItem[];
  safe: RecommendItem[];
}

// ==================== Major Comparison ====================
export interface MajorFamily {
  familyName: string;
  keywords: string[];
  majors: string[];
}

export interface MajorComparisonYearlyRecord {
  year: number;
  minScore: number;
  minRank: number;
  avgScore: number | null;
  maxScore: number | null;
  planCount: number | null;
}

export interface MajorComparisonSchoolRecord {
  schoolId: string;
  schoolName: string;
  schoolLevel: string;
  city: string;
  province: string;
  subjectType: string;
  groupId: number;
  groupName: string;
  groupInfo: string;
  requiredSubjects: string;
  seriesKey: string;
  matchedMajorName: string;
  majorFamilyName: string;
  availableYearCount: number;
  latestMinRank: number;
  latestMinScore: number;
  rankDistanceToUser: number | null;
  suitabilityBand: string | null;
  averageMinRank: number;
  averagePlanCount: number | null;
  rankVolatility: number;
  planVolatility: number | null;
  stabilityScore: number;
  riskScore: number;
  cvarRiskScore: number;
  trendLabel: string;
  yearly: MajorComparisonYearlyRecord[];
}

export interface MajorComparisonSummary {
  schoolCount: number;
  comparedYearCount: number;
  mostStableSchool: string;
  highestVolatilitySchool: string;
  lowestRiskSchool: string;
  aggressiveCount: number;
  balancedCount: number;
  conservativeCount: number;
  insights: string[];
}

export interface MajorComparisonResponse {
  province: string;
  normalizedMajorName: string;
  majorFamilyName: string;
  subjectType: string;
  yearStart: number;
  yearEnd: number;
  rankPosition: number | null;
  rankRangeLower: number | null;
  rankRangeUpper: number | null;
  expandRelatedMajors: boolean;
  schoolLevelFilter: string | null;
  cityFilter: string | null;
  excludeLowerTierSchools: boolean;
  recordCount: number;
  expandedMajorNames: string[];
  summary: MajorComparisonSummary;
  records: MajorComparisonSchoolRecord[];
}

export interface MajorCompareParams {
  majorId: number;
  subjectType: string;
  yearStart?: number;
  yearEnd?: number;
  rankPosition?: number;
  expandRelatedMajors?: boolean;
  schoolLevel?: string;
  city?: string;
  excludeLowerTierSchools?: boolean;
  limit?: number;
}

// ==================== Portfolio Recommend ====================
export interface PortfolioSummary {
  totalItems: number;
  reachCount: number;
  steadyCount: number;
  safeCount: number;
  averageAdmissionProbability: number;
  averageRiskScore: number;
  averagePreferenceScore: number;
  averageTotalScore: number;
  opportunityScore: number;
  downsideRiskScore: number;
  cvarRiskScore: number;
  cityCoverageCount: number;
  majorCoverageCount: number;
  schoolLevelCoverageCount: number;
  riskConstraintSatisfied: boolean;
  styleFitScore: number;
  paretoOptimal: boolean;
  dominanceCount: number;
}

export interface RecommendPortfolio {
  style: string;
  title: string;
  summary: PortfolioSummary;
  explanations: string[];
  items: RecommendItem[];
}

export interface PortfolioRecommendResponse {
  portfolios: RecommendPortfolio[];
  paretoFrontSize: number;
  generatedCandidatePortfolioCount: number;
  searchStrategy: string;
  beamCandidateCount: number;
  nsgaCandidateCount: number;
}

// ==================== Profile ====================
export interface UserProfile {
  id: number;
  userId: number;
  province: string;
  examYear: number;
  subjectType: string;
  totalScore: number;
  rankPosition: number;
  chineseScore: number;
  mathScore: number;
  englishScore: number;
  subject1: string;
  subject1Score: number;
  subject2: string;
  subject2Score: number;
  subject3: string;
  subject3Score: number;
  preferredCities: string[];
  preferredMajors: string[];
  schoolLevelRange: string;
  employmentIntention: string;
}
